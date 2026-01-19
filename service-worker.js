const CACHE = "ctdev-cache-v8";

const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/acute-pathway.js",
  "/manifest.json",
  "/icons/heart_192.png",
  "/icons/heart_512.png",
  "/icons/heart_180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return resp;
      });
    })
  );
});
