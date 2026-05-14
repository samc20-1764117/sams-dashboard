// YouTube Analytics API — fetch actual revenue and metrics by month
// Mirrors yt.js safeguard pattern: fresh (24hr TTL) + good (permanent fallback) + cooldown (prevents retry)
// Max 2 API calls per fetch, cached 24hr. ~200 queries/day quota (separate from Data API).
export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': context.request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data, status) => new Response(JSON.stringify(data), {
    status: status || 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  const KV = context.env.YT_CACHE;
  if (!KV) return json({ error: 'KV not configured' }, 500);

  const url = new URL(context.request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';

  // ── LAYER 1: Serve fresh cache (24hr TTL) ──
  if (!forceRefresh) {
    const fresh = await KV.get('yta-fresh', 'json');
    if (fresh) return json(fresh);
  }

  // ── LAYER 2: Cooldown — don't retry if we recently failed ──
  if (!forceRefresh) {
    const cooldown = await KV.get('yta-cooldown');
    if (cooldown) {
      // Serve last good data during cooldown
      const lastGood = await KV.get('yta-good', 'json');
      if (lastGood) return json(lastGood);
      return json({ error: 'cooldown_active' }, 429);
    }
  }

  // ── Check OAuth tokens ──
  const refreshToken = await KV.get('yt-oauth-refresh');
  if (!refreshToken) {
    return json({ error: 'not_authorized', authUrl: '/api/yt-auth?action=start' }, 401);
  }

  const CLIENT_ID = context.env.GCP_CLIENT_ID || await KV.get('oauth-client-id');
  const CLIENT_SECRET = context.env.GCP_CLIENT_SECRET || await KV.get('oauth-client-secret');
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return json({ error: 'OAuth not configured' }, 500);
  }

  // ── Get access token (use cached or refresh) ──
  let accessToken = await KV.get('yt-oauth-access');
  if (!accessToken) {
    try {
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
        if (tokenData.error === 'invalid_grant') await KV.delete('yt-oauth-refresh');
        // Set cooldown so we don't keep retrying token refresh
        await KV.put('yta-cooldown', '1', { expirationTtl: 3600 });
        const lastGood = await KV.get('yta-good', 'json');
        if (lastGood) return json(lastGood);
        return json({ error: 'token_refresh_failed', authUrl: '/api/yt-auth?action=start' }, 401);
      }
      accessToken = tokenData.access_token;
      await KV.put('yt-oauth-access', accessToken, { expirationTtl: tokenData.expires_in || 3600 });
    } catch (e) {
      await KV.put('yta-cooldown', '1', { expirationTtl: 300 });
      const lastGood = await KV.get('yta-good', 'json');
      if (lastGood) return json(lastGood);
      return json({ error: 'token_refresh_error: ' + e.message }, 500);
    }
  }

  // ── Fetch analytics data (2 API calls) ──
  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 2);
    const fmt = d => d.toISOString().slice(0, 10);

    // Query 1: Monthly channel metrics
    const monthlyRes = await fetch(
      'https://youtubeanalytics.googleapis.com/v2/reports?' + new URLSearchParams({
        ids: 'channel==MINE',
        startDate: fmt(startDate),
        endDate: fmt(yesterday),
        metrics: 'views,estimatedRevenue,likes,comments,subscribersGained,averageViewDuration',
        dimensions: 'month',
        sort: 'month',
      }).toString(),
      { headers: { Authorization: 'Bearer ' + accessToken } }
    );
    const monthlyData = await monthlyRes.json();

    if (monthlyData.error) {
      const isQuota = monthlyData.error.errors?.[0]?.reason === 'quotaExceeded';
      // Cooldown: 2hr for quota, 10min for other errors
      await KV.put('yta-cooldown', '1', { expirationTtl: isQuota ? 7200 : 600 });
      const lastGood = await KV.get('yta-good', 'json');
      if (lastGood) return json(lastGood);
      return json({ error: 'analytics_api_error', detail: monthlyData.error.message }, 502);
    }

    const monthly = (monthlyData.rows || []).map(row => ({
      month: row[0],
      views: row[1],
      revenue: Math.round(row[2] * 100) / 100,
      likes: row[3],
      comments: row[4],
      subscribersGained: row[5],
      avgViewDuration: row[6],
    }));

    // Query 2: Top videos by revenue
    const topVidsRes = await fetch(
      'https://youtubeanalytics.googleapis.com/v2/reports?' + new URLSearchParams({
        ids: 'channel==MINE',
        startDate: fmt(startDate),
        endDate: fmt(yesterday),
        metrics: 'views,estimatedRevenue,likes,comments,averageViewDuration',
        dimensions: 'video',
        sort: '-estimatedRevenue',
        maxResults: '50',
      }).toString(),
      { headers: { Authorization: 'Bearer ' + accessToken } }
    );
    const topVidsData = await topVidsRes.json();

    // If second query fails, still return monthly data (don't waste the first call)
    let topVideos = [];
    if (!topVidsData.error) {
      topVideos = (topVidsData.rows || []).map(row => ({
        videoId: row[0],
        views: row[1],
        revenue: Math.round(row[2] * 100) / 100,
        likes: row[3],
        comments: row[4],
        avgViewDuration: row[5],
      }));
    }

    const result = { monthly, topVideos, fetchedAt: new Date().toISOString() };

    // ── LAYER 3: Cache result ──
    // Fresh cache: 24 hours (controls when we re-fetch — only 1 fetch per day)
    await KV.put('yta-fresh', JSON.stringify(result), { expirationTtl: 86400 });
    // Good cache: permanent (fallback when API is down or quota hit)
    await KV.put('yta-good', JSON.stringify(result));

    return json(result);
  } catch (e) {
    // Network/runtime error — set short cooldown, serve last good
    await KV.put('yta-cooldown', '1', { expirationTtl: 300 });
    const lastGood = await KV.get('yta-good', 'json');
    if (lastGood) return json(lastGood);
    return json({ error: e.message }, 500);
  }
}
