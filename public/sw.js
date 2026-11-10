/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Service Worker — MeuTreino Pro
 * Estratégia de Cache: Stale-While-Revalidate para Assets Principais e App Shell Offline
 */

// Identificador único da versão do Service Worker e dos Caches
const SW_VERSION = 'meutreino-sw-v6.0';
const ASSETS_CACHE_NAME = `${SW_VERSION}-assets`;
const APP_SHELL_CACHE_NAME = `${SW_VERSION}-shell`;
const RUNTIME_CACHE_NAME = `${SW_VERSION}-runtime`;

// Lista de caches autorizados para a versão atual
const EXPECTED_CACHES = [
  ASSETS_CACHE_NAME,
  APP_SHELL_CACHE_NAME,
  RUNTIME_CACHE_NAME,
];

// Limites máximos de itens em cache para economia de armazenamento em dispositivos móveis
const MAX_CACHE_ENTRIES = 150;

// Assets essenciais pré-carregados durante o evento install para garantir funcionamento 100% offline
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/icon.png',
  '/icon.svg',
  '/favicon.ico',
];

/**
 * Limita o número de entradas em um cache removendo os itens mais antigos
 */
async function limitCacheEntries(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const deleteCount = keys.length - maxEntries;
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch {
    // Ignora erros não críticos de limpeza em background
  }
}

/**
 * Determina se a requisição é um asset estático elegível para Stale-While-Revalidate
 */
function isStaticAssetRequest(request, url) {
  // Ignora módulos do ambiente de desenvolvimento do Vite
  if (
    url.pathname.includes('@vite') ||
    url.pathname.includes('__vite') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('/node_modules/')
  ) {
    return false;
  }

  // Assets de bundle do Vite em produção
  if (url.pathname.startsWith('/assets/')) {
    return true;
  }

  // Destinos nativos da requisição
  const dest = request.destination;
  if (
    dest === 'style' ||
    dest === 'script' ||
    dest === 'worker' ||
    dest === 'font' ||
    dest === 'image' ||
    dest === 'manifest'
  ) {
    return true;
  }

  // Fontes do Google Fonts
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    return true;
  }

  // Extensões de arquivo estáticas e manifest
  if (url.pathname === '/manifest.json') {
    return true;
  }

  return /\.(?:js|mjs|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|ico|avif|json)$/i.test(
    url.pathname
  );
}

/**
 * Determina se a requisição deve ser ignorada pelo Service Worker
 */
function shouldIgnoreRequest(request, url) {
  // Apenas requisições GET com protocolo HTTP/HTTPS
  if (request.method !== 'GET') return true;
  if (!url.protocol.startsWith('http')) return true;

  // Ignora APIs de backend externas (Firebase Auth, Firestore, Google APIs) para não interferir na autenticação
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com')
  ) {
    return true;
  }

  // IGNORA COMPLETAMENTE requisições do ambiente de desenvolvimento do Vite (módulos, HMR, deps)
  if (
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('@vite') ||
    url.pathname.includes('__vite') ||
    url.pathname.startsWith('/src/') ||
    url.searchParams.has('v') ||
    url.searchParams.has('t') ||
    url.hostname.includes('ais-dev') ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.port === '3000'
  ) {
    return true;
  }

  return false;
}

/**
 * Estratégia Stale-While-Revalidate:
 * 1. Retorna imediatamente a resposta do cache se disponível (velocidade instantânea).
 * 2. Em paralelo, busca a versão mais recente na rede e atualiza o cache para próximas visitas.
 * 3. Se não houver cache prévio, aguarda a resposta da rede e armazena.
 * 4. Se a rede falhar e houver cache, o usuário continua navegando offline sem interrupção.
 */
async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(ASSETS_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Promessa de revalidação em segundo plano na rede
  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      if (
        networkResponse &&
        (networkResponse.status === 200 || networkResponse.type === 'opaque')
      ) {
        const responseClone = networkResponse.clone();
        await cache.put(request, responseClone);
        await limitCacheEntries(ASSETS_CACHE_NAME, MAX_CACHE_ENTRIES);
      }
      return networkResponse;
    })
    .catch((err) => {
      // Falha de rede: se for imagem e não tiver no cache, tenta fallback
      if (request.destination === 'image') {
        return (
          cache.match('/pwa-192x192.png') ||
          cache.match('/icon.svg')
        );
      }
      return null;
    });

  // Mantém o worker ativo até concluir a revalidação se necessário
  if (event && typeof event.waitUntil === 'function') {
    event.waitUntil(fetchPromise);
  }

  // Se já tivermos o recurso em cache, entrega instantaneamente (Stale)
  if (cachedResponse) {
    return cachedResponse;
  }

  // Se não estiver em cache, aguarda a resposta da rede
  const freshResponse = await fetchPromise;
  if (freshResponse) {
    return freshResponse;
  }

  // Se tudo falhar e for imagem, tenta ícone fallback
  if (request.destination === 'image') {
    const fallback = await cache.match('/pwa-192x192.png');
    if (fallback) return fallback;
  }

  throw new Error(`Asset offline não disponível em cache: ${request.url}`);
}

/**
 * Manipula navegações de página (SPA App Shell):
 * Garante que qualquer rota recarregada offline exiba o App Shell (/index.html)
 */
async function handleNavigation(request, event) {
  const shellCache = await caches.open(APP_SHELL_CACHE_NAME);
  const assetsCache = await caches.open(ASSETS_CACHE_NAME);

  // Busca index.html em cache primeiro
  const cachedShell =
    (await shellCache.match('/index.html')) ||
    (await assetsCache.match('/index.html')) ||
    (await shellCache.match('/'));

  // Revalida index.html na rede em segundo plano
  const networkPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        await shellCache.put('/index.html', networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  if (event && typeof event.waitUntil === 'function') {
    event.waitUntil(networkPromise);
  }

  // Se já tivermos o shell em cache, entrega imediatamente
  if (cachedShell) {
    return cachedShell;
  }

  // Se não houver cache, aguarda a rede
  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  // Fallback offline estático resiliente caso o precache ainda não tenha concluído
  return new Response(
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0d1424"><title>MeuTreino Pro — Offline</title></head><body style="background:#0d1424;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center"><div><h1 style="color:#10b981;font-size:24px;margin-bottom:8px">MeuTreino Pro ⚡</h1><p style="color:#94a3b8;font-size:14px">Você está sem conexão no momento. Seus treinos e fichas locais continuam seguros.</p><button onclick="window.location.reload()" style="margin-top:16px;background:#10b981;color:#090d16;font-weight:bold;padding:10px 20px;border-radius:12px;border:none;cursor:pointer">Tentar Novamente</button></div></body></html>',
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

// ============================================================================
// 1. CICLO DE VIDA: INSTALL
// ============================================================================
self.addEventListener('install', (event) => {
  // Se for a primeira instalação (sem versão anterior ativa), ativa imediatamente
  if (!self.registration || !self.registration.active) {
    self.skipWaiting();
  }

  // Faz o pré-carregamento dos assets essenciais do App Shell
  event.waitUntil(
    Promise.all([
      caches.open(APP_SHELL_CACHE_NAME).then((cache) =>
        Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
          )
        )
      ),
      caches.open(ASSETS_CACHE_NAME).then((cache) =>
        Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
          )
        )
      ),
    ])
  );
});

// ============================================================================
// 2. CICLO DE VIDA: ACTIVATE (Limpeza de Caches Antigos & Transição de Versão)
// ============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => !EXPECTED_CACHES.includes(name))
            .map((oldName) => caches.delete(oldName))
        )
      )
      .then(() => self.clients.claim())
      .then(async () => {
        // Notifica todas as janelas abertas sobre a versão ativa
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        for (const client of clients) {
          client.postMessage({
            type: 'SW_VERSION_ACTIVE',
            version: SW_VERSION,
            activatedAt: Date.now(),
          });
        }
      })
  );
});

// ============================================================================
// 3. ROTEAMENTO DE REQUISIÇÕES: FETCH
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições de métodos diferentes de GET ou domínios de autenticação
  if (shouldIgnoreRequest(request, url)) {
    return;
  }

  // A. Navegação de Páginas (SPA App Shell)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(handleNavigation(request, event));
    return;
  }

  // B. Assets Estáticos de Produção (JS, CSS, Fontes, Ícones, Imagens, Manifest) -> Stale-While-Revalidate
  if (isStaticAssetRequest(request, url)) {
    event.respondWith(staleWhileRevalidate(request, event));
    return;
  }

  // Demais requisições não são interceptadas, passando diretamente para a rede
});

// ============================================================================
// 4. COMUNICAÇÃO CLIENTE <-> SERVICE WORKER: MESSAGE
// ============================================================================
self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;
  if (event.origin && event.origin !== self.location.origin) return;

  const { type } = event.data;

  // Comando disparado pelo toast de atualização de versão do app
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Consulta da versão atual do Service Worker
  if (type === 'GET_SW_VERSION') {
    if (event.source && typeof event.source.postMessage === 'function') {
      event.source.postMessage({
        type: 'SW_VERSION_INFO',
        version: SW_VERSION,
      });
    }
    return;
  }

  // Força limpeza imediata de caches legados
  if (type === 'PURGE_LEGACY_CACHES') {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((n) => !EXPECTED_CACHES.includes(n))
            .map((n) => caches.delete(n))
        )
      )
    );
  }
});

// ============================================================================
// 5. NOTIFICAÇÕES PUSH NATIVAS & LEMBRETES DE TREINO
// ============================================================================
self.addEventListener('push', (event) => {
  let payload = {
    title: 'MeuTreino Pro ⚡',
    body: 'Hora de treinar! Mantenha a consistência e a sobrecarga progressiva 💪',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'meutreino-workout-reminder',
    data: { url: '/?action=start-workout' },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      vibrate: [200, 100, 200],
      data: payload.data,
      actions: [
        { action: 'start-workout', title: '🏋️ Iniciar Treino' },
        { action: 'dismiss', title: 'Depois' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK_ACTION',
              action: event.action || 'start-workout',
            });
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/?action=start-workout');
        }
      })
  );
});
