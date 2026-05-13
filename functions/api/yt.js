export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': context.request.headers.get('Origin') || 'https://dev.sams-dashboard.pages.dev',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-YT-Auth',
  };
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const result = { channelStats, videos, fetchedAt: new Date().toISOString() };

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
