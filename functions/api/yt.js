// RSS fallback — works even when API quota is exceeded
async function _rssFallback(channelId) {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  if (!res.ok) return null;
  const xml = await res.text();
  // Parse entries from RSS
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
  if (!entries.length) return null;
  const videos = entries.map(m => {
    const block = m[1];
    const get = tag => { const r = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`)); return r ? r[1] : ''; };
    const getAttr = (tag, attr) => { const r = block.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`)); return r ? r[1] : ''; };
    return {
      id: get('yt:videoId'),
      title: get('title'),
      publishedAt: get('published'),
      thumbnail: getAttr('media:thumbnail', 'url') || `https://i.ytimg.com/vi/${get('yt:videoId')}/mqdefault.jpg`,
      views: Number(getAttr('media:community media:statistics', 'views') || 0),
      likes: 0, comments: 0, duration: '',
    };
  }).filter(v => v.id);
  // RSS only has ~15 most recent videos, channel stats are approximate
  return {
    channelStats: { name: '', subscribers: 0, totalViews: 0, totalVideos: videos.length },
    videos,
    fetchedAt: new Date().toISOString(),
    partial: true,
  };
}

export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': context.request.headers.get('Origin') || 'https://dev.sams-dashboard.pages.dev',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-YT-Auth',
  };
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // POST: seed KV cache with provided data
  if (context.request.method === 'POST') {
    const KV = context.env.YT_CACHE;
    if (!KV) return new Response('no KV', { status: 500, headers: corsHeaders });
    const body = await context.request.json();
    if (body && body.channelStats) {
      await KV.put('yt-fresh', JSON.stringify(body), { expirationTtl: 43200 });
      await KV.put('yt-good', JSON.stringify(body));
      await KV.delete('yt-cooldown');
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response('invalid', { status: 400, headers: corsHeaders });
  }

  const API_KEY = context.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = context.env.YOUTUBE_CHANNEL_ID;
  if (!API_KEY || !CHANNEL_ID) {
    return new Response(JSON.stringify({ error: 'Missing config' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const KV = context.env.YT_CACHE;
  const url = new URL(context.request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';

  // Check short-lived "fresh" cache first (skip on force refresh)
  if (KV && !forceRefresh) {
    const fresh = await KV.get('yt-fresh', 'json');
    if (fresh) {
      return new Response(JSON.stringify(fresh), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // Check if we recently failed (don't burn quota retrying)
  if (KV && !forceRefresh) {
    const cooldown = await KV.get('yt-cooldown');
    if (cooldown) {
      // Serve last good data during cooldown
      const lastGood = await KV.get('yt-good', 'json');
      if (lastGood) return new Response(JSON.stringify(lastGood), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: 'quota exceeded, no cached data' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  try {
    // Channel stats + uploads playlist ID (1 quota unit)
    const chanRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`);
    const chanData = await chanRes.json();
    const chan = chanData.items?.[0];
    if (!chan) {
      const isQuota = chanData.error?.errors?.[0]?.reason === 'quotaExceeded';
      // Set cooldown: 1hr for quota, 5min for other errors
      if (KV) await KV.put('yt-cooldown', '1', { expirationTtl: isQuota ? 3600 : 300 });
      // Serve last good data as fallback
      if (KV) {
        const lastGood = await KV.get('yt-good', 'json') || await KV.get('yt-stats', 'json');
        if (lastGood && !lastGood.error) return new Response(JSON.stringify(lastGood), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // RSS fallback — no quota needed
      try {
        const rssData = await _rssFallback(CHANNEL_ID);
        if (rssData && KV) {
          await KV.put('yt-fresh', JSON.stringify(rssData), { expirationTtl: 43200 });
          await KV.put('yt-good', JSON.stringify(rssData));
        }
        if (rssData) return new Response(JSON.stringify(rssData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e) {}
      const detail = chanData.error ? chanData.error.message || JSON.stringify(chanData.error) : 'no items';
      return new Response(JSON.stringify({ error: detail }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const channelStats = {
      name: chan.snippet.title,
      subscribers: Number(chan.statistics.subscriberCount),
      totalViews: Number(chan.statistics.viewCount),
      totalVideos: Number(chan.statistics.videoCount),
    };

    const uploadsPlaylistId = chan.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      if (KV) { const lastGood = await KV.get('yt-good', 'json'); if (lastGood) return new Response(JSON.stringify(lastGood), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
      return new Response(JSON.stringify({ error: 'No uploads playlist' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch ALL video IDs via playlistItems (1 quota unit per call)
    let allVideoIds = [];
    let nextPageToken = '';
    while (true) {
      const pageParam = nextPageToken ? `&pageToken=${nextPageToken}` : '';
      const plRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${API_KEY}${pageParam}`);
      const plData = await plRes.json();
      if (plData.error) break;
      const ids = (plData.items || []).map(i => i.contentDetails.videoId).filter(Boolean);
      allVideoIds = allVideoIds.concat(ids);
      if (!plData.nextPageToken) break;
      nextPageToken = plData.nextPageToken;
    }

    let videos = [];
    // Fetch details in batches of 50 (1 quota unit per call)
    for (let i = 0; i < allVideoIds.length; i += 50) {
      const batch = allVideoIds.slice(i, i + 50).join(',');
      const vidRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch}&key=${API_KEY}`);
      const vidData = await vidRes.json();
      if (vidData.error) break;
      const mapped = (vidData.items || []).map(v => ({
        id: v.id,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        thumbnail: v.snippet.thumbnails?.medium?.url,
        views: Number(v.statistics.viewCount || 0),
        likes: Number(v.statistics.likeCount || 0),
        comments: Number(v.statistics.commentCount || 0),
        duration: v.contentDetails.duration,
      }));
      videos = videos.concat(mapped);
    }

    // Fetch all comment threads to count unreplied (1 unit per call, 100 per page)
    let unrepliedCount = 0;
    let commentPageToken = '';
    try {
      while (true) {
        const ctParam = commentPageToken ? `&pageToken=${commentPageToken}` : '';
        const ctRes = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&allThreadsRelatedToChannelId=${CHANNEL_ID}&maxResults=100&key=${API_KEY}${ctParam}`);
        const ctData = await ctRes.json();
        if (ctData.error) break;
        (ctData.items || []).forEach(t => {
          if (t.snippet.totalReplyCount === 0) unrepliedCount++;
        });
        if (!ctData.nextPageToken) break;
        commentPageToken = ctData.nextPageToken;
      }
    } catch (e) { /* silently skip if comment fetch fails */ }

    const result = { channelStats, videos, unrepliedCount, fetchedAt: new Date().toISOString() };

    if (KV) {
      // Fresh cache: 12 hours (controls when we re-fetch)
      await KV.put('yt-fresh', JSON.stringify(result), { expirationTtl: 43200 });
      // Good cache: 30 days (fallback for when API is down)
      await KV.put('yt-good', JSON.stringify(result));
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    if (KV) {
      await KV.put('yt-cooldown', '1', { expirationTtl: 300 });
      const lastGood = await KV.get('yt-good', 'json');
      if (lastGood) return new Response(JSON.stringify(lastGood), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
