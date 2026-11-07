/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';

export interface WorkoutFooterActionsProps {
  onFinishSession: () => void;
  onDiscardSession: () => void;
}

export const WorkoutFooterActions: React.FC<WorkoutFooterActionsProps> = ({
  onFinishSession,
  onDiscardSession,
}) => {
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-[#090d19] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
      <button
        type="button"
        onClick={onFinishSession}
        className="w-full sm:flex-1 py-3.5 px-5 rounded-xl font-black text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
      >
        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
        <span>Concluir & Salvar Treino</span>
      </button>

      {isConfirmingCancel ? (
        <div className="w-full sm:w-auto flex items-center justify-between gap-2 bg-slate-900 border border-rose-500/40 p-1.5 rounded-xl animate-fadeIn">
          <span className="text-xs text-rose-300 font-bold px-1.5">Descartar treino?</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsConfirmingCancel(false);
                onDiscardSession();
              }}
              className="py-2 px-3 rounded-lg font-black text-xs bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-all shadow-md active:scale-95"
            >
              Sim, Cancelar
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingCancel(false)}
              className="py-2 px-2.5 rounded-lg font-bold text-xs bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsConfirmingCancel(true)}
          className="w-full sm:w-auto py-3.5 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Cancelar Treino</span>
        </button>
      )}
    </div>
  );
};
