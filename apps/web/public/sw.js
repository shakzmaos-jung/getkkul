/* 겟꿀 서비스워커 — 오프라인 최소 캐싱 + 푸시 수신(AC-A1.2/A1.3). */
const CACHE = 'getkkul-v1';
const PRECACHE = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 네트워크 우선, 실패 시 캐시(오프라인 최소). GET 만 처리, 동적 응답은 캐시하지 않음.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('/'))),
  );
});

// 푸시 수신 — 반드시 알림 표시(AC-A1.3, iOS 구독취소 방지).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: '겟꿀', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || '겟꿀';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
    tag: data.tag || 'getkkul-digest',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 → 앱 포커스/열기.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
