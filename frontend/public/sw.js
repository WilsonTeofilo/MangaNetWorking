// MangaNetWorking Service Worker — Suporte a Leitura Offline PWA
const APP_SHELL_CACHE = 'manganetworking-shell-v1';
const OFFLINE_MEDIA_CACHE = 'manganetworking-offline-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/vite.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k !== APP_SHELL_CACHE && k !== OFFLINE_MEDIA_CACHE)
          .map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Storage & Páginas de Capítulo: Tenta Cache Offline Primeiro
  if (url.pathname.startsWith('/api/storage/') || url.pathname.startsWith('/api/uploads/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request);
      })
    );
    return;
  }

  // 2. Requisições Dinâmicas da API (Auth, Moderação, Doações): Somente Rede
  if (url.pathname.startsWith('/api/')) {
    return; // Passa direto para a rede
  }

  // 3. App Shell e Assets Estáticos: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
