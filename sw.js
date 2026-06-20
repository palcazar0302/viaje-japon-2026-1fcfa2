/* Service worker — caché offline para Japón 2026 (v2: se actualiza sola con internet) */
const CACHE = "japon2026-v2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    const isDoc = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
    if (isDoc) {
      // HTML de la app: red primero (así ves lo último), y si no hay internet, la copia guardada
      e.respondWith(
        fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => caches.match(req).then(h => h || caches.match("./index.html")))
      );
      return;
    }
    // Resto de archivos propios: copia guardada y actualiza en segundo plano
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Externos (fotos, fuentes): red primero, y si falla, copia guardada
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});
