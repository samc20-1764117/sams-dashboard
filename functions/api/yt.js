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

  // Check KV cache
  const KV = context.env.YT_CACHE;
  const url = new URL(context.request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';
  if (KV && !forceRefresh) {
    const cached = await KV.get('yt-stats', 'json');
    if (cached) {
      if (cached.error) return new Response(JSON.stringify({ error: cached.error }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  try {
    // Channel stats (1 quota unit)
    const chanRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`);
    const chanData = await chanRes.json();
    const chan = chanData.items?.[0];
    if (!chan) {
      const detail = chanData.error ? chanData.error.message || JSON.stringify(chanData.error) : 'no items';
      // Only cache quota errors for 1hr, other errors for 5min
      const ttl = (chanData.error?.errors?.[0]?.reason === 'quotaExceeded') ? 3600 : 300;
      if (KV) await KV.put('yt-stats', JSON.stringify({ error: detail, fetchedAt: new Date().toISOString() }), { expirationTtl: ttl });
      return new Response(JSON.stringify({ error: detail }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const channelStats = {
      name: chan.snippet.title,
      subscribers: Number(chan.statistics.subscriberCount),
      totalViews: Number(chan.statistics.viewCount),
      totalVideos: Number(chan.statistics.videoCount),
    };

    // Get uploads playlist ID from channel
    const uploadsPlaylistId = chan.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      if (KV) await KV.put('yt-stats', JSON.stringify({ error: 'no_uploads_playlist', fetchedAt: new Date().toISOString() }), { expirationTtl: 3600 });
      return new Response(JSON.stringify({ error: 'No uploads playlist' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch ALL video IDs via playlistItems (1 quota unit per call instead of 100)
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

    // Cache for 12 hours
    if (KV) await KV.put('yt-stats', JSON.stringify(result), { expirationTtl: 43200 });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    // Cache errors for 1 hour to avoid burning quota
    if (KV) await KV.put('yt-stats', JSON.stringify({ error: e.message, fetchedAt: new Date().toISOString() }), { expirationTtl: 3600 });
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
