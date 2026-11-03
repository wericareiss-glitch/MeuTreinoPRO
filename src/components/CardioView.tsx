import React, { useState } from 'react';
import { Timer, Navigation, Flame, Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react';
import { UserProfile, CardioSession } from '../types/workout';
import { safeStorage } from '../utils/storage';

interface CardioViewProps {
  user: UserProfile;
  onCardioStateChange?: (isRunning: boolean) => void;
}

export const CardioView: React.FC<CardioViewProps> = ({ user, onCardioStateChange }) => {
  const storageKey = `mtp_cardio_history_${user.id}`;
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [distance, setDistance] = useState(0);
  const [calories, setCalories] = useState(0);
  const [history, setHistory] = useState<CardioSession[]>(() => safeStorage.get(storageKey, []));

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    if (onCardioStateChange) onCardioStateChange(isRunning);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, onCardioStateChange]);

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (seconds < 10) {
      alert('Sessão muito curta!');
      return;
    }
    const sess: CardioSession = {
      id: `cardio_${Date.now()}`,
      date: new Date().toISOString(),
      durationSeconds: seconds,
      type: 'esteira',
      distanceKm: distance,
      calories: calories || Math.round(seconds * 0.1),
      intensity: 'moderado',
    };
    const updated = [sess, ...history];
    setHistory(updated);
    safeStorage.set(storageKey, updated);
    setIsRunning(false);
    setSeconds(0);
    setDistance(0);
    setCalories(0);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="bg-[#101828] border border-slate-800 rounded-3xl p-6 shadow-xl text-center space-y-6">
        <h2 className="text-lg font-black text-white">Cronômetro de Cardio</h2>
        <div className="font-mono text-6xl font-black text-emerald-400">{formatTime(seconds)}</div>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Distância (km)</label>
            <input
              type="number"
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#0b1220] border border-slate-700 rounded-xl p-2.5 text-center text-white font-mono font-bold"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Calorias (kcal)</label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-[#0b1220] border border-slate-700 rounded-xl p-2.5 text-center text-white font-mono font-bold"
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          {!isRunning ? (
            <button
              type="button"
              onClick={() => setIsRunning(true)}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsRunning(false)}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pausar</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Salvar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRunning(false);
              setSeconds(0);
            }}
            className="p-3 rounded-2xl bg-slate-800 text-slate-300 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
