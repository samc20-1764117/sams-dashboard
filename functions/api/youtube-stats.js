export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': context.request.headers.get('Origin') || 'https://dev.sams-dashboard.pages.dev',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-YT-Auth',
  };
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify caller is logged into the dashboard via Supabase JWT
  const jwt = context.request.headers.get('X-YT-Auth');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const userRes = await fetch('https://gtirvyrqfuuuxkkqaeap.supabase.co/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + jwt, 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aXJ2eXJxZnV1dXhra3FhZWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODY3NjAsImV4cCI6MjA4ODY2Mjc2MH0.6rtA0WeUUAcuV_sNVrxAbaaviPxPwNakh_bk7uylAOo' }
  });
  if (!userRes.ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
    if (!chan) return new Response(JSON.stringify({ error: 'Channel not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const channelStats = {
      name: chan.snippet.title,
      subscribers: Number(chan.statistics.subscriberCount),
      totalViews: Number(chan.statistics.viewCount),
      totalVideos: Number(chan.statistics.videoCount),
    };

    // Last 50 videos
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id&channelId=${CHANNEL_ID}&order=date&maxResults=50&type=video&key=${API_KEY}`);
    const searchData = await searchRes.json();
    const videoIds = (searchData.items || []).map(i => i.id.videoId).join(',');

    let videos = [];
    if (videoIds) {
      const vidRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${API_KEY}`);
      const vidData = await vidRes.json();
      videos = (vidData.items || []).map(v => ({
        id: v.id,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        thumbnail: v.snippet.thumbnails?.medium?.url,
        views: Number(v.statistics.viewCount || 0),
        likes: Number(v.statistics.likeCount || 0),
        comments: Number(v.statistics.commentCount || 0),
        duration: v.contentDetails.duration,
      }));
    }

    const result = { channelStats, videos, fetchedAt: new Date().toISOString() };

    // Cache for 1 hour
    if (KV) await KV.put('yt-stats', JSON.stringify(result), { expirationTtl: 3600 });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
