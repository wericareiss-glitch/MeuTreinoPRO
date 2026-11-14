/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calendar,
  Dumbbell,
  Zap,
  Clock,
  Award,
  Trophy,
  Share2,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { WorkoutSessionSummary } from '../../types/workout';
import { useI18n } from '../../utils/i18n';

interface RecentSessionsListProps {
  sessions: WorkoutSessionSummary[];
  onGoToWorkout: () => void;
  onViewSummary: (session: WorkoutSessionSummary) => void;
}

export const RecentSessionsList: React.FC<RecentSessionsListProps> = ({
  sessions,
  onGoToWorkout,
  onViewSummary,
}) => {
  const { t, language } = useI18n();
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const visibleSessions = showAllSessions ? sessions : sessions.slice(0, 5);

  return (
    <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-2xl p-4 sm:p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
              {t.historySectionTitle}
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              Toque em uma sessão para expandir exercícios e cargas
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-slate-300 tabular-nums shrink-0">
          {sessions.length} {sessions.length === 1 ? 'treino' : 'treinos'}
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="py-10 text-center px-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Dumbbell className="w-6 h-6 opacity-70" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">{t.historyEmptyTitle}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mb-4">
            {t.historyEmptyDesc}
          </p>
          <button
            type="button"
            onClick={onGoToWorkout}
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>{t.historyEmptyCta}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleSessions.map((sess) => {
            let sessionMax = 0;
            sess.completedExercises.forEach((ex) => {
              ex.sets.forEach((st) => {
                if (st.weight > sessionMax) sessionMax = st.weight;
              });
            });

            const isExpanded = expandedSessionId === sess.id;
            const formattedDate = new Date(sess.date).toLocaleDateString(
              language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR',
              {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }
            );

            return (
              <div
                key={sess.id}
                className="bg-[#0b1220] border border-slate-800/90 hover:border-slate-700 rounded-2xl p-3 sm:p-3.5 transition-all shadow-sm"
              >
                {/* Linha compacta da sessão */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                    className="flex-1 min-w-0 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-sky-400">
                        {sess.splitName}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-[11px] text-slate-400 font-mono inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formattedDate}
                      </span>
                    </div>

                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] font-mono tabular-nums text-slate-300">
                      <span>{sess.totalSets} {t.seriesLabel}</span>
                      <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {sess.totalVolumeLoadKg.toLocaleString()} kg
                      </span>
                      {sessionMax > 0 && (
                        <span className="text-amber-400 font-bold inline-flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          Máx {sessionMax}kg
                        </span>
                      )}
                      <span className="text-slate-400 inline-flex items-center gap-0.5 font-sans">
                        <span>{sess.completedExercises.length} exerc.</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                        )}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onViewSummary(sess)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap"
                    title={t.viewSummaryAndShare}
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.viewSummaryAndShare}</span>
                  </button>
                </div>

                {/* Detalhes expandidos sob demanda */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5 animate-fadeIn">
                    {sess.notes && (
                      <div className="p-2.5 rounded-xl bg-[#070b14] border border-purple-500/20 text-xs text-slate-300 flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <p className="text-slate-300 italic">{sess.notes}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {sess.completedExercises.map((ex, exIdx) => (
                        <div
                          key={exIdx}
                          className="bg-[#101828] p-2.5 rounded-xl border border-slate-800/80 flex flex-col justify-between gap-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white truncate" title={ex.name}>
                              {ex.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0">
                              {ex.sets.length}s
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
                            {ex.sets.map((s, sIdx) => (
                              <span
                                key={sIdx}
                                className="bg-[#070b14] px-1.5 py-0.5 rounded text-slate-300 border border-slate-800"
                              >
                                {s.weight}kg &times; {s.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {sessions.length > 5 && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowAllSessions((prev) => !prev)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                {showAllSessions
                  ? 'Mostrar apenas os 5 recentes'
                  : `Ver todos os ${sessions.length} treinos`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
