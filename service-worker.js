const CACHE = "ctdev-cache-v5";

const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/acute-pathway.js",
  "/manifest.json",
  "/Recommendations.txt",
  "/ContraindicationsImagingModality.txt",
  "/Chest Pain Background.txt",
  "/Recomendations.png",

  // A-002 figures/tables (upload these files to /assets/acute/)
  "/assets/acute/figure-2.png",
  "/assets/acute/table-3.png",
  "/assets/acute/table-4.png",
  "/assets/acute/figure-4.png",

  // Icons
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon-180.png",

  // Optional PDFs (safe to include if present)
  "/ICA-summary.pdf",
  "/CCTA-summary.pdf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
