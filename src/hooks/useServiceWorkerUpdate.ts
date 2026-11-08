import { useEffect, useState, useCallback, useRef } from 'react';

export interface ServiceWorkerUpdateState {
  hasUpdate: boolean;
  isUpdating: boolean;
  applyUpdate: () => void;
  dismissUpdate: () => void;
  checkForUpdates: () => Promise<void>;
}

export function useServiceWorkerUpdate(): ServiceWorkerUpdateState {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const applyUpdate = useCallback(() => {
    setIsUpdating(true);

    const onControllerChange = () => {
      window.location.reload();
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange, { once: true });

      if (waitingWorkerRef.current) {
        waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
      } else if (registrationRef.current?.waiting) {
        registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        // Fallback caso o worker já tenha ativado
        window.location.reload();
      }

      // Timeout de segurança para recarregar caso o evento controllerchange atrase
      setTimeout(() => {
        window.location.reload();
      }, 1800);
    } else {
      window.location.reload();
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setHasUpdate(false);
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        registrationRef.current = reg;
        if (reg.waiting) {
          waitingWorkerRef.current = reg.waiting;
          setHasUpdate(true);
        } else {
          await reg.update();
        }
      }
    } catch {
      // Ignora erros de rede na checagem
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshHandler = () => {};

    navigator.serviceWorker.ready
      .then((registration) => {
        registrationRef.current = registration;

        // Se já houver um worker em espera (ex: baixado em background)
        if (registration.waiting) {
          waitingWorkerRef.current = registration.waiting;
          setHasUpdate(true);
        }

        // Observa novas versões sendo baixadas
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // Quando a nova versão terminar de baixar os arquivos e o usuário já tiver o app aberto
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorkerRef.current = newWorker;
              setHasUpdate(true);
            }
          });
        });

        // Evento customizado opcional caso disparado por outros módulos
        window.addEventListener('meutreino:sw-update-available', () => {
          setHasUpdate(true);
        });
      })
      .catch(() => {});

    // Checagem periódica e em eventos de visibilidade do app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    const handleOnline = () => {
      checkForUpdates();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    // Checa por atualizações a cada 20 minutos
    const interval = setInterval(checkForUpdates, 20 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  return {
    hasUpdate,
    isUpdating,
    applyUpdate,
    dismissUpdate,
    checkForUpdates,
  };
}
