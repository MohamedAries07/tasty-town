/* TASTY TOWN service worker.
   Caches only public, non-personal files: the offline page, icons, build assets and public food photos.
   Pages, /api, /admin, /order, /checkout and anything personal always go to the network and are never stored. */
const VERSION = "v1";
const STATIC = `tt-static-${VERSION}`;
const IMAGES = `tt-images-${VERSION}`;
const PRECACHE = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];
const MAX_IMAGES = 80;

self.addEventListener("install", (e) => { e.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE))); });

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keep = new Set([STATIC, IMAGES]);
    for (const k of await caches.keys()) if (k.startsWith("tt-") && !keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });

async function trim(cacheName, max) {
  const c = await caches.open(cacheName), keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;

  // Page navigations: always the network. Offline fallback is a static page with no personal data.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(async () => (await caches.match("/offline.html")) ?? Response.error()));
    return;
  }
  // Hashed build assets and icons: safe to keep forever.
  if (url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))) {
    e.respondWith(caches.open(STATIC).then(async (c) => (await c.match(req)) ?? fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  // Public food photos (never the private review bucket or signed URLs).
  if (url.pathname.includes("/storage/v1/object/public/") && !url.search) {
    e.respondWith(caches.open(IMAGES).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok) { c.put(req, r.clone()); trim(IMAGES, MAX_IMAGES); } return r; }).catch(() => hit);
      return hit ?? net;
    }));
  }
});
