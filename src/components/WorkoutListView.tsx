import React from 'react';
import { Dumbbell, PlusCircle, Play, Trash2, Edit } from 'lucide-react';
import { GeneratedWorkoutRoutine, UserProfile } from '../types/workout';

interface WorkoutListViewProps {
  user: UserProfile;
  routines: GeneratedWorkoutRoutine[];
  activeRoutineId: string | null;
  onStartWorkout: (routine: GeneratedWorkoutRoutine) => void;
  onGoToProfileGenerator: () => void;
  onCreateManualWorkout: () => void;
  onEditRoutine: (routine: GeneratedWorkoutRoutine) => void;
  onDeleteRoutine: (routineId: string) => void;
}

export const WorkoutListView: React.FC<WorkoutListViewProps> = ({
  routines,
  onStartWorkout,
  onCreateManualWorkout,
  onEditRoutine,
  onDeleteRoutine,
}) => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">Rotinas Biomecânicas Disponíveis</h2>
          <p className="text-xs text-slate-400">Escolha o treino do dia para iniciar a execução e o cronômetro</p>
        </div>
        <button
          type="button"
          onClick={onCreateManualWorkout}
          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Criar Treino Personalizado</span>
        </button>
      </div>

      <div className="space-y-3">
        {routines.map((routine) => (
          <div
            key={routine.id}
            className="bg-[#101828] border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  {routine.letter}
                </span>
                <h3 className="text-base font-bold text-white tracking-tight">{routine.name}</h3>
              </div>
              <p className="text-xs text-slate-400">{routine.subtitle}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-mono">
                <span>{routine.items.length} exercícios programados</span>
                <span>•</span>
                <span>{routine.items.reduce((acc, it) => acc + it.sets, 0)} séries totais</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onStartWorkout(routine)}
                className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Iniciar Treino</span>
              </button>
              <button
                type="button"
                onClick={() => onEditRoutine(routine)}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Editar Treino"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteRoutine(routine.id)}
                className="p-3 rounded-2xl bg-rose-950/20 border border-rose-900/40 hover:bg-rose-950/40 text-rose-400 transition-colors cursor-pointer"
                title="Excluir Treino"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
