import React from 'react';
import { Dumbbell, Activity, TrendingUp, Calendar, CheckCircle2, Award, ArrowRight, Camera } from 'lucide-react';
import { UserProfile, WorkoutSessionSummary, MuscleGroup } from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';

interface HomeViewProps {
  user: UserProfile | null;
  sessions: WorkoutSessionSummary[];
  completedSetsByMuscle: Record<MuscleGroup, number>;
  activeWorkoutMuscles: string[];
  totalSetsInWorkout: number;
  totalCompletedSetsInWorkout: number;
  workoutNotes: string;
  onUpdateWorkoutNotes: (notes: string) => void;
  onOpenVolumeBudget: () => void;
  onGoToWorkout: () => void;
  onViewSummary: (session: WorkoutSessionSummary) => void;
  onOpenAnalytics: () => void;
  onOpenMeasurements: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  sessions,
  completedSetsByMuscle,
  onGoToWorkout,
  onViewSummary,
  onOpenAnalytics,
  onOpenMeasurements,
}) => {
  const totalVolumeKg = sessions.reduce((acc, s) => acc + s.totalVolumeLoadKg, 0);

  return (
    <div className="space-y-6">
      {/* Atleta Welcome Card */}
      <div className="bg-gradient-to-r from-[#101828] via-[#132038] to-[#101828] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Atleta Pró
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {user?.weightKg} kg • {user?.heightM}m • {user?.level === 'advanced' ? 'Avançado' : 'Intermediário'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Olá, {user?.name || 'Atleta'}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Pronto para mais uma sessão de hipertrofia com base em cinesiologia e sobrecarga progressiva?
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGoToWorkout}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Dumbbell className="w-4 h-4 stroke-[2.5]" />
              <span>Iniciar Treino</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPIs & Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#101828] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Treinos Realizados</span>
          </div>
          <div className="text-2xl font-mono font-black text-white">{sessions.length}</div>
          <span className="text-[10px] text-slate-500">sessões concluídas</span>
        </div>
        <div className="bg-[#101828] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Award className="w-4 h-4 text-sky-400" />
            <span>Volume Total</span>
          </div>
          <div className="text-2xl font-mono font-black text-white">{(totalVolumeKg / 1000).toFixed(1)}t</div>
          <span className="text-[10px] text-slate-500">tonelagem acumulada</span>
        </div>
        <div className="bg-[#101828] border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/40 transition-colors" onClick={onOpenAnalytics}>
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span>Evolução de Cargas</span>
          </div>
          <div className="text-sm font-bold text-teal-300 mt-2">Ver Gráficos ↗</div>
          <span className="text-[10px] text-slate-500">curvas de 1RM</span>
        </div>
        <div className="bg-[#101828] border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-purple-500/40 transition-colors" onClick={onOpenMeasurements}>
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Camera className="w-4 h-4 text-purple-400" />
            <span>Check-in Corporal</span>
          </div>
          <div className="text-sm font-bold text-purple-300 mt-2">Fotos & Medidas ↗</div>
          <span className="text-[10px] text-slate-500">evolução física</span>
        </div>
      </div>

      {/* Volume Semanal por Músculo */}
      <div className="bg-[#101828] border border-slate-800 rounded-3xl p-5 shadow-xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Volume Semanal por Grupo Muscular (Séries Concluídas)</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.entries(MUSCLE_NAMES).map(([mKey, mName]) => {
            const count = completedSetsByMuscle[mKey as MuscleGroup] || 0;
            return (
              <div key={mKey} className="bg-[#0b1220] border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300 block">{mName}</span>
                  <span className="text-[10px] text-slate-500">meta: 12-16s</span>
                </div>
                <span className="font-mono font-black text-base text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                  {count}s
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico Recente */}
      <div className="bg-[#101828] border border-slate-800 rounded-3xl p-5 shadow-xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <span>Sessões Recentes</span>
        </h2>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Nenhum treino concluído ainda. Conclua sua primeira sessão para visualizar o histórico aqui!
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.slice(0, 5).map((sess) => (
              <div
                key={sess.id}
                onClick={() => onViewSummary(sess)}
                className="p-3.5 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-sky-400 font-mono">{sess.splitName}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(sess.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <span className="text-xs text-slate-300 font-medium">
                    {sess.completedExercises.length} exercícios • {sess.totalSets} séries
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs font-black text-emerald-400 block">{sess.totalVolumeLoadKg.toLocaleString()} kg</span>
                  <span className="text-[10px] text-slate-500">tonelagem</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
