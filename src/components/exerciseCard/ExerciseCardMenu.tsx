/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Plus,
  Minus,
  RefreshCw,
  Flame,
  TrendingUp,
  Trash2,
  Dumbbell,
} from 'lucide-react';
import { Exercise } from '../../types/workout';
import { MUSCLE_NAMES } from '../../data/exerciseDatabase';
import { ActionSheet, ActionSheetItem } from '../common/ActionSheet';

interface ExerciseCardMenuProps {
  index: number;
  exercise: Exercise;
  setsCount: number;
  firstSetWeight: string;
  onCloseMenu: () => void;
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number) => void;
  onOpenSwap: (index: number) => void;
  onOpenWarmup: (name: string, targetWeight: string) => void;
  onDeleteExercise?: (index: number) => void;
  onOpenAnalytics?: (exerciseName: string) => void;
}

export const ExerciseCardMenu: React.FC<ExerciseCardMenuProps> = ({
  index,
  exercise,
  setsCount,
  firstSetWeight,
  onCloseMenu,
  onAddSet,
  onRemoveSet,
  onOpenSwap,
  onOpenWarmup,
  onDeleteExercise,
  onOpenAnalytics,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <ActionSheet
      isOpen={true}
      onClose={onCloseMenu}
      title={exercise.name}
      subtitle={`${(exercise.muscleKey && MUSCLE_NAMES[exercise.muscleKey]) || exercise.category || 'Exercício'} · ${setsCount} séries configuradas`}
      icon={<Dumbbell className="w-5 h-5 text-emerald-400" />}
    >
      {/* 1. Adicionar Série */}
      <ActionSheetItem
        onClick={() => {
          onCloseMenu();
          onAddSet(index);
        }}
        icon={<Plus className="w-5 h-5 stroke-[2.5]" />}
        title="Adicionar Série"
        description={`Criar nova série de execução (#${setsCount + 1})`}
        badge={`+${setsCount + 1}`}
      />

      {/* 2. Remover Última Série */}
      {setsCount > 1 && (
        <ActionSheetItem
          onClick={() => {
            onCloseMenu();
            onRemoveSet(index);
          }}
          icon={<Minus className="w-5 h-5 stroke-[2.5]" />}
          title="Remover Última Série"
          description={`Excluir série #${setsCount}`}
          badge={`-${setsCount}`}
        />
      )}

      {/* 3. Trocar Exercício */}
      <ActionSheetItem
        onClick={() => {
          onCloseMenu();
          onOpenSwap(index);
        }}
        icon={<RefreshCw className="w-5 h-5" />}
        title="Substituir Exercício"
        description="Trocar por outra variação ou equipamento compatível"
      />

      {/* 4. Aquecimento Inteligente */}
      <ActionSheetItem
        onClick={() => {
          onCloseMenu();
          onOpenWarmup(exercise.name, firstSetWeight);
        }}
        icon={<Flame className="w-5 h-5 text-amber-400" />}
        title="Aquecimento Inteligente"
        description="Calcular pirâmide e séries preparatórias com base na carga"
      />

      {/* 5. Gráficos & Histórico */}
      {onOpenAnalytics && (
        <ActionSheetItem
          onClick={() => {
            onCloseMenu();
            onOpenAnalytics(exercise.name);
          }}
          icon={<TrendingUp className="w-5 h-5 text-sky-400" />}
          title="Gráficos & Histórico de Cargas"
          description="Evolução de peso e estimativa de 1RM neste exercício"
        />
      )}

      {/* 6. Remover do Treino */}
      {onDeleteExercise && (
        <div className="pt-2 mt-2 border-t border-theme-menu-subtle">
          {isDeleting ? (
            <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/30 space-y-2.5">
              <span className="text-xs font-bold text-rose-400 block">
                Tem certeza que deseja excluir &ldquo;{exercise.name}&rdquo; do treino?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleting(false);
                    onCloseMenu();
                    onDeleteExercise(index);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer text-center active:scale-95"
                >
                  Sim, Excluir
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleting(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold menu-item-btn border border-theme-subtle bg-theme-surface transition-colors cursor-pointer text-center active:scale-95 text-theme-heading"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <ActionSheetItem
              onClick={() => setIsDeleting(true)}
              icon={<Trash2 className="w-5 h-5" />}
              title="Remover do Treino"
              description="Excluir este exercício desta sessão de treino"
              variant="danger"
            />
          )}
        </div>
      )}
    </ActionSheet>
  );
};
