import React from 'react';
import { X, Award, Share2 } from 'lucide-react';
import { WorkoutSessionSummary } from '../types/workout';

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: WorkoutSessionSummary | null;
  athleteName: string;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({ isOpen, onClose, session, athleteName }) => {
  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Resumo da Sessão Concluída</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-[#0b1220] border border-slate-800 space-y-2">
            <div className="font-bold text-emerald-400 text-sm">Parabéns, {athleteName}! 🎉</div>
            <div className="text-slate-300">Divisão: <strong>{session.splitName}</strong></div>
            <div className="text-slate-300">Total de Séries: <strong>{session.totalSets}</strong></div>
            <div className="text-slate-300">Volume Total Tonelagem: <strong className="text-emerald-300">{session.totalVolumeLoadKg.toLocaleString()} kg</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
