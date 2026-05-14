// YouTube Analytics API — OAuth 2.0 flow
// Handles both initiating auth and receiving callback
export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': context.request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const CLIENT_ID = context.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = context.env.GOOGLE_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: 'OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(context.request.url);
  const action = url.searchParams.get('action');

  // Determine redirect URI from the request URL (works for both dev and prod)
  const redirectUri = `${url.origin}/api/yt-auth?action=callback`;

  // Step 1: Start OAuth — redirect to Google consent screen
  if (!action || action === 'start') {
    const scopes = [
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
    ];
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    }).toString();
    return Response.redirect(authUrl, 302);
  }

  // Step 2: Callback — exchange code for tokens
  if (action === 'callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    if (error) {
      return new Response(`<h2>Auth denied</h2><p>${error}</p><p><a href="/api/yt-auth?action=start">Try again</a></p>`, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    if (!code) {
      return new Response('Missing code', { status: 400 });
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return new Response(`<h2>Token error</h2><pre>${JSON.stringify(tokenData, null, 2)}</pre>`, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Store refresh token in KV (persists across deploys)
    const KV = context.env.YT_CACHE;
    if (KV && tokenData.refresh_token) {
      await KV.put('yt-oauth-refresh', tokenData.refresh_token);
    }
    // Also store the current access token with its expiry
    if (KV && tokenData.access_token) {
      await KV.put('yt-oauth-access', tokenData.access_token, {
        expirationTtl: tokenData.expires_in || 3600,
      });
    }

    return new Response(`<h2>Connected!</h2><p>YouTube Analytics API is now authorized. You can close this tab.</p><script>setTimeout(()=>window.close(),2000)</script>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Status check — is OAuth configured and authorized?
  if (action === 'status') {
    const KV = context.env.YT_CACHE;
    const hasRefresh = KV ? !!(await KV.get('yt-oauth-refresh')) : false;
    return new Response(JSON.stringify({ configured: true, authorized: hasRefresh }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response('Unknown action', { status: 400 });
}
