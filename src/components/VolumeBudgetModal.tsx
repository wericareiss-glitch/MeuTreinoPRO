import React from 'react';
import { X, Sliders } from 'lucide-react';
import { MuscleGroup } from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';

interface VolumeBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyBudget: number;
  muscleBudgets: Record<MuscleGroup, number>;
  onSaveBudgets: (total: number, budgets: Record<MuscleGroup, number>) => void;
}

export const VolumeBudgetModal: React.FC<VolumeBudgetModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Orçamento de Volume Semanal</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {Object.entries(MUSCLE_NAMES).map(([mKey, mName]) => (
            <div key={mKey} className="p-3 rounded-2xl bg-[#0b1220] border border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-white">{mName}</span>
              <span className="font-mono text-emerald-400 font-bold">12-16 séries/sem</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
