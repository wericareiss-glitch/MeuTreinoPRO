import React from 'react';
import { X, TrendingUp } from 'lucide-react';
import { WorkoutSessionSummary } from '../types/workout';

interface ExerciseAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: WorkoutSessionSummary[];
  initialExerciseName?: string;
}

export const ExerciseAnalyticsModal: React.FC<ExerciseAnalyticsModalProps> = ({ isOpen, onClose, sessions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Evolução de Cargas & 1RM</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          {sessions.length === 0 ? (
            <div className="text-center py-10 text-slate-500">Nenhum treino registrado para gerar gráficos analíticos.</div>
          ) : (
            <div>Total de sessões analisadas: {sessions.length}</div>
          )}
        </div>
      </div>
    </div>
  );
};
