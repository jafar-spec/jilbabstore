/* Minimal, safe service worker — network-first for navigations (always fresh
   content when online), with an offline fallback to a cached shell. Static
   assets are cached opportunistically. */
const CACHE = 'jilbab-v1';
const OFFLINE_URLS = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE_URLS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never cache API calls or cross-origin (Firebase/Algolia/analytics) — always network.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Page navigations: network-first, fall back to cache, then to '/'.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {}); return res; })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Static assets (_next, images, fonts): cache-first, then network.
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/assets/') || /\.(png|jpg|jpeg|webp|svg|woff2?|css|js)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => cached))
    );
  }
});
