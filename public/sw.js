/**
 * Service Worker — MeuTreino Pro (v4.1)
 * Arquitetura PWA Compliant para Instalação WebAPK no Android e Operação Offline:
 * 1. 'Cache First' para Recursos Estáticos (JS, CSS, Bundles /assets/*, Fontes, Ícones, Imagens, Manifest)
 * 2. 'Stale-While-Revalidate' para Dados de Treino (Rotinas, Sessões, Logs, Snapshots, Supabase REST)
 * 3. App Shell Offline Navigation Fallback + Background Sync ('sync') + Notificações Push Locais
 */

const SW_VERSION = 'meutreino-sw-v4.5';
const STATIC_CACHE_NAME = `${SW_VERSION}-static-assets`;
const WORKOUT_DATA_CACHE_NAME = `${SW_VERSION}-workout-data`;
const APP_SHELL_CACHE_NAME = `${SW_VERSION}-app-shell`;

const ACTIVE_CACHES = [
  STATIC_CACHE_NAME,
  WORKOUT_DATA_CACHE_NAME,
  APP_SHELL_CACHE_NAME,
];

const MAX_STATIC_CACHE_ITEMS = 120;
const MAX_WORKOUT_DATA_CACHE_ITEMS = 60;

// Recursos estáticos essenciais pré-cacheados na instalação para garantir WebAPK no Android e boot offline
const PRECACHE_STATIC_ASSETS = [
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

const SYNTHETIC_WORKOUT_DATA_URL = '/__sw_workout_data__/latest_bundle.json';
const SYNTHETIC_OUTBOX_URL = '/__sw_workout_data__/pending_outbox.json';
const BACKGROUND_SYNC_TAG = 'meutreino-workout-sync-buffer';
const CRITICAL_BACKGROUND_SYNC_TAG = 'meutreino-critical-workout-sync';
const BG_SYNC_DB_NAME = 'meutreino_bg_sync_db';
const BG_SYNC_STORE_NAME = 'sync_outbox';

let activeHabitSchedule = null;
let habitTimerInterval = null;

/**
 * Abre o banco IndexedDB compartilhado para leitura/escrita do Outbox no Service Worker
 */
function openOutboxDB() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(BG_SYNC_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(BG_SYNC_STORE_NAME)) {
          db.createObjectStore(BG_SYNC_STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveOutboxEntryInSW(record) {
  if (!record || !record.id) return;
  try {
    const db = await openOutboxDB();
    if (db) {
      await new Promise((resolve) => {
        try {
          const tx = db.transaction(BG_SYNC_STORE_NAME, 'readwrite');
          tx.objectStore(BG_SYNC_STORE_NAME).put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  } catch {}

  try {
    const cache = await caches.open(WORKOUT_DATA_CACHE_NAME);
    const response = new Response(JSON.stringify(record), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
    await cache.put(SYNTHETIC_OUTBOX_URL, response);
  } catch {}
}

async function removeOutboxEntryInSW(recordId) {
  try {
    const db = await openOutboxDB();
    if (db && recordId) {
      await new Promise((resolve) => {
        try {
          const tx = db.transaction(BG_SYNC_STORE_NAME, 'readwrite');
          tx.objectStore(BG_SYNC_STORE_NAME).delete(recordId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  } catch {}

  try {
    const cache = await caches.open(WORKOUT_DATA_CACHE_NAME);
    await cache.delete(SYNTHETIC_OUTBOX_URL);
  } catch {}
}

async function getAllPendingOutboxEntries() {
  const entries = [];
  const seenIds = new Set();

  try {
    const db = await openOutboxDB();
    if (db) {
      const dbRecords = await new Promise((resolve) => {
        try {
          const tx = db.transaction(BG_SYNC_STORE_NAME, 'readonly');
          const req = tx.objectStore(BG_SYNC_STORE_NAME).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });
      for (const item of dbRecords) {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          entries.push(item);
        }
      }
    }
  } catch {}

  try {
    const cache = await caches.open(WORKOUT_DATA_CACHE_NAME);
    const cachedRes = await cache.match(SYNTHETIC_OUTBOX_URL);
    if (cachedRes) {
      const cachedItem = await cachedRes.json();
      if (cachedItem && cachedItem.id && !seenIds.has(cachedItem.id)) {
        seenIds.add(cachedItem.id);
        entries.push(cachedItem);
      }
    }
  } catch {}

  return entries;
}

/**
 * Envia diretamente do Service Worker os dados de 'workoutLogs' e 'sessions' para o Supabase REST API,
 * funcionando mesmo quando o usuário fechou o app prematuramente após concluir o treino (zero abas abertas).
 */
async function flushOutboxDirectlyToSupabase() {
  const entries = await getAllPendingOutboxEntries();
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Se houver abas abertas, solicita também que o cliente faça o flush da fila em memória
  for (const client of clients) {
    client.postMessage({
      type: 'SW_FLUSH_MUTATION_BUFFER',
      timestamp: Date.now(),
    });
  }

  for (const entry of entries) {
    if (!entry || !entry.userId || !entry.bundle) continue;
    const supabaseUrl = (entry.supabaseUrl || '').trim().replace(/\/+$/, '');
    const supabaseAnonKey = (entry.supabaseAnonKey || '').trim();

    if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('https://')) {
      continue;
    }

    try {
      const parsed = new URL(supabaseUrl);
      const host = parsed.hostname.toLowerCase();
      if (
        parsed.protocol !== 'https:' ||
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '169.254.169.254'
      ) {
        continue;
      }
    } catch {
      continue;
    }

    // Garante que workoutLogs e sessions estejam consolidados dentro do bundle enviado ao Supabase
    const bundleToSync = {
      ...entry.bundle,
      sessions: entry.sessions || entry.bundle.sessions || [],
      workoutLogs: entry.workoutLogs || entry.bundle.workoutLogs || {
        currentLogs: entry.bundle.currentLogs || {},
        historyLogs: entry.bundle.historyLogs || {},
      },
      updatedAt: entry.updatedAt || new Date().toISOString(),
    };

    const endpoint = `${supabaseUrl}/rest/v1/meutreino_sync?on_conflict=user_id`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'x-meutreino-user-id': String(entry.userId),
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id: entry.userId,
        data: bundleToSync,
        updated_at: bundleToSync.updatedAt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Supabase Background Sync HTTP ${response.status}`);
    }

    // Sucesso: remove do Outbox e atualiza snapshot Stale-While-Revalidate
    await removeOutboxEntryInSW(entry.id);
    try {
      const cache = await caches.open(WORKOUT_DATA_CACHE_NAME);
      await cache.put(
        SYNTHETIC_WORKOUT_DATA_URL,
        new Response(JSON.stringify(bundleToSync), {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Sw-Cached-At': bundleToSync.updatedAt,
            'X-Cache-Strategy': 'Background-Sync-Confirmed',
          },
        })
      );
    } catch {}

    for (const client of clients) {
      client.postMessage({
        type: 'SW_BACKGROUND_SYNC_COMPLETED',
        userId: entry.userId,
        syncedAt: bundleToSync.updatedAt,
      });
    }
  }
}

/**
 * Limita o número de entradas em um cache para evitar uso excessivo de armazenamento no Android.
 */
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const excessCount = keys.length - maxItems;
      for (let i = 0; i < excessCount; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch {
    // Ignora erros de trim em segundo plano
  }
}

/**
 * Identifica se a requisição é um Recurso Estático (JS, CSS, Fontes, Imagens, Ícones, Manifest, /assets/*)
 * que deve ser servido com a estratégia 'Cache First'.
 */
function isStaticResourceRequest(request, url) {
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('@vite') ||
    url.searchParams.has('v') ||
    url.searchParams.has('t')
  ) {
    return false;
  }

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

  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    return true;
  }

  if (url.pathname === '/manifest.json' || url.pathname.startsWith('/assets/')) {
    return true;
  }

  return /\.(?:js|mjs|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|ico|avif|webmanifest)$/i.test(
    url.pathname
  );
}

/**
 * Identifica se a requisição é referente a Dados de Treino (Supabase REST GET, snapshots de treino,
 * endpoints JSON de rotinas/histórico/exercícios) que devem usar 'Stale-While-Revalidate'.
 */
function isWorkoutDataRequest(request, url) {
  if (request.headers.get('x-cache-strategy') === 'stale-while-revalidate') {
    return true;
  }

  // Endpoint sintético local de snapshot de dados de treino no Service Worker
  if (url.pathname.startsWith('/__sw_workout_data__/')) {
    return true;
  }

  // Consultas GET de dados de treino na tabela meutreino_sync do Supabase REST
  if (
    url.hostname.includes('supabase.co') &&
    url.pathname.includes('/rest/v1/meutreino_sync')
  ) {
    return true;
  }

  // Endpoints de API ou arquivos JSON de dados de treino (exceto manifest.json)
  if (
    url.pathname.startsWith('/api/workout') ||
    url.pathname.startsWith('/api/routines') ||
    url.pathname.startsWith('/api/sessions') ||
    url.pathname.startsWith('/api/exercises') ||
    (url.pathname.endsWith('.json') && url.pathname !== '/manifest.json')
  ) {
    return true;
  }

  return false;
}

/**
 * Estratégia 1: CACHE FIRST (para Recursos Estáticos)
 * Retorna imediatamente do cache se existir (zero latência de rede e economia de bateria).
 * Caso não esteja no cache, busca na rede, armazena no STATIC_CACHE_NAME e retorna.
 */
async function cacheFirstStaticResource(request, event) {
  const cache = await caches.open(STATIC_CACHE_NAME);

  // Tenta correspondência exata primeiro; se for recurso estático com query string, tenta ignoreSearch
  let cachedResponse = await cache.match(request);
  if (!cachedResponse) {
    cachedResponse = await cache.match(request, { ignoreSearch: true });
  }
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (
      networkResponse &&
      (networkResponse.status === 200 || networkResponse.type === 'opaque')
    ) {
      const responseClone = networkResponse.clone();
      const storePromise = cache
        .put(request, responseClone)
        .then(() => trimCache(STATIC_CACHE_NAME, MAX_STATIC_CACHE_ITEMS))
        .catch(() => {});
      if (event && typeof event.waitUntil === 'function') {
        event.waitUntil(storePromise);
      }
    }
    return networkResponse;
  } catch (err) {
    // Fallback offline para imagens/ícones
    if (request.destination === 'image') {
      const fallbackIcon =
        (await cache.match('/pwa-192x192.png')) ||
        (await cache.match('/icon.svg'));
      if (fallbackIcon) return fallbackIcon;
    }
    throw err;
  }
}

/**
 * Estratégia 2: STALE-WHILE-REVALIDATE (para Dados de Treino)
 * Entrega imediatamente os dados de treino do cache (Stale) para carregamento instantâneo e suporte offline,
 * enquanto dispara uma requisição em segundo plano (Revalidate) para atualizar o cache com os dados mais recentes.
 */
async function staleWhileRevalidateWorkoutData(request, event) {
  const cache = await caches.open(WORKOUT_DATA_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkRevalidatePromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        await cache.put(request, networkResponse.clone());
        await trimCache(WORKOUT_DATA_CACHE_NAME, MAX_WORKOUT_DATA_CACHE_ITEMS);

        // Notifica clientes ativos que os dados de treino foram revalidados em segundo plano
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        for (const client of clients) {
          client.postMessage({
            type: 'SW_WORKOUT_DATA_REVALIDATED',
            url: request.url,
            timestamp: Date.now(),
          });
        }
      }
      return networkResponse;
    })
    .catch(() => null);

  if (event && typeof event.waitUntil === 'function') {
    event.waitUntil(networkRevalidatePromise);
  }

  // Se houver resposta em cache (Stale), retorna imediatamente enquanto revalida em segundo plano
  if (cachedResponse) {
    return cachedResponse;
  }

  // Caso não haja cache prévio, aguarda a resposta de rede
  const freshResponse = await networkRevalidatePromise;
  if (freshResponse) {
    return freshResponse;
  }

  // Fallback para o último snapshot local de treinos salvo no Service Worker quando 100% offline
  const snapshotFallback = await cache.match(SYNTHETIC_WORKOUT_DATA_URL);
  if (snapshotFallback) {
    return snapshotFallback;
  }

  return new Response(
    JSON.stringify({
      offline: true,
      cached: false,
      strategy: 'stale-while-revalidate',
      message: 'Modo offline ativo — utilizando dados de treino locais do dispositivo.',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
}

/**
 * Estratégia 3: App Shell Navigation (HTML / SPA Routes)
 * Garante que a navegação principal funcione offline no Android (requisito obrigatório para instalação PWA/WebAPK).
 */
async function handleNavigationRequest(request, event) {
  const shellCache = await caches.open(APP_SHELL_CACHE_NAME);
  const staticCache = await caches.open(STATIC_CACHE_NAME);

  const cachedShell =
    (await shellCache.match('/index.html')) ||
    (await staticCache.match('/index.html')) ||
    (await staticCache.match('/'));

  const networkUpdatePromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const clone1 = networkResponse.clone();
        const clone2 = networkResponse.clone();
        await Promise.allSettled([
          shellCache.put('/index.html', clone1),
          staticCache.put('/index.html', clone2),
        ]);
      }
      return networkResponse;
    })
    .catch(() => null);

  if (cachedShell) {
    if (event && typeof event.waitUntil === 'function') {
      event.waitUntil(networkUpdatePromise);
    }
    return cachedShell;
  }

  const networkResponse = await networkUpdatePromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response(
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0d1424"><title>MeuTreino Pro — Offline</title></head><body style="background:#0d1424;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center"><div><h1>MeuTreino Pro ⚡</h1><p>Modo Offline Ativo. Recarregue a página para acessar suas fichas de treino salvas.</p></div></body></html>',
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

// 1. INSTALL: Faz o precache dos recursos estáticos essenciais e ativa imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) =>
        Promise.allSettled(
          PRECACHE_STATIC_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
          )
        )
      ),
      caches.open(APP_SHELL_CACHE_NAME).then((cache) =>
        cache.add(new Request('/index.html', { cache: 'reload' })).catch(() => null)
      ),
    ])
  );
});

// 2. ACTIVATE: Remove caches de versões antigas e assume controle imediato das abas abertas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => !ACTIVE_CACHES.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. FETCH: Roteamento entre Cache First (Recursos Estáticos) e Stale-While-Revalidate (Dados de Treino)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Intercepta apenas requisições GET HTTP/HTTPS
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // Ignora endpoints de autenticação, WebSockets/Realtime ou módulos não-empacotados de desenvolvimento Vite (/src/)
  if (
    url.pathname.includes('__vite') ||
    url.pathname.includes('@vite') ||
    url.pathname.includes('@react-refresh') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('/node_modules/') ||
    (url.hostname.includes('supabase.co') &&
      (url.pathname.includes('/auth/') || url.pathname.includes('/realtime/')))
  ) {
    return;
  }

  // A. Navegação de Página / App Shell (SPA)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(handleNavigationRequest(request, event));
    return;
  }

  // B. Dados de Treino -> Estratégia 'Stale-While-Revalidate'
  if (isWorkoutDataRequest(request, url)) {
    event.respondWith(staleWhileRevalidateWorkoutData(request, event));
    return;
  }

  // C. Recursos Estáticos (JS, CSS, Fontes, Ícones, Imagens, Manifest) -> Estratégia 'Cache First'
  if (isStaticResourceRequest(request, url)) {
    event.respondWith(cacheFirstStaticResource(request, event));
    return;
  }

  // D. Demais requisições GET de dados da aplicação -> 'Stale-While-Revalidate' no cache de treinos
  event.respondWith(staleWhileRevalidateWorkoutData(request, event));
});

// 4. BACKGROUND SYNC: Envia 'workoutLogs' e 'sessions' diretamente do Service Worker ao Supabase
// mesmo se o usuário tiver fechado o app prematuramente após o treino
self.addEventListener('sync', (event) => {
  if (
    event.tag === BACKGROUND_SYNC_TAG ||
    event.tag === CRITICAL_BACKGROUND_SYNC_TAG
  ) {
    event.waitUntil(flushOutboxDirectlyToSupabase());
  }
});

// 5. PUSH: Escuta eventos Push nativos de servidores WebPush caso configurados
self.addEventListener('push', (event) => {
  let payload = {
    title: 'MeuTreino Pro ⚡',
    body: 'Hora do seu treino! Mantenha a sobrecarga progressiva em dia 💪',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'meutreino-workout-reminder',
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
      data: { url: '/?action=start-workout' },
      actions: [
        { action: 'start-workout', title: '🏋️ Iniciar Treino' },
        { action: 'dismiss', title: 'Fechar' },
      ],
    })
  );
});

function checkHabitSchedule() {
  if (!activeHabitSchedule || !activeHabitSchedule.enabled) return;

  const now = new Date();
  const currentDay = now.getDay();
  if (
    !Array.isArray(activeHabitSchedule.days) ||
    !activeHabitSchedule.days.includes(currentDay)
  ) {
    return;
  }

  const currentH = now.getHours();
  const currentM = now.getMinutes();
  const currentMinutes = currentH * 60 + currentM;

  const times = activeHabitSchedule.times || ['18:00'];
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;

  if (!activeHabitSchedule.notifiedToday) {
    activeHabitSchedule.notifiedToday = {};
  }

  for (const timeStr of times) {
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    if (isNaN(h) || isNaN(m)) continue;

    const targetMinutes = h * 60 + m;
    const diff = currentMinutes - targetMinutes;

    const slotKey = `${todayKey}@${timeStr}`;
    if (diff >= 0 && diff <= 5 && !activeHabitSchedule.notifiedToday[slotKey]) {
      activeHabitSchedule.notifiedToday[slotKey] = true;

      const title = activeHabitSchedule.customTitle
        ? `${activeHabitSchedule.customTitle} • ${timeStr}`
        : `Hora do treino habitual ⚡ • ${timeStr}`;

      const body =
        activeHabitSchedule.customMessage ||
        'Detectamos que este é seu horário habitual de treino! Vamos manter a consistência e progredir as cargas 💪';

      self.registration.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `meutreino-habit-${slotKey}`,
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: '/?action=start-workout', time: timeStr },
        actions: [
          { action: 'start-workout', title: '🏋️ Iniciar Treino' },
          { action: 'dismiss', title: 'Agora não' },
        ],
      });
    }
  }
}

// 6. MESSAGE: Escuta mensagens da aplicação cliente com validação de origem (Same-Origin Policy)
self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;
  if (event.origin && event.origin !== self.location.origin) return;

  const { type, payload } = event.data;

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Armazena snapshot atualizado dos dados de treino no cache Stale-While-Revalidate do SW
  if (type === 'CACHE_WORKOUT_DATA_SNAPSHOT' && payload) {
    event.waitUntil(
      caches.open(WORKOUT_DATA_CACHE_NAME).then((cache) => {
        const response = new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Sw-Cached-At': new Date().toISOString(),
            'X-Cache-Strategy': 'Stale-While-Revalidate',
          },
        });
        return cache.put(SYNTHETIC_WORKOUT_DATA_URL, response);
      })
    );
    return;
  }

  // Enfileira pacote de 'workoutLogs' e 'sessions' no Outbox do Service Worker para Background Sync autônomo
  if (type === 'QUEUE_BACKGROUND_SYNC_OUTBOX' && payload) {
    event.waitUntil(saveOutboxEntryInSW(payload));
    return;
  }

  // Limpa pacote confirmado do Outbox do Service Worker
  if (type === 'CLEAR_BACKGROUND_SYNC_OUTBOX' && payload) {
    event.waitUntil(removeOutboxEntryInSW(payload.id));
    return;
  }

  // Disparo imediato de notificação push local
  if (type === 'SHOW_LOCAL_PUSH_NOTIFICATION') {
    const { title, body, tag, data } = payload || {};
    event.waitUntil(
      self.registration.showNotification(title || 'MeuTreino Pro ⚡', {
        body: body || 'Hora de treinar! 💪',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: tag || 'meutreino-local-push',
        renotify: true,
        vibrate: [200, 100, 200],
        data: data || { url: '/' },
        actions: [
          { action: 'start-workout', title: '🏋️ Ir para o Treino' },
          { action: 'dismiss', title: 'Agora não' },
        ],
      })
    );
  }

  // Agendamento com base no histórico de hábitos
  if (type === 'SYNC_HABIT_SCHEDULE') {
    activeHabitSchedule = payload;
    if (habitTimerInterval) clearInterval(habitTimerInterval);

    if (activeHabitSchedule && activeHabitSchedule.enabled) {
      checkHabitSchedule();
      habitTimerInterval = setInterval(checkHabitSchedule, 60000);
    }
  }

  // Suporte a Notification Triggers se disponível
  if (type === 'SCHEDULE_TIMESTAMP_NOTIFICATION') {
    const { title, body, timestamp, tag, data } = payload || {};
    if (timestamp && typeof self.registration.showNotification === 'function') {
      try {
        if ('showTrigger' in Notification.prototype || 'TimestampTrigger' in self) {
          /* global TimestampTrigger */
          self.registration.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: tag || 'meutreino-scheduled',
            showTrigger: new TimestampTrigger(timestamp),
            data: data || { url: '/' },
          });
        }
      } catch (err) {
        console.warn('[SW] TimestampTrigger não suportado nativamente:', err);
      }
    }
  }
});

// 7. NOTIFICATIONCLICK: Foca na aba do MeuTreino Pro e navega para o treino
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
          return self.clients.openWindow('/');
        }
      })
  );
});

