/* Offline-first service worker: precache everything, serve from cache. */
const CACHE = 'stats-app-v4';
const ASSETS = [
  './', 'index.html', 'styles.css', 'theme.css',
  'app.js', 'storage.js', 'stats-config.js', 'share.js',
  'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/ball.svg',
  'fonts/fredoka-latin.woff2', 'fonts/fredoka-latin-ext.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
    ).catch(() => caches.match('index.html'))
  );
});
