import React from 'react';
import { User, Dumbbell, Download, Upload, LogOut, Sliders, Calendar } from 'lucide-react';
import { UserProfile, SplitOption, StrategyOption, LevelOption, EquipmentRequirement } from '../types/workout';

interface ProfileViewProps {
  user: UserProfile;
  sessions: any[];
  onUpdateUser: (u: UserProfile) => void;
  onLogout: () => void;
  onOpenVolumeBudget: () => void;
  onOpenPlateCalc: () => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onViewSummary: (s: any) => void;
  onClearHistory: () => void;
  split: SplitOption;
  setSplit: (s: SplitOption) => void;
  strategy: StrategyOption;
  setStrategy: (st: StrategyOption) => void;
  exercisesPerMuscle: 1 | 2;
  setExercisesPerMuscle: (n: 1 | 2) => void;
  weeklyBudget: number;
  setWeeklyBudget: (b: number) => void;
  equip: EquipmentRequirement;
  setEquip: (eq: EquipmentRequirement) => void;
  restSeconds: number;
  setRestSeconds: (r: number) => void;
  onGenerateRoutines: () => void;
  onGoToWorkoutTab: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onLogout,
  onOpenVolumeBudget,
  onOpenPlateCalc,
  onExportBackup,
  onImportBackup,
  split,
  setSplit,
  exercisesPerMuscle,
  setExercisesPerMuscle,
  weeklyBudget,
  setWeeklyBudget,
  equip,
  setEquip,
  restSeconds,
  setRestSeconds,
  onGenerateRoutines,
  onGoToWorkoutTab,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Profile Header Card */}
      <div className="bg-[#101828] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">{user.name}</h2>
            <p className="text-xs text-slate-400 font-mono">@{user.username} • {user.weightKg} kg • {user.heightM}m</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onAuxClick={onLogout}
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl bg-rose-950/30 border border-rose-900/50 hover:bg-rose-950/50 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </div>

      {/* Configurações de Geração de Treino */}
      <div className="bg-[#101828] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Parâmetros Biomecânicos & Prescrição</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Divisão de Treino (Split)</label>
            <select
              value={split}
              onChange={(e) => setSplit(e.target.value as SplitOption)}
              className="w-full bg-[#0b1220] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold cursor-pointer"
            >
              <option value="upper">Superior (Upper)</option>
              <option value="lower">Inferior (Lower)</option>
              <option value="fullbody">Full Body Completo</option>
              <option value="push">Push (Peito/Ombro/Tríceps)</option>
              <option value="pull">Pull (Costas/Bíceps)</option>
              <option value="legs">Legs (Pernas)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Exercícios por Músculo</label>
            <select
              value={exercisesPerMuscle}
              onChange={(e) => setExercisesPerMuscle(parseInt(e.target.value, 10) as 1 | 2)}
              className="w-full bg-[#0b1220] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold cursor-pointer"
            >
              <option value={1}>1 Exercício (Principal)</option>
              <option value={2}>2 Exercícios (Base + Complementar)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Equipamentos Disponíveis</label>
            <select
              value={equip}
              onChange={(e) => setEquip(e.target.value as EquipmentRequirement)}
              className="w-full bg-[#0b1220] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold cursor-pointer"
            >
              <option value="full_gym">Academia Completa (Máquinas + Polias)</option>
              <option value="cables_free">Polias + Pesos Livres</option>
              <option value="dumbbells_only">Apenas Halteres / Banco</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Descanso Padrão (Segundos)</label>
            <input
              type="number"
              step="15"
              value={restSeconds}
              onChange={(e) => setRestSeconds(parseInt(e.target.value, 10) || 90)}
              className="w-full bg-[#0b1220] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono font-bold text-center"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onGenerateRoutines();
            onGoToWorkoutTab();
          }}
          className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Dumbbell className="w-4 h-4 stroke-[2.5]" />
          <span>Gerar e Salvar Nova Rotina Biomecânica</span>
        </button>
      </div>

      {/* Ferramentas & Backup */}
      <div className="bg-[#101828] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-sky-400" />
          <span>Ferramentas & Dados</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={onOpenPlateCalc}
            className="p-3.5 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-sky-500/40 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Calculadora de Anilhas</span>
          </button>
          <button
            type="button"
            onClick={onExportBackup}
            className="p-3.5 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Backup (.json)</span>
          </button>
          <label className="p-3.5 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-sky-500/40 text-xs font-bold text-sky-300 flex items-center justify-center gap-2 transition-all cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Restaurar Backup</span>
            <input type="file" accept=".json" onChange={onImportBackup} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
