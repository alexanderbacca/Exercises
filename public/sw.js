/* Pulse & Power Tracker - image cache worker.
   Keeps the exercise photos in a long-lived browser cache so they open
   instantly (even on slow data or offline) after the first visit. */
var CACHE = 'exercise-images-v1';
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
  var url = new URL(event.request.url);
  // Only intercept the exercise photos; let everything else pass through.
  if (url.hostname !== IMAGE_HOST || !/\.png$/i.test(url.pathname)) return;
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(event.request).then(function (hit) {
        if (hit) return hit;
        return fetch(event.request).then(function (response) {
          if (response && response.ok) cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
