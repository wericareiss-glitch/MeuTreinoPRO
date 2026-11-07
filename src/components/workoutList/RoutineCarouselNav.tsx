/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RoutineVisualEntry } from './types';

export interface RoutineCarouselNavProps {
  entries: RoutineVisualEntry[];
  currentVisibleIdx: number;
  activeRoutineId: string | null;
  onSelectIndex: (idx: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const RoutineCarouselNav: React.FC<RoutineCarouselNavProps> = ({
  entries,
  currentVisibleIdx,
  activeRoutineId,
  onSelectIndex,
  onPrev,
  onNext,
}) => {
  if (entries.length <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-1.5 overflow-x-auto theme-scrollbar py-1 pr-2">
        {entries.map((entry, idx) => {
          const isCurrent = idx === currentVisibleIdx;
          const isActiveRoutine = entry.routine.id === activeRoutineId;
          return (
            <button
              key={entry.routine.id}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                isCurrent
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : isActiveRoutine
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                  : 'bg-[#101828] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span className="font-black">{entry.routine.letter}</span>
              <span className="max-w-[96px] truncate font-semibold opacity-90">
                {entry.routine.name.replace(/^Treino\s+[A-Z]\s*[-–—]?\s*/i, '') || entry.routine.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentVisibleIdx <= 0}
          className="w-9 h-9 rounded-xl bg-[#101828] hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Treino anterior"
          title="Treino anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono font-bold text-slate-400 px-1 tabular-nums">
          {Math.min(currentVisibleIdx + 1, entries.length)}/{entries.length}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={currentVisibleIdx >= entries.length - 1}
          className="w-9 h-9 rounded-xl bg-[#101828] hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Próximo treino"
          title="Próximo treino"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
