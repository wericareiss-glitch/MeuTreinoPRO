/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Bell, 
  Clock, 
  Minimize2, 
  Maximize2 
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { wakeLockManager } from '../utils/wakeLock';

interface RestTimerDockProps {
  initialSeconds: number;
  triggerKey: number; // Incrementing counter to reset & restart timer
  isMuted: boolean;
  onToggleMute: () => void;
}

export const RestTimerDock: React.FC<RestTimerDockProps> = ({
  initialSeconds,
  triggerKey,
  isMuted,
  onToggleMute,
}) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [totalTime, setTotalTime] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPip, setIsPip] = useState(false); // Ultra-mini floating pill
  const [hasStartedEver, setHasStartedEver] = useState(false);

  const prevTriggerRef = useRef(triggerKey);
  const endTimeRef = useRef<number | null>(null);
  const lastBeepSecRef = useRef<number | null>(null);
  const hasFinishedAlertedRef = useRef<boolean>(false);

  // Auto start or reset timer when triggerKey changes (e.g. set completed)
  useEffect(() => {
    if (triggerKey > 0 && triggerKey !== prevTriggerRef.current) {
      prevTriggerRef.current = triggerKey;
      setTimeLeft(initialSeconds);
      setTotalTime(initialSeconds);
      endTimeRef.current = Date.now() + initialSeconds * 1000;
      lastBeepSecRef.current = null;
      hasFinishedAlertedRef.current = false;
      setIsRunning(true);
      setHasStartedEver(true);
      setIsPip(false);
      soundManager.startBackgroundKeepAlive();
      wakeLockManager.request().catch(() => {});
    }
  }, [triggerKey, initialSeconds]);

  // Request notification permission once timer starts or mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch {
        // ignore
      }
    }
  }, []);

  // Gerenciamento de WakeLock e Áudio contínuo em background durante o descanso
  useEffect(() => {
    if (isRunning) {
      soundManager.startBackgroundKeepAlive();
      wakeLockManager.request().catch(() => {});
    } else {
      soundManager.stopBackgroundKeepAlive();
    }
  }, [isRunning]);

  const triggerCompletionAlert = () => {
    if (hasFinishedAlertedRef.current) return;
    hasFinishedAlertedRef.current = true;
    soundManager.playTimerFinish();
    soundManager.vibrate([300, 150, 300, 150, 500]);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('⏰ Descanso Concluído — MeuTreino Pro', {
          body: 'Seu tempo de descanso acabou! Hora da próxima série, foco!',
          tag: 'rest-timer-alert',
        });
      } catch (err) {
        console.warn('Erro ao disparar notificação:', err);
      }
    }
  };

  // Sync remaining time whenever the app wakes up (screen unlocked, tab visible, window focused)
  useEffect(() => {
    const syncTime = () => {
      if (isRunning && endTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          setIsRunning(false);
          endTimeRef.current = null;
          triggerCompletionAlert();
        }
      }
    };

    document.addEventListener('visibilitychange', syncTime);
    window.addEventListener('focus', syncTime);
    window.addEventListener('pageshow', syncTime);

    return () => {
      document.removeEventListener('visibilitychange', syncTime);
      window.removeEventListener('focus', syncTime);
      window.removeEventListener('pageshow', syncTime);
    };
  }, [isRunning]);

  // Timer countdown loop based on wall-clock time
  useEffect(() => {
    if (!isRunning) return;

    if (!endTimeRef.current) {
      endTimeRef.current = Date.now() + timeLeft * 1000;
      hasFinishedAlertedRef.current = false;
    }

    const interval = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setIsRunning(false);
        endTimeRef.current = null;
        triggerCompletionAlert();
      } else if (remaining <= 3 && remaining >= 1) {
        if (lastBeepSecRef.current !== remaining) {
          lastBeepSecRef.current = remaining;
          soundManager.playCountdownBeep(remaining);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  if (!hasStartedEver && !isRunning) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPercent = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  const handleAdjust = (delta: number) => {
    setTimeLeft((prev) => {
      const next = Math.max(5, prev + delta);
      setTotalTime((curr) => Math.max(curr, next));
      if (endTimeRef.current) {
        endTimeRef.current = Date.now() + next * 1000;
      }
      return next;
    });
  };

  const handlePreset = (secs: number) => {
    setTotalTime(secs);
    setTimeLeft(secs);
    endTimeRef.current = Date.now() + secs * 1000;
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    endTimeRef.current = null;
    setTimeLeft(totalTime);
  };

  const handleToggleRunning = () => {
    if (isRunning) {
      setIsRunning(false);
      endTimeRef.current = null;
    } else {
      endTimeRef.current = Date.now() + (timeLeft > 0 ? timeLeft : totalTime) * 1000;
      setIsRunning(true);
    }
  };

  // 1. MODO ULTRA-COMPACTO (Mini Pill / Pip Flutuante)
  if (isPip) {
    return (
      <div className="fixed bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 animate-fadeIn">
        <div className="bg-[#0b1220]/95 backdrop-blur-xl border border-sky-500/40 rounded-full px-3 py-1.5 shadow-2xl shadow-black/80 flex items-center gap-2 ring-1 ring-sky-400/20">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span className="text-xs font-mono font-black text-sky-400 tracking-tight">
            {formattedTime}
          </span>

          <button
            type="button"
            onClick={handleToggleRunning}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isRunning ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
            }`}
            title={isRunning ? 'Pausar' : 'Retomar'}
          >
            {isRunning ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsPip(false)}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Expandir barra"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRunning(false);
              setHasStartedEver(false);
            }}
            className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Fechar descanso"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // 2. MODO PADRÃO COMPACTO & RESPONSIVO (Capsule Moderna)
  return (
    <div className="fixed bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-auto min-w-[290px] max-w-[92vw] sm:max-w-md animate-fadeIn">
      <div className="bg-[#0b1220]/95 backdrop-blur-xl border border-sky-500/30 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/80 ring-1 ring-sky-400/20 transition-all">
        {/* Barra de Progresso Fina no Topo */}
        <div className="w-full h-1 bg-slate-800/90 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-300 ${
              timeLeft <= 5 ? 'bg-amber-400 animate-pulse' : 'bg-sky-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Linha Principal de Controle (Compacta & Espaçosa) */}
        <div className="flex items-center justify-between gap-2.5">
          {/* Esquerda: Indicador & Relógio */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 leading-none">
                Descanso
              </span>
              <span
                className={`text-lg sm:text-xl font-black font-mono tracking-tight tabular-nums leading-tight ${
                  timeLeft <= 5 ? 'text-amber-400 animate-pulse' : 'text-sky-300'
                }`}
              >
                {formattedTime}
              </span>
            </div>
          </div>

          {/* Centro / Ajustes Rápidos */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleAdjust(-15)}
              className="px-2 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-mono text-[11px] font-bold rounded-lg border border-slate-700 transition-colors active:scale-95 cursor-pointer"
              title="Menos 15s"
            >
              -15s
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(30)}
              className="px-2 py-1 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 font-mono text-[11px] font-bold rounded-lg border border-sky-500/30 transition-colors active:scale-95 cursor-pointer"
              title="Mais 30s"
            >
              +30s
            </button>
          </div>

          {/* Direita: Play/Pause, Expansão e Fechar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleRunning}
              className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 ${
                isRunning
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
              }`}
              title={isRunning ? 'Pausar Cronômetro' : 'Continuar Cronômetro'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            {/* Alternar Mini-Pip */}
            <button
              type="button"
              onClick={() => setIsPip(true)}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Minimizar para chip compacto"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>

            {/* Alternar Detalhes/Presets */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title={isExpanded ? 'Ocultar opções' : 'Mais opções e presets'}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            {/* Fechar Timer */}
            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setHasStartedEver(false);
              }}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 flex items-center justify-center transition-colors cursor-pointer"
              title="Fechar descanso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Linha Expandida: Presets e Configurações Secundárias */}
        {isExpanded && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-2 animate-fadeIn">
            {/* Presets de Tempo */}
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Presets:</span>
              <div className="flex items-center gap-1">
                {[30, 45, 60, 90, 120].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handlePreset(sec)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      totalTime === sec
                        ? 'bg-sky-500 text-slate-950 font-black'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Ações Secundárias (Reset, Mute, Notificações) */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                  title="Reiniciar tempo"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Reiniciar</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleMute}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                  title={isMuted ? 'Ativar som' : 'Silenciar'}
                >
                  {isMuted ? <VolumeX className="w-3 h-3 text-slate-500" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
                  <span>{isMuted ? 'Mudo' : 'Som'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    Notification.requestPermission();
                  }
                }}
                className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                title="Ativar alerta sonoro no bolso"
              >
                <Bell className="w-3 h-3 text-amber-400" />
                <span>Alerta no Bolso</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
