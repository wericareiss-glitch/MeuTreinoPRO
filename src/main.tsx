import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { I18nProvider } from './utils/i18n.tsx';
import { safeStorage } from './utils/storage.ts';
import './index.css';

// Registra Service Worker (/sw.js) com escopo raiz para suporte PWA offline nativo e instalação WebAPK no Android
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isDevHost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('ais-dev') ||
      window.location.port === '3000';

    if (isDevHost) {
      if ('caches' in window) {
        caches.keys().then((names) => names.forEach((name) => caches.delete(name))).catch(() => {});
      }
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => {});
      return;
    }

    if ('caches' in window) {
      caches
        .keys()
        .then((names) => {
          names.forEach((name) => {
            if (!name.includes('meutreino-sw-v6.0')) {
              caches.delete(name);
            }
          });
        })
        .catch(() => {});
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.update().catch(() => {});

        if (registration.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('meutreino:sw-update-available', { detail: { registration } }));
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('meutreino:sw-update-available', { detail: { registration } }));
            }
          });
        });
      })
      .catch(() => {
        // Ignora falhas silenciosamente em ambiente restrito
      });
  });
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Uncaught Error:', error, errorInfo);
    const msg = error?.message || '';
    if (
      typeof window !== 'undefined' &&
      (msg.includes("reading 'useState'") ||
        msg.includes('Invalid hook call') ||
        msg.includes('Failed to fetch dynamically imported module'))
    ) {
      const reloadKey = 'meutreino_vite_chunk_reload';
      const lastReload = Number(sessionStorage.getItem(reloadKey) || '0');
      if (Date.now() - lastReload > 10000) {
        sessionStorage.setItem(reloadKey, String(Date.now()));
        if (typeof window.caches !== 'undefined') {
          window.caches
            .keys()
            .then((names) => Promise.all(names.map((n) => window.caches.delete(n))))
            .finally(() => window.location.reload());
          return;
        }
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    safeStorage.remove('alex_active_user_id');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0f172a] border border-[#1e293b] rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-2xl font-black">
              ⚡
            </div>
            <h1 className="text-xl font-black text-white">Ops! Algo inesperado aconteceu</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ocorreu uma inconsistência temporária ao carregar a interface. Clique no botão abaixo para reiniciar o aplicativo com segurança.
            </p>
            {this.state.error && (
              <pre className="text-[10px] text-rose-300/80 bg-rose-950/40 p-2.5 rounded-xl overflow-x-auto text-left font-mono">
                {this.state.error.message}
              </pre>
            )}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Recarregar Página
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                Resetar Sessão & Abrir Início
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
