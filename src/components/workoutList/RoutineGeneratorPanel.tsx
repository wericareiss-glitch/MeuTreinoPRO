/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dumbbell, 
  X, 
  Target, 
  Sliders, 
  Sparkles, 
  Check 
} from 'lucide-react';
import { 
  UserProfile,
  SplitOption,
  StrategyOption,
  LevelOption,
  EquipmentRequirement,
  FocusOption,
  PeriodizationStrategy,
  PERIODIZATION_PHASES
} from '../../types/workout';
import { WorkoutConfig } from '../WorkoutConfig';

export interface RoutineGeneratorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  routinesCount: number;
  split: SplitOption;
  setSplit: (s: SplitOption) => void;
  strategy: StrategyOption;
  setStrategy: (s: StrategyOption) => void;
  weeklyBudget: number;
  setWeeklyBudget: (b: number) => void;
  level: LevelOption;
  setLevel: (l: LevelOption) => void;
  equip: EquipmentRequirement;
  setEquip: (e: EquipmentRequirement) => void;
  restSeconds: number;
  setRestSeconds: (s: number) => void;
  periodizationStrategy?: PeriodizationStrategy;
  setPeriodizationStrategy?: (p: PeriodizationStrategy) => void;
  onOpenVolumeBudget?: () => void;
  onExecuteGenerate: (focus: FocusOption, frequency: number) => void;
  genSuccess: boolean;
}

export const RoutineGeneratorPanel: React.FC<RoutineGeneratorPanelProps> = ({
  isOpen,
  onClose,
  user,
  routinesCount,
  split,
  setSplit,
  weeklyBudget,
  setWeeklyBudget,
  level,
  setLevel,
  equip,
  setEquip,
  restSeconds,
  setRestSeconds,
  periodizationStrategy = 'hypertrophy',
  setPeriodizationStrategy,
  onOpenVolumeBudget,
  onExecuteGenerate,
  genSuccess,
}) => {
  const [userFocus, setUserFocus] = useState<FocusOption>(user.focus || 'v_taper');
  const [userFrequency, setUserFrequency] = useState<number>(user.frequency || 4);

  useEffect(() => {
    setUserFocus(user.focus || 'v_taper');
    setUserFrequency(user.frequency || 4);
  }, [user.id, user.focus, user.frequency]);

  const activeMusclesCount = useMemo(() => {
    if (!user.muscleBudgets) return 11;
    return Object.values(user.muscleBudgets).filter((sets) => (sets ?? 0) > 0).length;
  }, [user.muscleBudgets]);

  const excludedMusclesCount = useMemo(() => {
    if (!user.muscleBudgets) return 0;
    return Object.values(user.muscleBudgets).filter((sets) => (sets ?? 0) === 0).length;
  }, [user.muscleBudgets]);

  if (!isOpen) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-800/80 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Dumbbell className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-white">
                Geração & Personalização de Treinos
              </h2>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Científico
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Ajuste divisão, volume, foco e equipamentos para gerar sua rotina personalizada
            </p>
          </div>
        </div>

        {routinesCount > 0 && (
          <button
            type="button"
            onClick={onClose}
            className="self-end sm:self-center px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Minimizar</span>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Seletores rápidos do Atleta: Frequência e Foco */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3.5">
        <div className="bg-[#0a101d] border border-slate-800 rounded-xl p-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Frequência Semanal
          </span>
          <select
            value={userFrequency}
            onChange={(e) => setUserFrequency(parseInt(e.target.value, 10))}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value={1}>1x por semana</option>
            <option value={2}>2x por semana</option>
            <option value={3}>3x por semana</option>
            <option value={4}>4x por semana</option>
            <option value={5}>5x por semana</option>
            <option value={6}>6x por semana</option>
          </select>
        </div>

        <div className="bg-[#0a101d] border border-slate-800 rounded-xl p-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Foco do Treino
          </span>
          <select
            value={userFocus}
            onChange={(e) => setUserFocus(e.target.value as FocusOption)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="v_taper">🔱 Shape em V</option>
            <option value="glutes">🍑 Glúteos & Pernas</option>
            <option value="strength">🏋️ Força & Cargas</option>
            <option value="balanced">⚖️ Equilíbrio</option>
          </select>
        </div>
      </div>

      {/* Meta de Repetições / Periodização Científica */}
      <div className="bg-[#0a101d] border border-slate-800 rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Meta de Reps (Periodização)
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            {PERIODIZATION_PHASES[periodizationStrategy]?.repBadge || '8-12 reps'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPeriodizationStrategy?.('strength')}
            className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
              periodizationStrategy === 'strength'
                ? 'bg-amber-500/15 border-amber-400/80 text-white shadow-sm shadow-amber-500/20'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs">🏋️</span>
              <span className="text-xs font-black truncate">Força</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-amber-300">3-5 reps</div>
            <div className="text-[9px] text-slate-400">Cargas pesadas</div>
          </button>

          <button
            type="button"
            onClick={() => setPeriodizationStrategy?.('hypertrophy')}
            className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
              periodizationStrategy === 'hypertrophy'
                ? 'bg-emerald-500/15 border-emerald-400/80 text-white shadow-sm shadow-emerald-500/20'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs">⚡</span>
              <span className="text-xs font-black truncate">Hipertrofia</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-emerald-300">8-12 reps</div>
            <div className="text-[9px] text-slate-400">Ganho de massa</div>
          </button>

          <button
            type="button"
            onClick={() => setPeriodizationStrategy?.('metabolic')}
            className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
              periodizationStrategy === 'metabolic'
                ? 'bg-teal-500/15 border-teal-400/80 text-white shadow-sm shadow-teal-500/20'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs">🔥</span>
              <span className="text-xs font-black truncate">Resistência</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-teal-300">15+ reps</div>
            <div className="text-[9px] text-slate-400">Mais repetições</div>
          </button>
        </div>
      </div>

      {/* Metas de Séries Semanais por Músculo & Exclusão */}
      <div className="bg-[#0a101d] border border-slate-800 rounded-2xl p-3 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Meta de Séries Semanais por Músculo
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-300 font-bold">
                {weeklyBudget} séries/sem
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold text-[11px]">
                {activeMusclesCount} músculos ativos
              </span>
              {excludedMusclesCount > 0 ? (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-rose-400 font-bold text-[11px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    {excludedMusclesCount} músculo{excludedMusclesCount > 1 ? 's' : ''} excluído{excludedMusclesCount > 1 ? 's' : ''} (0 séries)
                  </span>
                </>
              ) : (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400 text-[11px]">Nenhum músculo excluído</span>
                </>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              A geração se baseia estritamente nas metas semanais. Músculos com 0 séries são excluídos do treino.
            </p>
          </div>

          {onOpenVolumeBudget && (
            <button
              type="button"
              onClick={onOpenVolumeBudget}
              className="self-start sm:self-center px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Ajustar Séries & Excluir Músculo</span>
            </button>
          )}
        </div>
      </div>

      {/* Configuração de Treino */}
      <div className="mb-3">
        <WorkoutConfig
          split={split}
          setSplit={setSplit}
          weeklyBudget={weeklyBudget}
          setWeeklyBudget={setWeeklyBudget}
          level={level}
          setLevel={setLevel}
          equip={equip}
          setEquip={setEquip}
          restSeconds={restSeconds}
          setRestSeconds={setRestSeconds}
        />
      </div>

      {/* Botão de Ação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => onExecuteGenerate(userFocus, userFrequency)}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
          <span>Gerar / Atualizar Treinos da Semana</span>
        </button>

        {genSuccess && (
          <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/40 px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Treinos gerados com sucesso!</span>
          </div>
        )}
      </div>
    </div>
  );
};
