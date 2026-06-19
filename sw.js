const CACHE = 'teiji-tango-v36';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/js/puzzles.js',
  '/js/solver.js',
  '/js/game.js',
  '/js/app.js',
  '/icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // ナビゲーション (HTML) はネットワーク優先、失敗時はキャッシュ
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  // その他のアセットはキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
