// オフライン用 Service Worker
// 初回アクセス時にファイル一式を保存し、以後はキャッシュから表示する。
// オンライン時は裏で最新版を取りに行き、次に開いたときに反映される。
const CACHE = 'lbm-calc-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // 裏で最新版を取得してキャッシュを更新（オフラインなら null）
  const fresh = fetch(req)
    .then((res) => {
      if (!res.ok) return res;
      const copy = res.clone();
      return caches.open(CACHE).then((c) => c.put(req, copy)).then(() => res, () => res);
    })
    .catch(() => null);
  e.waitUntil(fresh);

  const opts = { ignoreSearch: true, ignoreVary: true };
  e.respondWith(
    caches.match(req, opts)
      .then((hit) => hit || fresh)
      .then((res) => res || (req.mode === 'navigate' ? caches.match('./index.html', opts) : null))
      .then((res) => res || Response.error())
  );
});
