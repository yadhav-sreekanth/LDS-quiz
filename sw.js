self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("quiz-cache").then(cache => {
      return cache.addAll([
        "home.html",
        "manifest.json",
        "icons/icon-192.png",
        "icons/icon-512.png"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
