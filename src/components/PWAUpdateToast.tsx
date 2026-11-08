import React from 'react';
import { Sparkles, RefreshCw, X, ArrowUpCircle } from 'lucide-react';
import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate';

export const PWAUpdateToast: React.FC = () => {
  const { hasUpdate, isUpdating, applyUpdate, dismissUpdate } = useServiceWorkerUpdate();

  if (!hasUpdate) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-slideUp"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/98 to-slate-950/98 border border-emerald-500/40 p-4 shadow-2xl shadow-emerald-500/15 backdrop-blur-xl text-slate-100">
        {/* Glow indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500 animate-pulse" />

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white tracking-wide">
                Nova Versão Disponível
              </h4>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              O MeuTreino Pro foi atualizado com novas melhorias e otimizações de performance.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={applyUpdate}
                disabled={isUpdating}
                className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-75"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Carregando...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>Atualizar Agora</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={dismissUpdate}
                disabled={isUpdating}
                className="py-2 px-3 rounded-xl font-bold text-xs bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              >
                Depois
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissUpdate}
            aria-label="Fechar notificação"
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
