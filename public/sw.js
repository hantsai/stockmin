// StockMin Service Worker — v1.0
const CACHE = "stockmin-v1";

// Assets to cache on install (your built JS/CSS files)
const PRECACHE = [
  "/",
  "/index.html",
  // Add your built bundle paths here after running: npm run build
  // e.g. "/assets/index-xxxx.js", "/assets/index-xxxx.css"
];

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Network-first for API, Cache-first for assets ─────────────────────
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Always network-first for stock API calls
  const isAPI = url.hostname.includes("finance.yahoo.com")
    || url.hostname.includes("corsproxy.io")
    || url.hostname.includes("anthropic.com")
    || url.hostname.includes("newsapi.org");

  if (isAPI) {
    // Network only — never cache live data or AI responses
    e.respondWith(fetch(e.request).catch(() => new Response("offline", { status: 503 })));
    return;
  }

  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match("/index.html")); // Fallback to shell
    })
  );
});
