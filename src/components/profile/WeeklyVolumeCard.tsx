/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sliders } from 'lucide-react';
import { UserProfile } from '../../types/workout';
import { ALL_MUSCLE_GROUPS } from '../../utils/auth';
import { MUSCLE_NAMES } from '../../data/exerciseDatabase';
import { useI18n } from '../../utils/i18n';

export interface WeeklyVolumeCardProps {
  user: UserProfile;
  onOpenVolumeBudget: () => void;
}

export const WeeklyVolumeCard: React.FC<WeeklyVolumeCardProps> = ({
  user,
  onOpenVolumeBudget,
}) => {
  const { t } = useI18n();

  return (
    <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              {t.budgetSectionTitle}
            </h2>
            <p className="text-xs text-slate-400">
              {t.budgetSectionSubtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenVolumeBudget}
          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <Sliders className="w-4 h-4" />
          <span>{t.budgetAdjustBtn}</span>
        </button>
      </div>

      {/* Total Budget KPI */}
      <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t.budgetCeilingLabel}
          </span>
          <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
            {user.weeklyBudget || 90} <span className="text-sm font-normal text-slate-400">{t.seriesLabel} / semana</span>
          </span>
        </div>

        <div className="text-xs text-slate-300 bg-[#101828] px-4 py-2.5 rounded-xl border border-slate-800 max-w-sm">
          <span className="text-emerald-400 font-bold block mb-0.5">Capacidade Recuperativa Adaptativa</span>
          Volume distribuído matematicamente entre os 11 grupos musculares para hipertrofia sem sobretreino.
        </div>
      </div>

      {/* 11 Muscle groups distribution breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {ALL_MUSCLE_GROUPS.map((m) => {
          const targetSets = user.muscleBudgets?.[m] || 8;
          const pct = user.weeklyBudget > 0 ? Math.round((targetSets / user.weeklyBudget) * 100) : 0;
          const muscleName = t.muscles[m] || MUSCLE_NAMES[m];

          return (
            <div
              key={m}
              className="bg-[#0a101d] p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-200 truncate">
                  {muscleName}
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {targetSets}s
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, pct * 4)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
