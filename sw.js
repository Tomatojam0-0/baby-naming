// Service Worker - 宝宝起名 PWA
var CACHE_NAME = 'baby-naming-v1';
var urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/bazi.js',
  './js/sangge.js',
  './js/naming.js',
  './data/chars.js',
  './lib/lunar.min.js',
  './manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;
      return fetch(event.request).then(function(response) {
        // 缓存新请求（仅同源）
        if (!event.request || event.request.method !== 'GET') return response;
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(function() {
        // 离线回退
        return caches.match('./index.html');
      });
    })
  );
});
