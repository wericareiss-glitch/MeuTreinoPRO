/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ListChildComponentProps } from 'react-window';
import { 
  Play, 
  Clock, 
  Layers, 
  Flame, 
  Pencil, 
  Trash2, 
  MoreVertical, 
  Share2, 
  GripVertical,
  Dumbbell 
} from 'lucide-react';
import { MUSCLE_NAMES } from '../../data/exerciseDatabase';
import { ActionSheet, ActionSheetItem } from '../common/ActionSheet';
import { 
  RoutineCardProps, 
  CarouselItemData, 
  areRoutineCardPropsEqual 
} from './types';

export const RoutineCard = React.memo<RoutineCardProps>(({
  entry,
  isActive,
  isMenuOpen,
  isConfirmingDelete,
  isDraggingThis,
  dragOffset,
  isHoldingThis,
  isDropTargetThis,
  canReorder,
  hasEditHandler,
  hasDeleteHandler,
  onToggleMenu,
  onCloseMenu,
  onRequestDeleteConfirm,
  onConfirmDelete,
  onStartWorkout,
  onEditRoutine,
  onShareRoutineClick,
  onPointerDownGrip,
  onCardDragStart,
  onCardDragOver,
  onCardDrop,
  onCardDragEnd,
}) => {
  const { routine, visualIdx } = entry;

  const formattedCreatedAt = useMemo(() => {
    if (!routine.createdAt) return null;
    try {
      return new Date(routine.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
    } catch {
      return null;
    }
  }, [routine.createdAt]);

  return (
    <div
      data-routine-card-index={visualIdx}
      draggable={Boolean(canReorder && isDraggingThis)}
      onDragStart={(e) => onCardDragStart(visualIdx, e)}
      onDragOver={(e) => onCardDragOver(visualIdx, e)}
      onDrop={(e) => onCardDrop(visualIdx, e)}
      onDragEnd={onCardDragEnd}
      style={{
        transform: isDraggingThis && dragOffset
          ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(1.025) rotate(-0.5deg)`
          : undefined,
        transition: isDraggingThis
          ? 'none'
          : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease',
        zIndex: isDraggingThis ? 50 : undefined,
      }}
      className={`p-4 sm:p-5 rounded-3xl border transition-all relative flex flex-col justify-between h-full ${
        isDraggingThis ? 'card-dragging' : ''
      } ${isDropTargetThis ? 'card-drop-target' : ''} ${
        isActive
          ? 'bg-gradient-to-br from-emerald-950/40 via-[#0d1627] to-slate-900 border-emerald-500/60 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-400/30'
          : 'bg-[#101828] border-[#1e2c45] hover:border-slate-700 shadow-lg'
      }`}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header do Card com Alça de Segurar e Arrastar + Menu de 3 Pontos */}
        <div className="flex items-start justify-between gap-2 mb-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {canReorder && (
              <button
                type="button"
                onPointerDown={(e) => onPointerDownGrip(visualIdx, e)}
                className={`drag-handle-touch touch-none select-none p-1.5 -ml-1 rounded-xl border cursor-grab active:cursor-grabbing shrink-0 transition-all ${
                  isDraggingThis
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 ring-2 ring-emerald-500/30 scale-105'
                    : isHoldingThis
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/70 ring-2 ring-amber-400/30 animate-pulse'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border-slate-800'
                }`}
                title="Mantenha pressionado e arraste para mover este card de treino"
                aria-label={`Mantenha pressionado e arraste ${routine.name}`}
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}

            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'bg-gradient-to-tr from-sky-500/20 to-teal-500/20 text-sky-300 border border-sky-500/30'
              }`}
            >
              {routine.letter}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-extrabold text-white tracking-tight truncate">
                  {routine.name}
                </h2>
                {routine.version && (
                  <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    v{routine.version}
                  </span>
                )}
                {routine.isCustom && (
                  <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-500/30">
                    Personalizado
                  </span>
                )}
                {formattedCreatedAt && (
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700/60">
                    {formattedCreatedAt}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">
                {routine.subtitle}
              </p>
            </div>
          </div>

          {/* Botão de 3 Pontos e Menu Dropdown */}
          <div className="relative shrink-0 flex items-center">
            {isActive && (
              <span className="mr-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40">
                ATIVO
              </span>
            )}

            <button
              type="button"
              onClick={() => onToggleMenu(routine.id)}
              className="w-9 h-9 rounded-xl bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-theme-muted hover:text-theme-heading flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              title="Mais opções da rotina"
              aria-label="Mais opções da rotina"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Página / Bottom Sheet de Opções da Rotina */}
            <ActionSheet
              isOpen={isMenuOpen}
              onClose={onCloseMenu}
              title={routine.name}
              subtitle={routine.subtitle || 'Ficha de Treino'}
              icon={<Dumbbell className="w-5 h-5 text-emerald-400" />}
              badge={isActive ? 'ATIVO' : undefined}
            >
              <ActionSheetItem
                onClick={() => {
                  onCloseMenu();
                  onStartWorkout(routine);
                }}
                icon={<Play className="w-5 h-5 fill-current" />}
                title={isActive ? 'Continuar Treino' : 'Iniciar Treino'}
                description={isActive ? 'Retomar treino em andamento' : 'Começar a registrar cargas e séries'}
                variant={isActive ? 'accent' : 'default'}
              />

              {hasEditHandler && onEditRoutine && (
                <ActionSheetItem
                  onClick={() => {
                    onCloseMenu();
                    onEditRoutine(routine);
                  }}
                  icon={<Pencil className="w-5 h-5" />}
                  title="Editar / Alterar Exercícios"
                  description="Adicionar, trocar ou reorganizar exercícios da ficha"
                />
              )}

              <ActionSheetItem
                onClick={() => {
                  onCloseMenu();
                  onShareRoutineClick(routine);
                }}
                icon={<Share2 className="w-5 h-5" />}
                title="Compartilhar Treino"
                description="Copiar lista de exercícios formatada para WhatsApp"
              />

              {hasDeleteHandler && (
                <div className="pt-2 mt-2 border-t border-theme-menu-subtle">
                  {isConfirmingDelete ? (
                    <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/30 space-y-2.5">
                      <span className="text-xs font-bold text-rose-400 block">
                        Tem certeza que deseja excluir esta ficha de treino?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onConfirmDelete(routine.id)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer text-center active:scale-95"
                        >
                          Sim, Excluir
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDeleteConfirm(null)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold menu-item-btn border border-theme-subtle bg-theme-surface transition-colors cursor-pointer text-center active:scale-95 text-theme-heading"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ActionSheetItem
                      onClick={() => onRequestDeleteConfirm(routine.id)}
                      icon={<Trash2 className="w-5 h-5" />}
                      title="Excluir Treino"
                      description="Remover permanentemente esta ficha de treino"
                      variant="danger"
                    />
                  )}
                </div>
              )}
            </ActionSheet>
          </div>
        </div>

        {/* Badges de Grupos Musculares */}
        <div className="flex flex-wrap gap-1 mb-2.5 shrink-0">
          {routine.muscleGroups.map((m) => (
            <span
              key={m}
              className="text-[10px] font-semibold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/60"
            >
              {MUSCLE_NAMES[m] || m}
            </span>
          ))}
        </div>

        {/* Informações de Séries & Tempo */}
        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono py-2 px-3 rounded-xl bg-[#0b1220] border border-slate-800/70 mb-2.5 shrink-0">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <strong className="text-white">{routine.items.length}</strong> {routine.items.length === 1 ? 'exercício' : 'exercícios'}
          </span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <strong className="text-white">{routine.totalSets}</strong> séries
          </span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            ~{routine.estimatedMinutes} min
          </span>
        </div>

        {/* Preview dos Exercícios */}
        <div className="flex-1 min-h-0 overflow-y-auto theme-scrollbar space-y-1 mb-3 pr-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
              Exercícios programados:
            </span>
            {hasEditHandler && onEditRoutine && (
              <button
                type="button"
                onClick={() => onEditRoutine(routine)}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <Pencil className="w-2.5 h-2.5" />
                <span>Alterar exercícios</span>
              </button>
            )}
          </div>
          {routine.items.slice(0, 6).map((it, idx) => (
            <div key={idx} className="text-xs text-slate-300 truncate flex items-center justify-between gap-1.5 py-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-slate-500 text-[10px]">•</span>
                <span className="font-medium text-slate-200 truncate">{it.exercise.name}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono shrink-0 font-bold tabular-nums">
                {it.sets}s × {it.reps}
              </span>
            </div>
          ))}
          {routine.items.length > 6 && (
            <div className="text-[11px] text-slate-500 italic pl-3">
              + mais {routine.items.length - 6} exercício(s)...
            </div>
          )}
        </div>
      </div>

      {/* Ações: Iniciar Treino + Editar/Alterar */}
      <div className="pt-2.5 border-t border-slate-800/60 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onStartWorkout(routine)}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.98] ${
            isActive
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 ring-2 ring-emerald-400/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
          }`}
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>{isActive ? 'Continuar Treino' : 'Iniciar Este Treino'}</span>
        </button>

        {hasEditHandler && onEditRoutine && (
          <button
            type="button"
            onClick={() => onEditRoutine(routine)}
            className="py-3 px-3 rounded-xl font-bold text-xs bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
            title="Editar treino, reordenar ou alterar exercícios"
          >
            <Pencil className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline">Editar</span>
          </button>
        )}
      </div>
    </div>
  );
}, areRoutineCardPropsEqual);

RoutineCard.displayName = 'RoutineCard';

export const HorizontalRoutineSlot = React.memo(({ index, style, data }: ListChildComponentProps<CarouselItemData>) => {
  const entry = data.entries[index];
  if (!entry) return null;

  return (
    <div style={style} className="pr-3 sm:pr-4 pt-1 pb-3">
      <RoutineCard
        entry={entry}
        isActive={data.activeRoutineId === entry.routine.id}
        isMenuOpen={data.openMenuId === entry.routine.id}
        isConfirmingDelete={data.confirmDeleteId === entry.routine.id}
        isDraggingThis={data.draggingIdx === entry.visualIdx}
        dragOffset={data.draggingIdx === entry.visualIdx ? data.dragOffset : undefined}
        isHoldingThis={data.holdingIdx === entry.visualIdx}
        isDropTargetThis={data.dropTargetIdx === entry.visualIdx && data.draggingIdx !== entry.visualIdx}
        canReorder={data.canReorder}
        hasEditHandler={data.hasEditHandler}
        hasDeleteHandler={data.hasDeleteHandler}
        onToggleMenu={data.onToggleMenu}
        onCloseMenu={data.onCloseMenu}
        onRequestDeleteConfirm={data.onRequestDeleteConfirm}
        onConfirmDelete={data.onConfirmDelete}
        onStartWorkout={data.onStartWorkout}
        onEditRoutine={data.onEditRoutine}
        onShareRoutineClick={data.onShareRoutineClick}
        onPointerDownGrip={data.onPointerDownGrip}
        onCardDragStart={data.onCardDragStart}
        onCardDragOver={data.onCardDragOver}
        onCardDrop={data.onCardDrop}
        onCardDragEnd={data.onCardDragEnd}
      />
    </div>
  );
});

HorizontalRoutineSlot.displayName = 'HorizontalRoutineSlot';
