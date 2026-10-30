/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Sparkles, ShieldAlert, CheckCircle2, Flame, Beef, Wheat, Droplets } from 'lucide-react';
import { UserProfile, WorkoutSessionSummary } from '../types/workout';
import { checkDeloadRecommendation } from '../utils/deloadChecker';
import { calculateTargetMacros } from '../utils/nutritionCalculator';

interface NutritionAndRecoveryViewProps {
  user: UserProfile;
  sessions: WorkoutSessionSummary[];
}

export const NutritionAndRecoveryView: React.FC<NutritionAndRecoveryViewProps> = ({ user, sessions }) => {
  const deloadInfo = useMemo(() => checkDeloadRecommendation(sessions, user), [sessions, user]);
  const macros = useMemo(() => calculateTargetMacros(user), [user]);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Alerta de Deload / Recuperação */}
      <div className={`p-5 rounded-3xl border shadow-xl ${
        deloadInfo.shouldDeload 
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
          : 'bg-[#0f172a]/95 border-slate-800 text-slate-200'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          {deloadInfo.shouldDeload ? (
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          )}
          <div>
            <h2 className="text-base font-extrabold text-white">
              {deloadInfo.shouldDeload ? '⚠️ Alerta de Fadiga: Semana de Deload Recomendada' : '🛡️ Estado de Recuperação Ótimo'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {deloadInfo.reason}
            </p>
          </div>
        </div>
      </div>

      {/* Meta Nutricional & Macronutrientes */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Plano Nutricional & Macros (Hipertrofia)
            </h2>
            <p className="text-xs text-slate-400">
              Metas diárias ajustadas para o seu peso atual ({user.weightKg} kg)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Calorias Alvo</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">{macros.calories}</span>
            <span className="text-[10px] text-slate-500 block">kcal / dia</span>
          </div>

          <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-center gap-1">
              <Beef className="w-3.5 h-3.5 text-emerald-400" />
              <span>Proteínas</span>
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">{macros.proteinGrams}g</span>
            <span className="text-[10px] text-slate-500 block">2.2g por kg</span>
          </div>

          <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-center gap-1">
              <Wheat className="w-3.5 h-3.5 text-sky-400" />
              <span>Carboidratos</span>
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-sky-400">{macros.carbsGrams}g</span>
            <span className="text-[10px] text-slate-500 block">Energia para treino</span>
          </div>

          <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-rose-400" />
              <span>Gorduras</span>
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-rose-400">{macros.fatGrams}g</span>
            <span className="text-[10px] text-slate-500 block">1.0g por kg</span>
          </div>
        </div>
      </div>
    </div>
  );
};