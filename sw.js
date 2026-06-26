// Service Worker - 宝宝起名 PWA
// v3 - 网络优先策略，确保用户始终获取最新版本
var CACHE_NAME = 'baby-naming-v3';
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

// 网络优先策略：先尝试网络，失败再用缓存
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(function(response) {
      // 网络成功：缓存新响应
      if (response && response.status === 200) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(function() {
      // 网络失败：用缓存
      return caches.match(event.request).then(function(response) {
        return response || caches.match('./index.html');
      });
    })
  );
});
