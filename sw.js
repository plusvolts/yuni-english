/* 오프라인 캐시. content.js 등을 고치면 VERSION 숫자를 올려주세요. */
const VERSION = 'yuni-english-8';
const FILES = ['./', 'index.html', 'style.css', 'content.js', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'audio/index.json', '기획서.md'];
// 원어민 녹음 파일은 설치 뒤 백그라운드로 모두 받아둬요 (오프라인용)
const cacheAudio = () => caches.open(VERSION).then(c => fetch('audio/index.json').then(r => r.json()).then(idx => Promise.all([...new Set(Object.values(idx))].map(f => c.match('audio/' + f).then(hit => hit || c.add('audio/' + f).catch(() => {})))))).catch(() => {});
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()).then(() => { cacheAudio(); })); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request; const url = new URL(req.url);
  // 녹음 파일(mp3)은 바뀌지 않으니 캐시 먼저
  if (/\/audio\/[^/]+\.mp3$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; })));
    return;
  }
  // 나머지는 네트워크 우선 + 브라우저 캐시도 매번 확인(no-cache) → 새 버전이 바로 반영돼요. 안 되면 캐시 → 오프라인 동작
  const net = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache' }) : fetch(req, { cache: 'no-cache' });
  e.respondWith(net.then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
