/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Sparkles, 
  PlusCircle, 
  Zap, 
  Search, 
  X, 
  History, 
  Target, 
  ChevronDown,
  LayoutGrid,
  GalleryHorizontal 
} from 'lucide-react';
import { 
  UserProfile,
  SplitOption,
  StrategyOption,
  LevelOption,
  EquipmentRequirement,
  FocusOption,
  PeriodizationStrategy
} from '../../types/workout';
import { VersionFilterMode, RoutineViewMode } from './types';
import { RoutineGeneratorPanel } from './RoutineGeneratorPanel';

export interface RoutineListHeaderProps {
  user: UserProfile;
  routinesCount: number;
  isGeneratorOpen: boolean;
  onToggleGenerator: () => void;
  onGenerateQuickWorkout?: () => void;
  onCreateManualWorkout?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  versionFilter: VersionFilterMode;
  setVersionFilter: (filter: VersionFilterMode) => void;
  viewMode: RoutineViewMode;
  onToggleViewMode: (mode: RoutineViewMode) => void;
  hasCustomRoutines: boolean;
  activeCardIdx: number;
  onScrollToActiveRoutine: () => void;
  filteredCount: number;

  // Generator panel props
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

export const RoutineListHeader: React.FC<RoutineListHeaderProps> = ({
  user,
  routinesCount,
  isGeneratorOpen,
  onToggleGenerator,
  onGenerateQuickWorkout,
  onCreateManualWorkout,
  searchQuery,
  setSearchQuery,
  versionFilter,
  setVersionFilter,
  viewMode,
  onToggleViewMode,
  hasCustomRoutines,
  activeCardIdx,
  onScrollToActiveRoutine,
  filteredCount,
  split,
  setSplit,
  strategy,
  setStrategy,
  weeklyBudget,
  setWeeklyBudget,
  level,
  setLevel,
  equip,
  setEquip,
  restSeconds,
  setRestSeconds,
  periodizationStrategy,
  setPeriodizationStrategy,
  onOpenVolumeBudget,
  onExecuteGenerate,
  genSuccess,
}) => {
  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-[#101828] border border-[#1e2c45] shadow-xl relative overflow-hidden w-full max-w-full min-w-0">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              Rotinas da Semana ({routinesCount}) · {user.frequency || 4}x por semana
            </span>
            <span className="text-[10px] font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
              {user.focus === 'glutes' 
                ? '🍑 Foco Glúteos' 
                : user.focus === 'strength' 
                ? '🏋️ Foco Força' 
                : user.focus === 'v_taper' 
                ? '🔱 Foco Shape em V' 
                : '⚖️ Foco Equilíbrio'}
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
            Seus Treinos & Rotinas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Deslize para o lado para navegar pelos treinos da semana sem precisar rolar a página.
          </p>
        </div>

        {/* Quick Creation Actions */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center shrink-0">
          {onGenerateQuickWorkout && (
            <button
              type="button"
              onClick={onGenerateQuickWorkout}
              className="py-2.5 px-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              title="Gera um treino aleatório e equilibrado de corpo inteiro"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>⚡ Treino Rápido</span>
            </button>
          )}

          {onCreateManualWorkout && (
            <button
              type="button"
              onClick={onCreateManualWorkout}
              className="py-2.5 px-3 rounded-xl text-xs font-bold bg-[#142036] hover:bg-[#1a2b4a] text-emerald-300 border border-emerald-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Novo Treino</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleGenerator}
            className={`py-2.5 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 ${
              isGeneratorOpen
                ? 'bg-emerald-500 text-slate-950 border border-emerald-400 shadow-emerald-500/25'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
            }`}
            title="Personalizar divisões, séries, descanso e gerar treinos científicos"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>{isGeneratorOpen ? 'Fechar Gerador' : 'Personalizar & Gerar'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isGeneratorOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Painel expansível de geração */}
      <RoutineGeneratorPanel
        isOpen={isGeneratorOpen}
        onClose={onToggleGenerator}
        user={user}
        routinesCount={routinesCount}
        split={split}
        setSplit={setSplit}
        strategy={strategy}
        setStrategy={setStrategy}
        weeklyBudget={weeklyBudget}
        setWeeklyBudget={setWeeklyBudget}
        level={level}
        setLevel={setLevel}
        equip={equip}
        setEquip={setEquip}
        restSeconds={restSeconds}
        setRestSeconds={setRestSeconds}
        periodizationStrategy={periodizationStrategy}
        setPeriodizationStrategy={setPeriodizationStrategy}
        onOpenVolumeBudget={onOpenVolumeBudget}
        onExecuteGenerate={onExecuteGenerate}
        genSuccess={genSuccess}
      />

      {/* Barra de Busca e Filtros de Versão */}
      {routinesCount > 1 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, divisão (A/B/C), versão (v1, v2), músculo ou exercício..."
              className="w-full bg-[#0a101d] border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setVersionFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 border ${
                  versionFilter === 'all'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <History className="w-3 h-3" />
                <span>Todas ({routinesCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setVersionFilter('latest')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border ${
                  versionFilter === 'latest'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Exibe apenas a versão mais recente de cada treino A/B/C"
              >
                Últimas Versões
              </button>

              {hasCustomRoutines && (
                <button
                  type="button"
                  onClick={() => setVersionFilter('custom')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border ${
                    versionFilter === 'custom'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Personalizados
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Seletor de Modo de Visualização */}
              <div className="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => onToggleViewMode('grid')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Exibir todos os treinos em grade vertical"
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>Grade</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleViewMode('carousel')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'carousel'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Exibir treinos em carrossel horizontal deslizável"
                >
                  <GalleryHorizontal className="w-3 h-3" />
                  <span>Carrossel</span>
                </button>
              </div>

              {activeCardIdx >= 0 && (
                <button
                  type="button"
                  onClick={onScrollToActiveRoutine}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Centralizar o treino ativo"
                >
                  <Target className="w-3 h-3" />
                  <span>Ir ao Ativo</span>
                </button>
              )}

              <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                <strong className="text-slate-300">{filteredCount}</strong> de {routinesCount}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
