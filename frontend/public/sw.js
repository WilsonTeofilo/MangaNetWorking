// MangaNetWorking Service Worker — Suporte a Leitura Offline PWA
const APP_SHELL_CACHE = 'manganetworking-shell-v1';
const OFFLINE_MEDIA_CACHE = 'manganetworking-offline-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  // addAll() rejeita a instalação inteira se um único asset faltar (ex.: favicon ausente),
  // o que impede o Service Worker de ativar e mata o modo offline. Adiciona um a um.
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) =>
      Promise.all(
        STATIC_ASSETS.map((asset) => cache.add(asset).catch(() => undefined))
      )
    )
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
            // Respostas opacas/cross-origin podem rejeitar o put; não deixa rejeição solta.
            cache.put(event.request, responseToCache).catch(() => undefined);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
