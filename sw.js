// sw.js — Service Worker do CRM V2
// Estratégia: Network First para API, Cache First para assets estáticos

const CACHE_NAME = "crm-v2-v1";

const STATIC_ASSETS = [
  "/",
  "/login",
  "/manifest.webmanifest",
];

// ── Instalação ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  // Não faz skipWaiting automático — espera o usuário confirmar pelo banner
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignora erro se algum asset não estiver disponível no momento
      });
    })
  );
});

// ── Ativação ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  // Remove caches antigos de versões anteriores
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Mensagens do cliente (ex: SKIP_WAITING disparado pelo banner) ─────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições que não são do mesmo origin
  if (url.origin !== self.location.origin) return;

  // Rotas de API: sempre Network First (nunca serve do cache)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Assets estáticos (_next/static): Cache First (imutáveis, têm hash no nome)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Páginas: Network First com fallback para cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});