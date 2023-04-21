const cacheName = 'cachev1';
const filesToCache = [
  '{{ url_for("page_offline") }}',
  '{{ url_for("file_favicon") }}',
  '{{ url_for("file_webmanifest") }}',
  '{{ url_for("static_jinja2ed", filename="js/app.js") }}'
];
const pathsToCache = [
  '{{ url_for("static", filename="") }}',
  '{{ url_for("static_jinja2ed", filename="") }}',
  '{{ url_for("data_get", filename="") }}'
];

self.addEventListener('message', event => {
  switch(event.data) {
    case 'cacheinfo':
      return event.source.postMessage({
        cacheName: cacheName,
        filesToCache: filesToCache
      });
/*
    case 'flaskinfo':
      return event.source.postMessage({
        flaskUrl: flaskUrl
      });
*/
    default:
      event.source.postMessage(null);
    break;
  }
});

self.addEventListener('install', (event) => {
  console.log('[Service Worker] registered & updated')
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
        .catch(() => caches.match('{{ url_for("page_offline") }}'))
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
