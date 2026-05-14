// YouTube Analytics API — fetch actual revenue and metrics by month
// Requires OAuth tokens from yt-auth.js flow
export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': context.request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const KV = context.env.YT_CACHE;
  if (!KV) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check for cached analytics data (refresh once per day)
  const url = new URL(context.request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';
  if (!forceRefresh) {
    const cached = await KV.get('yt-analytics-data', 'json');
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Get access token (refresh if expired)
  let accessToken = await KV.get('yt-oauth-access');
  if (!accessToken) {
    const refreshToken = await KV.get('yt-oauth-refresh');
    if (!refreshToken) {
      return new Response(JSON.stringify({ error: 'not_authorized', authUrl: '/api/yt-auth?action=start' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Refresh the access token
    const CLIENT_ID = context.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = context.env.GOOGLE_CLIENT_SECRET;
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: 'OAuth not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
      }).toString(),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      // If refresh token is revoked, clear it
      if (tokenData.error === 'invalid_grant') {
        await KV.delete('yt-oauth-refresh');
      }
      return new Response(JSON.stringify({ error: 'token_refresh_failed', detail: tokenData.error, authUrl: '/api/yt-auth?action=start' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    accessToken = tokenData.access_token;
    await KV.put('yt-oauth-access', accessToken, { expirationTtl: tokenData.expires_in || 3600 });
  }

  try {
    // Determine date range — from 2 years ago to yesterday
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 2);
    const fmt = d => d.toISOString().slice(0, 10);

    // Query 1: Monthly channel metrics (1 API call)
    // metrics: views, estimatedRevenue, estimatedAdRevenue, likes, comments, subscribersGained, averageViewDuration
    const metricsQ = 'views,estimatedRevenue,likes,comments,subscribersGained,averageViewDuration';
    const monthlyUrl = `https://youtubeanalytics.googleapis.com/v2/reports?` + new URLSearchParams({
      ids: 'channel==MINE',
      startDate: fmt(startDate),
      endDate: fmt(yesterday),
      metrics: metricsQ,
      dimensions: 'month',
      sort: 'month',
    }).toString();

    const monthlyRes = await fetch(monthlyUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const monthlyData = await monthlyRes.json();
    if (monthlyData.error) {
      return new Response(JSON.stringify({ error: 'analytics_api_error', detail: monthlyData.error.message || JSON.stringify(monthlyData.error) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse monthly data: rows are [month, views, revenue, likes, comments, subsGained, avgViewDuration]
    const monthly = (monthlyData.rows || []).map(row => ({
      month: row[0],           // "2025-01" format
      views: row[1],
      revenue: Math.round(row[2] * 100) / 100,  // actual revenue in USD
      likes: row[3],
      comments: row[4],
      subscribersGained: row[5],
      avgViewDuration: row[6], // in seconds
    }));

    // Query 2: Top videos by revenue (1 API call)
    const topVidsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?` + new URLSearchParams({
      ids: 'channel==MINE',
      startDate: fmt(startDate),
      endDate: fmt(yesterday),
      metrics: 'views,estimatedRevenue,likes,comments,averageViewDuration',
      dimensions: 'video',
      sort: '-estimatedRevenue',
      maxResults: '50',
    }).toString();

    const topVidsRes = await fetch(topVidsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const topVidsData = await topVidsRes.json();

    // Parse top videos: rows are [videoId, views, revenue, likes, comments, avgViewDuration]
    const topVideos = (topVidsData.rows || []).map(row => ({
      videoId: row[0],
      views: row[1],
      revenue: Math.round(row[2] * 100) / 100,
      likes: row[3],
      comments: row[4],
      avgViewDuration: row[5],
    }));

    const result = {
      monthly,
      topVideos,
      fetchedAt: new Date().toISOString(),
    };

    // Cache for 24 hours
    await KV.put('yt-analytics-data', JSON.stringify(result), { expirationTtl: 86400 });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
