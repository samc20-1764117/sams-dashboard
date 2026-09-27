// Serves the Today/Month home-screen icons' correct manifest/icon/title in the
// ACTUAL FIRST-BYTE HTML, not via client-side JS after the fact.
//
// Why: mobile.html used to swap <link rel="manifest">/apple-touch-icon/title via an
// inline script once the DOM was ready. That worked for a normal page view (confirmed
// by loading the URL directly in Safari) but NOT for "Add to Home Screen" — Safari
// appears to resolve the manifest/icon for that action before, or independent of,
// that later DOM mutation, so every icon kept installing with the shared default
// manifest regardless of ?tab=. Rewriting the raw HTML here, before the browser ever
// parses it, removes that race entirely.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const tab = url.searchParams.get('tab');
  const assetUrl = new URL('/mobile.html', url);
  const res = await env.ASSETS.fetch(new Request(assetUrl, request));

  if (tab !== 'today' && tab !== 'month') return res;

  return new HTMLRewriter()
    .on('link[rel="manifest"]', {
      element(el) { el.setAttribute('href', `/mobile-${tab}-manifest.json`); },
    })
    .on('link[rel="apple-touch-icon"]', {
      element(el) { el.setAttribute('href', `/icons/icon-${tab}-180.png`); },
    })
    .on('meta[name="apple-mobile-web-app-title"]', {
      element(el) { el.setAttribute('content', tab === 'today' ? 'Today' : 'Month'); },
    })
    .transform(res);
}
