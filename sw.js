/* Anime Universe — service worker: офлайн-кэш */
"use strict";
const V = "au-v2";
const CORE = ["/", "/data.js?v=4", "/favicon.svg", "/manifest.json", "/404.png?v=2"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  const sameOrigin = u.origin === location.origin;
  const font = u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com";
  // firebase, jikan и прочие внешние API — всегда напрямую в сеть
  if (!sameOrigin && !font) return;

  // обложки и шрифты: кэш-первый (неизменяемые)
  if ((sameOrigin && u.pathname.startsWith("/img/")) || font) {
    e.respondWith(
      caches.open(V).then(async c => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const r = await fetch(e.request);
        if (r.ok) c.put(e.request, r.clone());
        return r;
      })
    );
    return;
  }

  // страницы и данные: сеть-первая, кэш как офлайн-фолбэк
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) {
        const cp = r.clone();
        caches.open(V).then(c => c.put(e.request, cp));
      }
      return r;
    }).catch(() =>
      caches.match(e.request).then(h => h || caches.match("/"))
    )
  );
});
