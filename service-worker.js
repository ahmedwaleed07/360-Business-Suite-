const prefix = "360-business-suite-preview-";
const version = prefix + "v3";
const files = [
  "./", "index.html", "projects.html", "manifest.webmanifest",
  "assets/site.css", "assets/brand-theme.css", "assets/projects.css",
  "assets/site.js", "assets/sales-flow.mjs", "assets/projects.js", "assets/projects-core.mjs",
  "assets/brand-gate.js", "assets/brand-gate-core.mjs", "assets/install.js",
  "assets/branding/360-infinity.svg", "assets/branding/asas360-original-logo.png",
  "assets/branding/app-192.png", "assets/branding/app-512.png"
];
const urls = new Set(files.map(file => new URL(file, self.registration.scope).href));

self.addEventListener("install", event => {
  event.waitUntil(caches.open(version).then(cache =>
    cache.addAll(files.map(file => new Request(new URL(file, self.registration.scope), {cache:"reload"})))
  ));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(prefix) && name !== version).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  url.search = "";
  if (event.request.method !== "GET" || !urls.has(url.href)) return;
  event.respondWith((async () => {
    try {
      return await fetch(event.request);
    } catch (error) {
      const cache = await caches.open(version);
      const saved = await cache.match(url.href);
      if (saved) return saved;
      throw error;
    }
  })());
});
