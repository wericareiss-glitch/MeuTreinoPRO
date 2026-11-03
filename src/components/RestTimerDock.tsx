import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface RestTimerDockProps {
  initialSeconds: number;
  triggerKey: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const RestTimerDock: React.FC<RestTimerDockProps> = ({
  initialSeconds,
  triggerKey,
  isMuted,
  onToggleMute,
}) => {
  const [seconds, setSeconds] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  useEffect(() => {
    if (triggerKey > 0) {
      setSeconds(initialSeconds);
      setIsRunning(true);
    }
  }, [triggerKey, initialSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval!);
            setIsRunning(false);
            soundManager.playCelebration();
            soundManager.vibrate([200, 100, 200, 100, 400]);
            return 0;
          }
          if (prev <= 4) {
            soundManager.playBeep(440, 0.1);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, seconds]);

  const formatTime = (total: number) => {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const adjust = (delta: number) => {
    setSeconds((curr) => Math.max(0, curr + delta));
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-lg bg-[#0d1526]/95 border border-slate-700/80 backdrop-blur-md rounded-2xl p-3 shadow-2xl z-50 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descanso Ativo</span>
          <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400 tracking-wider">
            {formatTime(seconds)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => adjust(-15)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
        >
          -15s
        </button>
        <button
          type="button"
          onClick={() => adjust(30)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
        >
          +30s
        </button>
        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
            isRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRunning(false);
            setSeconds(initialSeconds);
          }}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
          title="Resetar"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            isMuted ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
