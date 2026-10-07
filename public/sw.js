// Service worker da Mercy: abre rápido e lê sem internet.
// - Arquivos do app (/_next/static, imutáveis): cache primeiro.
// - Capítulos da Bíblia (/study/bible/LIVRO/CAP): rede primeiro, guarda os últimos 30;
//   sem rede, devolve o guardado.
// - Outras páginas sem rede: /offline.html (lista os capítulos guardados).
// - Ao abrir /login (sair da conta ou sessão vencida) apaga as páginas guardadas.
const STATIC = "mercy-static-v1";
const PAGES = "mercy-pages-v1";
const KEEP = 30;
const CHAPTER = /^\/study\/bible\/[0-9A-Z]{3}\/\d+$/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.add("/offline.html")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function keepChapter(req, res) {
  const cache = await caches.open(PAGES);
  const key = new URL(req.url).pathname;
  await cache.delete(key);
  await cache.put(key, res);
  const keys = await cache.keys();
  for (const old of keys.slice(0, Math.max(0, keys.length - KEEP))) await cache.delete(old);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode !== "navigate") return;

  if (url.pathname === "/login") {
    e.waitUntil(caches.delete(PAGES));
    return;
  }

  e.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (CHAPTER.test(url.pathname) && res.ok && !res.redirected) e.waitUntil(keepChapter(req, res.clone()));
        return res;
      } catch {
        if (CHAPTER.test(url.pathname)) {
          const hit = await caches.match(url.pathname, { cacheName: PAGES });
          if (hit) return hit;
        }
        return (await caches.match("/offline.html", { cacheName: STATIC })) || Response.error();
      }
    })(),
  );
});

// A leitura troca de capítulo sem recarregar a página; ela avisa aqui e o capítulo é
// baixado uma vez para ficar guardado (se ainda não estiver).
self.addEventListener("message", (e) => {
  const path = e.data && e.data.type === "keep-chapter" ? String(e.data.path || "") : "";
  if (!CHAPTER.test(path)) return;
  e.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES);
      if (await cache.match(path)) return;
      try {
        const res = await fetch(path, { credentials: "same-origin" });
        if (res.ok && !res.redirected) await keepChapter(new Request(new URL(path, self.location.origin)), res);
      } catch {}
    })(),
  );
});
