/* Weeks & Leaps service worker — app-shell cache + runtime font cache */
const CACHE = 'weeksandleaps-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  const putInCache = (req, resp) => {
    if (resp && (resp.ok || resp.type === 'opaque')) {
      const clone = resp.clone();
      caches.open(CACHE).then((c) => c.put(req, clone));
    }
    return resp;
  };

  // Navigations (the HTML) go network-first so deployed updates reach returning
  // users; everything else (icons, fonts) is cache-first.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((resp) => putInCache(e.request, resp))
        .catch(() => caches.match(e.request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((resp) => putInCache(e.request, resp));
    })
  );
});
