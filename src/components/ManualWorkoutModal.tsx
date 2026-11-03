import React from 'react';
import { X, Dumbbell } from 'lucide-react';
import { GeneratedWorkoutRoutine } from '../types/workout';

interface ManualWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRoutine: (r: GeneratedWorkoutRoutine) => void;
  editingRoutine: GeneratedWorkoutRoutine | null;
  existingRoutinesCount: number;
}

export const ManualWorkoutModal: React.FC<ManualWorkoutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Criar Treino Personalizado</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-400">Utilize o painel de perfil para gerar rotinas biomecânicas automáticas ajustadas ao seu nível e divisão preferida.</p>
      </div>
    </div>
  );
};
