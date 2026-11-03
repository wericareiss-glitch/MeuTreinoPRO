import React from 'react';
import { X, Flame } from 'lucide-react';

interface WarmupModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  initialWeight: string;
}

export const WarmupModal: React.FC<WarmupModalProps> = ({ isOpen, onClose, exerciseName, initialWeight }) => {
  if (!isOpen) return null;

  const target = parseFloat(initialWeight) || 60;
  const w1 = Math.round(target * 0.5);
  const w2 = Math.round(target * 0.75);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Aquecimento Específico</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <p className="font-semibold text-white">Exercício: {exerciseName} (Carga Alvo: {target} kg)</p>
          <div className="p-3 rounded-2xl bg-[#0b1220] border border-slate-800 space-y-1">
            <strong>Série 1 (Ativação - 50%):</strong> {w1} kg × 5 repetições (Descanso: 45s)
          </div>
          <div className="p-3 rounded-2xl bg-[#0b1220] border border-slate-800 space-y-1">
            <strong>Série 2 (Aproximação - 75%):</strong> {w2} kg × 3 repetições (Descanso: 60s)
          </div>
        </div>
      </div>
    </div>
  );
};
