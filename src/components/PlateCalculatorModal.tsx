import React, { useState } from 'react';
import { X, Disc } from 'lucide-react';

interface PlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({ isOpen, onClose }) => {
  const [targetWeight, setTargetWeight] = useState<number>(80);
  const [barWeight, setBarWeight] = useState<number>(20);

  if (!isOpen) return null;

  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1];
  const weightPerSide = Math.max(0, (targetWeight - barWeight) / 2);

  const plateCounts: Record<number, number> = {};
  let remainder = weightPerSide;

  availablePlates.forEach((plate) => {
    if (remainder >= plate) {
      const count = Math.floor(remainder / plate);
      plateCounts[plate] = count;
      remainder = parseFloat((remainder - count * plate).toFixed(2));
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Disc className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Calculadora de Anilhas</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Carga Alvo (kg)</label>
              <input
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0b1220] border border-slate-700 rounded-xl p-2.5 text-center text-sm font-mono font-bold text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Peso da Barra (kg)</label>
              <input
                type="number"
                value={barWeight}
                onChange={(e) => setBarWeight(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0b1220] border border-slate-700 rounded-xl p-2.5 text-center text-sm font-mono font-bold text-white"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b1220] border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Por Cada Lado da Barra:</span>
            <div className="text-2xl font-mono font-black text-emerald-400">{weightPerSide} kg</div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
              {Object.entries(plateCounts).map(([plate, count]) => (
                <span key={plate} className="px-2.5 py-1 rounded-xl bg-slate-800 text-xs font-mono font-bold text-white border border-slate-700">
                  {count}x {plate}kg
                </span>
              ))}
              {Object.keys(plateCounts).length === 0 && (
                <span className="text-xs text-slate-500">Apenas a barra ou peso inferior a 1kg por lado.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
