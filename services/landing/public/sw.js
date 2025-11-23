// Basic service worker for TiltCheck
const CACHE_NAME = 'tiltcheck-v2';
const CORE_ASSETS = [
  '/',
  '/index-v2.html',
  '/styles/theme.css',
  '/styles/main.css',
  '/manifest.json',
  '/404.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(networkRes => {
        if (networkRes.ok && (req.url.includes('/styles/') || req.url.includes('/assets/'))) {
          cache.put(req, networkRes.clone());
        }
        return networkRes;
      }).catch(() => cached || cache.match('/404.html'));
      return cached || fetchPromise;
    })()
  );
});
