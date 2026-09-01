/* PWA service worker — shell cache + push (FCM background) */
const SHELL_CACHE = 'xidmetal-shell-v3';
const SHELL_URLS = ['/', '/manifest.webmanifest', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('xidmetal-shell-') && key !== SHELL_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation: network first, shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((cached) => cached || Response.error()),
      ),
    );
    return;
  }

  if (SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
  }
});

self.addEventListener('push', (event) => {
  let title = 'Xidmətal';
  let body = '';
  let data = {};

  try {
    const payload = event.data ? event.data.json() : null;
    if (payload) {
      title =
        payload.notification?.title ||
        payload.title ||
        title;
      body =
        payload.notification?.body ||
        payload.body ||
        '';
      data = payload.data || payload || {};
    } else if (event.data) {
      body = event.data.text();
    }
  } catch {
    try {
      body = event.data ? event.data.text() : '';
    } catch {
      body = '';
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body || 'Yeni bildiriş',
      icon: '/logo.png',
      badge: '/logo.png',
      data,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    (event.notification.data && event.notification.data.href) ||
    '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            void client.focus();
            if ('navigate' in client && typeof targetUrl === 'string') {
              void client.navigate(targetUrl);
            }
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(
            typeof targetUrl === 'string' ? targetUrl : '/',
          );
        }
      }),
  );
});
