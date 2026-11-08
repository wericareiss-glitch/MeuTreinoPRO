/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { FixedSizeList as List, ListOnItemsRenderedProps } from 'react-window';
import { 
  GeneratedWorkoutRoutine, 
  FocusOption
} from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { soundManager } from '../utils/audio';
import { authStorage, getPresetWeights, scaleWeightsToBudget } from '../utils/auth';
import { safeStorage } from '../utils/storage';
import { 
  WorkoutListViewProps, 
  RoutineVisualEntry, 
  VersionFilterMode, 
  RoutineViewMode,
  CarouselItemData,
  HorizontalRoutineSlot,
  RoutineCard,
  RoutineListHeader,
  RoutineCarouselNav,
  RoutineEmptyState
} from './workoutList';

export const WorkoutListView: React.FC<WorkoutListViewProps> = ({
  user,
  routines,
  activeRoutineId,
  initialViewMode,
  onStartWorkout,
  onCreateManualWorkout,
  onGenerateQuickWorkout,
  onEditRoutine,
  onDeleteRoutine,
  onShareRoutine,
  onReorderRoutines,
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
  onGenerateRoutines,
  onUpdateUser,
  periodizationStrategy = 'hypertrophy',
  setPeriodizationStrategy,
  onOpenVolumeBudget,
}) => {
  const listRef = useRef<List<CarouselItemData>>(null);
  const outerListRef = useRef<HTMLDivElement>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [holdingIdx, setHoldingIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [versionFilter, setVersionFilter] = useState<VersionFilterMode>('all');
  const [viewMode, setViewMode] = useState<RoutineViewMode>(() =>
    safeStorage.get<RoutineViewMode>('meutreino_routines_view_mode', initialViewMode || 'grid')
  );
  const [containerWidth, setContainerWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? Math.min(896, Math.max(320, window.innerWidth - 32)) : 360
  );
  const [currentVisibleIdx, setCurrentVisibleIdx] = useState<number>(0);

  const handleToggleViewMode = useCallback((mode: RoutineViewMode) => {
    setViewMode(mode);
    safeStorage.set('meutreino_routines_view_mode', mode);
    soundManager.vibrate(10);
  }, []);

  // Painel de Geração & Personalização de Treinos
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(() => routines.length === 0);
  const [genSuccess, setGenSuccess] = useState(false);

  // Mede dinamicamente a largura do container do carrossel horizontal
  useEffect(() => {
    const el = carouselContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const nextWidth = el.clientWidth;
      if (nextWidth > 0) {
        setContainerWidth(nextWidth);
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, [routines.length]);

  const handleShareClick = useCallback((routine: GeneratedWorkoutRoutine) => {
    if (onShareRoutine) {
      onShareRoutine(routine);
    } else {
      const lines = [
        `🏋️ *${routine.name}* (${routine.subtitle})`,
        `Frequência: ${user.frequency || 4}x/sem · Total: ${routine.totalSets} séries`,
        '',
        'Exercícios:',
      ];
      routine.items.forEach((it, idx) => {
        lines.push(`${idx + 1}. *${it.exercise.name}* (${MUSCLE_NAMES[it.muscleKey] || it.muscleKey}) — ${it.sets}×${it.reps}`);
      });
      const text = lines.join('\n');
      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({ title: routine.name, text }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
      }
    }
  }, [onShareRoutine, user.frequency]);

  // Ordem natural dos treinos cadastrados ou gerados (A, B, C, D...)
  const sortedEntries = useMemo<RoutineVisualEntry[]>(() => {
    return routines.map((routine, idx) => ({
      routine,
      visualIdx: idx,
    }));
  }, [routines]);

  // Filtra por modo de versão + busca textual e re-indexa visualIdx para alinhamento 1:1
  const filteredEntries = useMemo<RoutineVisualEntry[]>(() => {
    let baseEntries = sortedEntries;

    if (versionFilter === 'latest') {
      // Identifica a versão mais alta de cada letra de treino para exibir apenas as mais recentes
      const latestVersionByLetter = new Map<string, number>();
      routines.forEach((r) => {
        const letterKey = (r.letter || 'A').toUpperCase();
        const curMax = latestVersionByLetter.get(letterKey) || 0;
        const v = r.version || 1;
        if (v > curMax) {
          latestVersionByLetter.set(letterKey, v);
        }
      });

      const latestRoutineIds = new Set<string>();
      routines.forEach((r) => {
        const letterKey = (r.letter || 'A').toUpperCase();
        const maxV = latestVersionByLetter.get(letterKey) || 1;
        if ((r.version || 1) === maxV || r.id === activeRoutineId) {
          latestRoutineIds.add(r.id);
        }
      });

      baseEntries = sortedEntries.filter(({ routine }) => latestRoutineIds.has(routine.id));
    } else if (versionFilter === 'custom') {
      baseEntries = sortedEntries.filter(({ routine }) => Boolean(routine.isCustom));
    }

    const q = searchQuery.trim().toLowerCase();
    const finalFiltered = !q
      ? baseEntries
      : baseEntries.filter(({ routine }) => {
          if (routine.name.toLowerCase().includes(q)) return true;
          if (routine.subtitle.toLowerCase().includes(q)) return true;
          if (routine.letter.toLowerCase().includes(q)) return true;
          if (routine.version && `v${routine.version}`.includes(q)) return true;
          return routine.items.some(
            (it) =>
              it.exercise.name.toLowerCase().includes(q) ||
              (MUSCLE_NAMES[it.muscleKey] || it.muscleKey).toLowerCase().includes(q)
          );
        });

    return finalFiltered.map((entry, idx) => ({
      routine: entry.routine,
      visualIdx: idx,
    }));
  }, [sortedEntries, routines, versionFilter, activeRoutineId, searchQuery]);

  // Calcula largura responsiva de cada card no carrossel horizontal
  const itemWidth = useMemo(() => {
    if (filteredEntries.length === 1) {
      return Math.min(containerWidth, 520);
    }
    if (containerWidth < 640) {
      return Math.max(276, containerWidth - 28);
    }
    if (containerWidth < 860) {
      return Math.floor(containerWidth * 0.64);
    }
    return Math.floor(containerWidth / 2);
  }, [containerWidth, filteredEntries.length]);

  const carouselHeight = 438;

  // Índice do card onde está o treino ativo no carrossel
  const activeCardIdx = useMemo<number>(() => {
    if (!activeRoutineId) return -1;
    return filteredEntries.findIndex((entry) => entry.routine.id === activeRoutineId);
  }, [filteredEntries, activeRoutineId]);

  const scrollToRoutineIndex = useCallback(
    (targetIdx: number) => {
      const clampedIdx = Math.max(0, Math.min(filteredEntries.length - 1, targetIdx));
      setCurrentVisibleIdx(clampedIdx);
      if (outerListRef.current) {
        const targetLeft = Math.max(0, clampedIdx * itemWidth - (containerWidth - itemWidth) / 2);
        outerListRef.current.scrollTo({
          left: targetLeft,
          behavior: 'smooth',
        });
      } else {
        listRef.current?.scrollToItem(clampedIdx, 'center');
      }
    },
    [filteredEntries.length, itemWidth, containerWidth]
  );

  const handleExecuteGenerate = useCallback((focus: FocusOption, frequency: number) => {
    if (onUpdateUser) {
      const currentBudgets = user.muscleBudgets;
      const updated = authStorage.updateProfile(user.id, {
        gender: user.gender || 'male',
        focus,
        frequency,
        level,
        preferredSplit: split,
        weeklyBudget,
        muscleBudgets: currentBudgets && Object.keys(currentBudgets).length > 0
          ? currentBudgets
          : scaleWeightsToBudget(getPresetWeights(focus), weeklyBudget),
        periodizationStrategy,
      });
      if (updated) {
        onUpdateUser(updated);
      }
    }
    onGenerateRoutines();
    soundManager.playCelebration();
    soundManager.vibrate([20, 50, 40]);
    setGenSuccess(true);
    setTimeout(() => {
      setGenSuccess(false);
      setIsGeneratorOpen(false);
      scrollToRoutineIndex(0);
    }, 1800);
  }, [
    user.id,
    user.gender,
    user.muscleBudgets,
    level,
    split,
    weeklyBudget,
    periodizationStrategy,
    onUpdateUser,
    onGenerateRoutines,
    scrollToRoutineIndex,
  ]);

  const handleScrollToActiveRoutine = useCallback(() => {
    if (activeCardIdx < 0) return;
    scrollToRoutineIndex(activeCardIdx);
  }, [activeCardIdx, scrollToRoutineIndex]);

  const handlePrevCard = useCallback(() => {
    scrollToRoutineIndex(currentVisibleIdx - 1);
  }, [currentVisibleIdx, scrollToRoutineIndex]);

  const handleNextCard = useCallback(() => {
    scrollToRoutineIndex(currentVisibleIdx + 1);
  }, [currentVisibleIdx, scrollToRoutineIndex]);

  const handleItemsRendered = useCallback(({ visibleStartIndex }: ListOnItemsRenderedProps) => {
    setCurrentVisibleIdx(visibleStartIndex);
  }, []);

  const handleReorderVisualCards = useCallback(
    (fromVisualIdx: number, toVisualIdx: number) => {
      if (fromVisualIdx === toVisualIdx || !onReorderRoutines) return;
      const fromRoutine = filteredEntries[fromVisualIdx]?.routine;
      const toRoutine = filteredEntries[toVisualIdx]?.routine;
      if (!fromRoutine || !toRoutine) return;

      const fromOriginalIdx = routines.findIndex((r) => r.id === fromRoutine.id);
      const toOriginalIdx = routines.findIndex((r) => r.id === toRoutine.id);

      if (fromOriginalIdx >= 0 && toOriginalIdx >= 0 && fromOriginalIdx !== toOriginalIdx) {
        onReorderRoutines(fromOriginalIdx, toOriginalIdx);
        soundManager.vibrate(25);
      }
    },
    [filteredEntries, routines, onReorderRoutines]
  );

  // Pointer Hold-and-Drag on Routine Card Grip Handle (600ms hold delay)
  const HOLD_TO_DRAG_DELAY_MS = 600;
  const HOLD_MOVE_TOLERANCE_PX = 10;

  const handlePointerDownRoutineHandle = useCallback(
    (startVisualIdx: number, e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      let dragUnlocked = false;
      let latestTarget = startVisualIdx;

      setHoldingIdx(startVisualIdx);

      const holdTimer = window.setTimeout(() => {
        dragUnlocked = true;
        setHoldingIdx(null);
        setDraggingIdx(startVisualIdx);
        setDropTargetIdx(startVisualIdx);
        soundManager.vibrate([20, 35, 25]);
      }, HOLD_TO_DRAG_DELAY_MS);

      const cleanupListeners = () => {
        window.clearTimeout(holdTimer);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      const handlePointerMove = (moveEvt: PointerEvent) => {
        if (!dragUnlocked) {
          const dist = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY);
          if (dist > HOLD_MOVE_TOLERANCE_PX) {
            cleanupListeners();
            setHoldingIdx(null);
          }
          return;
        }

        if (moveEvt.cancelable) {
          moveEvt.preventDefault();
        }

        const viewportW = window.innerWidth;
        if (moveEvt.clientX < 72) {
          outerListRef.current?.scrollBy({ left: -16, behavior: 'auto' });
        } else if (moveEvt.clientX > viewportW - 72) {
          outerListRef.current?.scrollBy({ left: 16, behavior: 'auto' });
        }

        const elUnder = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY);
        const cardEl = elUnder?.closest('[data-routine-card-index]') as HTMLElement | null;
        if (cardEl) {
          const overIdx = parseInt(cardEl.getAttribute('data-routine-card-index') || '', 10);
          if (!isNaN(overIdx) && overIdx !== latestTarget) {
            latestTarget = overIdx;
            setDropTargetIdx(overIdx);
            soundManager.vibrate(10);
          }
        }
      };

      const handlePointerUp = () => {
        cleanupListeners();
        setHoldingIdx(null);
        if (dragUnlocked && latestTarget !== startVisualIdx) {
          handleReorderVisualCards(startVisualIdx, latestTarget);
        }
        setDraggingIdx(null);
        setDropTargetIdx(null);
      };

      window.addEventListener('pointermove', handlePointerMove, { passive: false });
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [handleReorderVisualCards]
  );

  const handleToggleMenu = useCallback((routineId: string) => {
    setOpenMenuId((prev) => (prev === routineId ? null : routineId));
    setConfirmDeleteId(null);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setOpenMenuId(null);
    setConfirmDeleteId(null);
  }, []);

  const handleConfirmDelete = useCallback(
    (routineId: string) => {
      setConfirmDeleteId(null);
      setOpenMenuId(null);
      onDeleteRoutine?.(routineId);
    },
    [onDeleteRoutine]
  );

  const handleCardDragStart = useCallback(
    (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => {
      setDraggingIdx(visualIdx);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(visualIdx));
    },
    []
  );

  const handleCardDragOver = useCallback(
    (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropTargetIdx((prev) => (prev === visualIdx ? prev : visualIdx));
    },
    []
  );

  const handleCardDrop = useCallback(
    (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const fromIdx =
        draggingIdx !== null ? draggingIdx : parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(fromIdx) && fromIdx !== visualIdx) {
        handleReorderVisualCards(fromIdx, visualIdx);
      }
      setHoldingIdx(null);
      setDraggingIdx(null);
      setDropTargetIdx(null);
    },
    [draggingIdx, handleReorderVisualCards]
  );

  const handleCardDragEnd = useCallback(() => {
    setHoldingIdx(null);
    setDraggingIdx(null);
    setDropTargetIdx(null);
  }, []);

  const canReorder = Boolean(onReorderRoutines) && routines.length > 1;
  const hasEditHandler = Boolean(onEditRoutine);
  const hasDeleteHandler = Boolean(onDeleteRoutine);

  const carouselItemData = useMemo<CarouselItemData>(
    () => ({
      entries: filteredEntries,
      activeRoutineId,
      openMenuId,
      confirmDeleteId,
      holdingIdx,
      draggingIdx,
      dropTargetIdx,
      canReorder,
      hasEditHandler,
      hasDeleteHandler,
      onToggleMenu: handleToggleMenu,
      onCloseMenu: handleCloseMenu,
      onRequestDeleteConfirm: setConfirmDeleteId,
      onConfirmDelete: handleConfirmDelete,
      onStartWorkout,
      onEditRoutine,
      onShareRoutineClick: handleShareClick,
      onPointerDownGrip: handlePointerDownRoutineHandle,
      onCardDragStart: handleCardDragStart,
      onCardDragOver: handleCardDragOver,
      onCardDrop: handleCardDrop,
      onCardDragEnd: handleCardDragEnd,
    }),
    [
      filteredEntries,
      activeRoutineId,
      openMenuId,
      confirmDeleteId,
      holdingIdx,
      draggingIdx,
      dropTargetIdx,
      canReorder,
      hasEditHandler,
      hasDeleteHandler,
      handleToggleMenu,
      handleCloseMenu,
      handleConfirmDelete,
      onStartWorkout,
      onEditRoutine,
      handleShareClick,
      handlePointerDownRoutineHandle,
      handleCardDragStart,
      handleCardDragOver,
      handleCardDrop,
      handleCardDragEnd,
    ]
  );

  const hasFilterActive = Boolean(searchQuery || versionFilter !== 'all');
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setVersionFilter('all');
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn pb-24 max-w-4xl mx-auto relative">
      {copiedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-1.5 animate-fadeIn border border-emerald-400">
          <span>✓</span>
          <span>Treino copiado para a área de transferência!</span>
        </div>
      )}

      {/* Top Banner, Controles e Gerador de Treinos */}
      <RoutineListHeader
        user={user}
        routinesCount={routines.length}
        isGeneratorOpen={isGeneratorOpen}
        onToggleGenerator={() => {
          setIsGeneratorOpen((prev) => !prev);
          soundManager.vibrate(10);
        }}
        onGenerateQuickWorkout={onGenerateQuickWorkout}
        onCreateManualWorkout={onCreateManualWorkout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        versionFilter={versionFilter}
        setVersionFilter={setVersionFilter}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        hasCustomRoutines={routines.some((r) => r.isCustom)}
        activeCardIdx={activeCardIdx}
        onScrollToActiveRoutine={handleScrollToActiveRoutine}
        filteredCount={filteredEntries.length}
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
        onExecuteGenerate={handleExecuteGenerate}
        genSuccess={genSuccess}
      />

      {/* Estados Vazios (Sem treinos ou Nenhum resultado na busca) */}
      {routines.length === 0 || filteredEntries.length === 0 ? (
        <RoutineEmptyState
          totalRoutinesCount={routines.length}
          filteredCount={filteredEntries.length}
          searchQuery={searchQuery}
          hasFilterActive={hasFilterActive}
          onClearFilters={handleClearFilters}
          onOpenGenerator={() => setIsGeneratorOpen(true)}
          onGenerateQuickWorkout={onGenerateQuickWorkout}
          onCreateManualWorkout={onCreateManualWorkout}
        />
      ) : viewMode === 'grid' ? (
        /* Visualização em Grade Completa (todos os treinos visíveis de uma vez, sem cortes) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => (
            <RoutineCard
              key={entry.routine.id}
              entry={entry}
              isActive={activeRoutineId === entry.routine.id}
              isMenuOpen={openMenuId === entry.routine.id}
              isConfirmingDelete={confirmDeleteId === entry.routine.id}
              isDraggingThis={draggingIdx === entry.visualIdx}
              isHoldingThis={holdingIdx === entry.visualIdx}
              isDropTargetThis={dropTargetIdx === entry.visualIdx && draggingIdx !== entry.visualIdx}
              canReorder={canReorder}
              hasEditHandler={hasEditHandler}
              hasDeleteHandler={hasDeleteHandler}
              onToggleMenu={handleToggleMenu}
              onCloseMenu={handleCloseMenu}
              onRequestDeleteConfirm={setConfirmDeleteId}
              onConfirmDelete={handleConfirmDelete}
              onStartWorkout={onStartWorkout}
              onEditRoutine={onEditRoutine}
              onShareRoutineClick={handleShareClick}
              onPointerDownGrip={handlePointerDownRoutineHandle}
              onCardDragStart={handleCardDragStart}
              onCardDragOver={handleCardDragOver}
              onCardDrop={handleCardDrop}
              onCardDragEnd={handleCardDragEnd}
            />
          ))}
        </div>
      ) : (
        /* Carrossel Horizontal Virtualizado de Treinos (react-window com layout="horizontal") */
        <div className="space-y-2.5">
          {/* Navegação Rápida com abas de divisão e setas */}
          <RoutineCarouselNav
            entries={filteredEntries}
            currentVisibleIdx={currentVisibleIdx}
            activeRoutineId={activeRoutineId}
            onSelectIndex={scrollToRoutineIndex}
            onPrev={handlePrevCard}
            onNext={handleNextCard}
          />

          {/* Container Medido para o FixedSizeList Horizontal */}
          <div ref={carouselContainerRef} className="w-full overflow-hidden">
            <List
              ref={listRef}
              outerRef={outerListRef}
              layout="horizontal"
              className="theme-scrollbar"
              height={carouselHeight}
              width={containerWidth}
              itemCount={filteredEntries.length}
              itemSize={itemWidth}
              itemData={carouselItemData}
              itemKey={(index, data) => data.entries[index]?.routine.id ?? String(index)}
              onItemsRendered={handleItemsRendered}
              overscanCount={2}
            >
              {HorizontalRoutineSlot}
            </List>
          </div>
        </div>
      )}
    </div>
  );
};
