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

  const _url = new URL(context.request.url);
  const _mode = _url.searchParams.get('mode');

  // ── Helper: get OAuth credentials — env vars first, KV fallback (dev reads from KV) ──
  const _oauthCreds = async () => {
    const KV = context.env.YT_CACHE;
    const cid = context.env.GCP_CLIENT_ID || (KV && await KV.get('oauth-client-id'));
    const csec = context.env.GCP_CLIENT_SECRET || (KV && await KV.get('oauth-client-secret'));
    return { cid, csec };
  };

  // ── OAuth status ──
  if (_mode === 'auth-status') {
    const KV = context.env.YT_CACHE;
    const { cid } = await _oauthCreds();
    const hasRefresh = KV ? !!(await KV.get('yt-oauth-refresh')) : false;
    return new Response(JSON.stringify({ configured: !!cid, authorized: hasRefresh }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // ── OAuth start: redirect to Google consent (always via production) ──
  if (_mode === 'auth-start') {
    const { cid } = await _oauthCreds();
    // If no credentials locally (e.g. dev/preview), redirect to production
    if (!cid) return Response.redirect('https://sams-dashboard.pages.dev/api/yt?mode=auth-start', 302);
    const redirectUri = 'https://sams-dashboard.pages.dev/api/yt?mode=auth-callback';
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: cid, redirect_uri: redirectUri, response_type: 'code',
      scope: 'https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
      access_type: 'offline', prompt: 'consent',
    }).toString();
    return Response.redirect(authUrl, 302);
  }

  // ── OAuth callback: exchange code for tokens (runs on production) ──
  if (_mode === 'auth-callback') {
    const KV = context.env.YT_CACHE;
    if (!KV) return new Response('KV not bound', { status: 500, headers: corsHeaders });
    const code = _url.searchParams.get('code');
    const error = _url.searchParams.get('error');
    if (error) return new Response(`<h2>Auth denied</h2><p>${error}</p>`, { headers: { 'Content-Type': 'text/html' } });
    if (!code) return new Response('Missing code', { status: 400 });
    const { cid, csec } = await _oauthCreds();
    if (!cid || !csec) return new Response('OAuth credentials not found', { status: 500, headers: corsHeaders });
    const redirectUri = 'https://sams-dashboard.pages.dev/api/yt?mode=auth-callback';
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: cid, client_secret: csec, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
    });
    const td = await tokenRes.json();
    if (td.error) return new Response(`<h2>Token error</h2><pre>${JSON.stringify(td, null, 2)}</pre>`, { headers: { 'Content-Type': 'text/html' } });
    if (td.refresh_token) await KV.put('yt-oauth-refresh', td.refresh_token);
    if (td.access_token) await KV.put('yt-oauth-access', td.access_token, { expirationTtl: td.expires_in || 3600 });
    // Store credentials in KV so dev/preview can use them for token refresh
    await KV.put('oauth-client-id', cid);
    await KV.put('oauth-client-secret', csec);
    return new Response(`<h2>Connected!</h2><p>YouTube Analytics API authorized. You can close this tab.</p><script>setTimeout(()=>window.close(),2000)</script>`, { headers: { 'Content-Type': 'text/html' } });
  }

  // ── Analytics data fetch (with 3-key cache like main endpoint) ──
  if (_mode === 'analytics') {
    const KV = context.env.YT_CACHE;
    if (!KV) return new Response(JSON.stringify({ error: 'no KV' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const forceRefresh = _url.searchParams.get('refresh') === '1';
    // Layer 1: fresh cache (24hr)
    if (!forceRefresh) { const fresh = await KV.get('yta-fresh', 'json'); if (fresh) return new Response(JSON.stringify(fresh), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    // Layer 2: cooldown
    if (!forceRefresh) { const cd = await KV.get('yta-cooldown'); if (cd) { const lg = await KV.get('yta-good', 'json'); if (lg) return new Response(JSON.stringify(lg), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); return new Response(JSON.stringify({ error: 'cooldown' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); } }
    // Check auth
    const refreshToken = await KV.get('yt-oauth-refresh');
    if (!refreshToken) return new Response(JSON.stringify({ error: 'not_authorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    // Get access token
    let at = await KV.get('yt-oauth-access');
    if (!at) {
      try {
        const { cid, csec } = await _oauthCreds();
        if (!cid || !csec) { await KV.put('yta-cooldown', '1', { expirationTtl: 3600 }); const lg = await KV.get('yta-good', 'json'); return lg ? new Response(JSON.stringify(lg), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) : new Response(JSON.stringify({ error: 'GCP env vars not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
        const tr = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ refresh_token: refreshToken, client_id: cid, client_secret: csec, grant_type: 'refresh_token' }).toString() });
        const ttd = await tr.json();
        if (ttd.error) { if (ttd.error === 'invalid_grant') await KV.delete('yt-oauth-refresh'); await KV.put('yta-cooldown', '1', { expirationTtl: 3600 }); const lg = await KV.get('yta-good', 'json'); return lg ? new Response(JSON.stringify(lg), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) : new Response(JSON.stringify({ error: 'token_refresh_failed' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
        at = ttd.access_token; await KV.put('yt-oauth-access', at, { expirationTtl: ttd.expires_in || 3600 });
      } catch (e) { await KV.put('yta-cooldown', '1', { expirationTtl: 300 }); const lg = await KV.get('yta-good', 'json'); return lg ? new Response(JSON.stringify(lg), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) : new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    }
    // Fetch analytics
    try {
      const now = new Date(); const ed = new Date(now.getFullYear(), now.getMonth(), 1); const sd = new Date(ed); sd.setFullYear(sd.getFullYear() - 2);
      const fmt = d => d.toISOString().slice(0, 10);
      const mr = await fetch('https://youtubeanalytics.googleapis.com/v2/reports?' + new URLSearchParams({ ids: 'channel==MINE', startDate: fmt(sd), endDate: fmt(ed), metrics: 'views,estimatedRevenue,likes,comments,subscribersGained,averageViewDuration', dimensions: 'month', sort: 'month' }).toString(), { headers: { Authorization: 'Bearer ' + at } });
      const md = await mr.json();
      if (md.error) { const isQ = md.error.errors?.[0]?.reason === 'quotaExceeded'; await KV.put('yta-cooldown', '1', { expirationTtl: isQ ? 7200 : 600 }); const lg = await KV.get('yta-good', 'json'); return lg ? new Response(JSON.stringify(lg), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) : new Response(JSON.stringify({ error: md.error.message }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
      const monthly = (md.rows || []).map(r => ({ month: r[0], views: r[1], revenue: Math.round(r[2] * 100) / 100, likes: r[3], comments: r[4], subscribersGained: r[5], avgViewDuration: r[6] }));
      // Top videos by revenue
      const vr = await fetch('https://youtubeanalytics.googleapis.com/v2/reports?' + new URLSearchParams({ ids: 'channel==MINE', startDate: fmt(sd), endDate: fmt(ed), metrics: 'views,estimatedRevenue,likes,comments,averageViewDuration', dimensions: 'video', sort: '-estimatedRevenue', maxResults: '50' }).toString(), { headers: { Authorization: 'Bearer ' + at } });
      const vd = await vr.json();
      let topVideos = [];
      if (!vd.error) topVideos = (vd.rows || []).map(r => ({ videoId: r[0], views: r[1], revenue: Math.round(r[2] * 100) / 100, likes: r[3], comments: r[4], avgViewDuration: r[5] }));
      const result = { monthly, topVideos, fetchedAt: new Date().toISOString() };
      await KV.put('yta-fresh', JSON.stringify(result), { expirationTtl: 86400 });
      await KV.put('yta-good', JSON.stringify(result));
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) { await KV.put('yta-cooldown', '1', { expirationTtl: 300 }); const lg = await KV.get('yta-good', 'json'); return lg ? new Response(JSON.stringify(lg), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) : new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
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

    // Build map of long-form video IDs (>60s) to filter out shorts/posts
    const longFormMap = {};
    videos.forEach(v => {
      const dur = v.duration || '';
      const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!m) return;
      const secs = (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
      if (secs > 60) longFormMap[v.id] = v.title;
    });

    // Fetch all comment threads to find unreplied (1 unit per call, 100 per page, max 20 pages = 20 units)
    let unrepliedComments = [];
    let commentPageToken = '';
    let commentPages = 0;
    try {
      while (commentPages < 20) {
        const ctParam = commentPageToken ? `&pageToken=${commentPageToken}` : '';
        const ctRes = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&allThreadsRelatedToChannelId=${CHANNEL_ID}&maxResults=100&key=${API_KEY}${ctParam}`);
        const ctData = await ctRes.json();
        if (ctData.error) break;
        commentPages++;
        (ctData.items || []).forEach(t => {
          if (t.snippet.totalReplyCount === 0) {
            const c = t.snippet.topLevelComment.snippet;
            if (!longFormMap[c.videoId]) return; // skip shorts/posts
            unrepliedComments.push({
              id: t.id,
              videoId: c.videoId,
              videoTitle: longFormMap[c.videoId] || '',
              text: (c.textDisplay || '').slice(0, 200),
              publishedAt: c.publishedAt,
            });
          }
        });
        if (!ctData.nextPageToken) break;
        commentPageToken = ctData.nextPageToken;
      }
    } catch (e) { /* silently skip if comment fetch fails */ }

    const result = { channelStats, videos, unrepliedComments, fetchedAt: new Date().toISOString() };

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
