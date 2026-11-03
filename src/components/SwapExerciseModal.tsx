import React from 'react';
import { X, RefreshCw } from 'lucide-react';
import { Exercise } from '../types/workout';
import { EXERCISE_DATABASE, MUSCLE_NAMES } from '../data/exerciseDatabase';

interface SwapExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItemIndex: number | null;
  currentExerciseId: string;
  muscleKey: string;
  equipmentFilter: string;
  onSelectExercise: (index: number, newEx: Exercise) => void;
}

export const SwapExerciseModal: React.FC<SwapExerciseModalProps> = ({
  isOpen,
  onClose,
  targetItemIndex,
  muscleKey,
  onSelectExercise,
}) => {
  if (!isOpen || targetItemIndex === null) return null;

  const pool = EXERCISE_DATABASE[muscleKey as keyof typeof EXERCISE_DATABASE] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Substituir Exercício ({MUSCLE_NAMES[muscleKey as keyof typeof MUSCLE_NAMES]})</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-2 flex-1">
          {pool.map((ex) => (
            <div
              key={ex.id}
              onClick={() => {
                onSelectExercise(targetItemIndex, ex);
                onClose();
              }}
              className="p-3 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all"
            >
              <div className="text-xs font-bold text-white">{ex.name}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Perfil: {ex.profile} • Estabilidade: {ex.stability}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
