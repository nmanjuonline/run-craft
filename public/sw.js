/**
 * RunCraft Service Worker (Network-First Strategy)
 * Ensures fresh updates in development while keeping offline fallback
 */

const CACHE_NAME = 'runcraft-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch fresh from network first, fall back to cache if offline
  event.respondWith(
    fetch(event.request)
      .then((networkRes) => {
        return networkRes;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
