/* 오프라인 캐시. content.js 등을 고치면 VERSION 숫자를 올려주세요. */
const VERSION = 'yuni-english-6';
const FILES = ['./', 'index.html', 'style.css', 'content.js', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'audio/index.json'];
// 원어민 녹음 파일은 설치 뒤 백그라운드로 모두 받아둬요 (오프라인용)
const cacheAudio = () => caches.open(VERSION).then(c => fetch('audio/index.json').then(r => r.json()).then(idx => Promise.all([...new Set(Object.values(idx))].map(f => c.match('audio/' + f).then(hit => hit || c.add('audio/' + f).catch(() => {})))))).catch(() => {});
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()).then(() => { cacheAudio(); })); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // 네트워크 우선(최신 반영), 안 되면 캐시 → 오프라인에서도 동작
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
