var VERSION = '20260708a';
self.addEventListener('install', function(e) {
  self.skipWaiting();
});
self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(k) { return Promise.all(k.map(function(c) { return caches.delete(c); })); }));
  self.clients.claim();
});
self.addEventListener('fetch', function(e) {
  // Same-origin only: never intercept CDN/cross-origin requests (stale cached pages
  // still reference dead CDN URLs; letting the browser+CSP handle them avoids SW errors)
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).catch(function() {
    return caches.match(e.request).then(function(r) { return r || Response.error(); });
  }));
});
