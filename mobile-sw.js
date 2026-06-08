// Network-first service worker — always fetch fresh, no caching
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.map(c => caches.delete(c)))));
  self.clients.claim();
});
