const CACHE_NAME = 'palavra-rua-shell-v1';
const CACHE_PREFIX = 'palavra-rua-shell-';
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/game.css',
  '/js/app.js',
  '/manifest.json',
  '/assets/icons/wordmark.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin
    || url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  const isAppShell = APP_SHELL.includes(url.pathname);
  if (!isAppShell) return;

  event.respondWith(
    fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
          .catch(error => console.error('[PWA] Falha ao armazenar recurso estático:', error));
      }
      return response;
    }).catch(async error => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const shell = await caches.match('/index.html');
        if (shell) return shell;
      }
      throw error;
    })
  );
});
