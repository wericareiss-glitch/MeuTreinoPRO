/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Calendar, Dumbbell, Trash2, Award, FileText, Share2 } from 'lucide-react';
import { WorkoutSessionSummary } from '../types/workout';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: WorkoutSessionSummary[];
  onClearHistory: () => void;
  onViewSummary?: (session: WorkoutSessionSummary) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onClearHistory,
  onViewSummary,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <Calendar className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Histórico de Sessões Concluídas
              </h3>
              <p className="text-xs text-slate-400">
                {sessions.length} {sessions.length === 1 ? 'treino registrado' : 'treinos registrados'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          {sessions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              Nenhum treino concluído ainda. Ao terminar o seu treino, clique em &ldquo;Concluir Sessão&rdquo; para registrar sua evolução de carga e volume!
            </div>
          ) : (
            sessions.map((sess) => (
              <div
                key={sess.id}
                className="bg-[#0c1220] border border-slate-800/80 rounded-2xl p-4 transition-all hover:border-slate-700"
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      {sess.splitName}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(sess.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-mono">
                      {sess.totalSets} séries
                    </span>
                    <span className="text-emerald-400 font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {sess.totalVolumeLoadKg.toLocaleString()} kg tonelagem
                    </span>
                    {onViewSummary && (
                      <button
                        type="button"
                        onClick={() => onViewSummary(sess)}
                        className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors ml-1 cursor-pointer"
                        title="Ver Resumo e Compartilhar"
                      >
                        <Share2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Resumo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Session Notes if available */}
                {sess.notes && (
                  <div className="mb-3 p-2.5 rounded-xl bg-[#080d18] border border-purple-500/20 text-xs text-slate-300 flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[10px] uppercase font-bold text-purple-400 block tracking-wider mb-0.5">
                        Notas da Sessão:
                      </strong>
                      <p className="text-slate-300 italic">{sess.notes}</p>
                    </div>
                  </div>
                )}

                {/* Exercises list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {sess.completedExercises.map((ex, idx) => (
                    <div
                      key={idx}
                      className="bg-[#101828] p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="truncate mr-2">
                          <span className="font-semibold text-white truncate block">
                            {ex.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {ex.muscleGroup}
                          </span>
                        </div>
                        <span className="font-mono text-slate-400 text-[11px] shrink-0 font-bold">
                          {ex.sets.length} {ex.sets.length === 1 ? 'série' : 'séries'}
                        </span>
                      </div>

                      {/* Sets breakdown */}
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/60 font-mono text-[10px]">
                        {ex.sets.map((s, sI) => (
                          <span
                            key={sI}
                            className="bg-[#0b1220] px-1.5 py-0.5 rounded text-slate-300 border border-slate-800"
                          >
                            {s.weight}kg &times; {s.reps}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {sessions.length > 0 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm('Deseja realmente apagar todo o histórico de treinos?')) {
                  onClearHistory();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/20 border border-rose-900/40 hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Histórico</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
