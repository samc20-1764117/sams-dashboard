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
  if (KV) {
    const cached = await KV.get('yt-stats', 'json');
    if (cached) return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    // Channel stats
    const chanRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${CHANNEL_ID}&key=${API_KEY}`);
    const chanData = await chanRes.json();
    const chan = chanData.items?.[0];
    if (!chan) return new Response(JSON.stringify({ error: 'YouTube API unavailable', debug: chanData }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const channelStats = {
      name: chan.snippet.title,
      subscribers: Number(chan.statistics.subscriberCount),
      totalViews: Number(chan.statistics.viewCount),
      totalVideos: Number(chan.statistics.videoCount),
    };

    // Fetch ALL videos with pagination
    let allVideoIds = [];
    let nextPageToken = '';
    while (true) {
      const pageParam = nextPageToken ? `&pageToken=${nextPageToken}` : '';
      const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id&channelId=${CHANNEL_ID}&order=date&maxResults=50&type=video&key=${API_KEY}${pageParam}`);
      const searchData = await searchRes.json();
      const ids = (searchData.items || []).map(i => i.id.videoId).filter(Boolean);
      allVideoIds = allVideoIds.concat(ids);
      if (!searchData.nextPageToken) break;
      nextPageToken = searchData.nextPageToken;
    }

    let videos = [];
    // Fetch details in batches of 50
    for (let i = 0; i < allVideoIds.length; i += 50) {
      const batch = allVideoIds.slice(i, i + 50).join(',');
      const vidRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch}&key=${API_KEY}`);
      const vidData = await vidRes.json();
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

    // Cache for 4 hours
    if (KV) await KV.put('yt-stats', JSON.stringify(result), { expirationTtl: 14400 });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
