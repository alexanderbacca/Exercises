/* Pulse & Power Tracker - PWA cache worker.
   - Exercise photos (raw.githubusercontent.com): cache-first, they never change.
   - App shell (this site): network-first with cache fallback, so the app
     opens even with no internet after the first visit. */
var CACHE = 'exercise-images-v3';
var IMAGE_HOST = 'raw.githubusercontent.com';

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Exercise photos: cache-first (long-lived, instant on repeat visits)
  if (url.hostname === IMAGE_HOST && /\.(png|webp)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (response) {
            if (response && response.ok) cache.put(req, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // App shell (same origin): try the network, fall back to cache when offline
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).then(function (response) {
        if (response && response.ok) {
          var clone = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, clone); });
        }
        return response;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./');
        });
      })
    );
  }
});
