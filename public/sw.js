/**
 * Service Worker — MeuTreino Pro
 * Suporte a Notificações Locais via Push & Web Notification API
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// OBRIGATÓRIO PARA O ANDROID: O Service Worker precisa interceptar fetch 
// para que o navegador reconheça o app como um PWA instalável válido.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // Fallback básico caso esteja offline
      return caches.match(event.request);
    })
  );
});

// Escuta eventos Push nativos caso acionados
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

// Escuta mensagens da aplicação para disparo imediato ou agendado de Push Local
self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;

  if (event.data.type === 'SHOW_LOCAL_PUSH_NOTIFICATION') {
    const { title, body, tag, data } = event.data.payload || {};
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
});

// Ao clicar na notificação, foca na aba do MeuTreino Pro e navega para o treino
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
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