/**
 * Service Worker para PWA - Funcionalidade Offline
 *
 * Estratégia de Cache:
 * - Network first para APIs (falha para cache)
 * - Cache first para assets (estático)
 * - Stale-while-revalidate para dados do cardápio
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `cardapio-freitas-${CACHE_VERSION}`;

// Assets que devem ser cacheados no install
const ASSETS_TO_CACHE = [
  "/",
  "/offline.html",
  "/favicon.ico",
  "/_next/static/",
];

// Instalar Service Worker
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching core assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativar Service Worker (cleanup)
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch listener
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Network-first para APIs (fallback para cache se offline)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cacheCopy);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback para cache em caso de erro
          return caches
            .match(request)
            .then((response) => response || createOfflineResponse());
        })
    );
    return;
  }

  // Cache-first para assets estáticos (JS, CSS, fonts)
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((response) => {
          if (response.ok) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cacheCopy);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: network-first, fallback para cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cacheCopy);
          });
        }
        return response;
      })
      .catch(() => {
        return caches
          .match(request)
          .then((response) => response || createOfflineResponse());
      })
  );
});

// Criar página offline padrão
function createOfflineResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Offline - Padaria Freitas</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .container {
          text-align: center;
          padding: 20px;
        }
        h1 { color: #333; }
        p { color: #666; }
        button {
          background: #7c4e42;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }
        button:hover { background: #5a3a2f; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📡 Sem Conexão</h1>
        <p>Você está offline. Tente novamente quando tiver conexão.</p>
        <button onclick="location.reload()">Tentar Novamente</button>
      </div>
    </body>
    </html>
    `,
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/html; charset=utf-8" }
    }
  );
}

// Background sync para sincronizar quando voltar online
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-menu") {
    event.waitUntil(syncMenu());
  }
});

async function syncMenu() {
  try {
    const response = await fetch("/api/sync");
    if (response.ok) {
      const data = await response.json();
      // Notificar clientes sobre sincronização
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: "SYNC_COMPLETE",
          data: data,
        });
      });
    }
  } catch (error) {
    console.error("[SW] Sync failed:", error);
  }
}
