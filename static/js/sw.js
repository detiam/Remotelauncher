const cacheName = 'RemoteLauncher-cachev2';
const offlineUrl = '/offline'
const filesToCache = [
  offlineUrl,
  '/favicon.ico',
  '/app.webmanifest',
  '/template/js/app.js'
];
const pathsToCache = [
  '/static/',
  '/template/',
  '/data/resources/'
];

self.addEventListener('message', event => {
  if (event.data === 'cacheinfo') {
    // 向应用程序脚本回复变量
    event.source.postMessage({cacheName: cacheName, filesToCache: filesToCache});
  }
});

self.addEventListener('install', (event) => {
  // console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      console.log('[Service Worker] Caching file: ' + filesToCache);
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener('fetch', function(e) {
  const requestURL = new URL(e.request.url);
  // console.log('[Service Worker] Fetching resource: '+requestURL);
  if (requestURL.origin === location.origin) {
    e.respondWith(caches.match(e.request)
      .then(function(r) { return r || fetch(e.request)
        .catch(() => caches.match(offlineUrl))
        .then(async function(response) {
          if (pathsToCache.some(path => requestURL.pathname.startsWith(path))) {
            const cache = await caches.open(cacheName);
            console.log('[Service Worker] Caching new resource: ' + requestURL);
            cache.put(e.request, response.clone());
          } return response;
        });
    }));
}});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if(cacheName.indexOf(key) === -1) {
          return caches.delete(key);
        }
      }));
    })
  );
});
