/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  TrendingUp, 
  Flame, 
  Award, 
  AlertTriangle, 
  Calendar, 
  Dumbbell, 
  Zap, 
  Clock, 
  ChevronRight,
  Filter,
  BarChart3,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  ReferenceLine 
} from 'recharts';
import { WorkoutSessionSummary, Exercise } from '../types/workout';
import { EXERCISE_DATABASE, MUSCLE_NAMES } from '../data/exerciseDatabase';
import { calculate1RM } from '../utils/storage';

interface ExerciseAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: WorkoutSessionSummary[];
  initialExerciseName?: string;
}

export const ExerciseAnalyticsModal: React.FC<ExerciseAnalyticsModalProps> = ({
  isOpen,
  onClose,
  sessions,
  initialExerciseName,
}) => {
  // Collect all available exercises from database
  const allExercises = useMemo(() => {
    const list: Exercise[] = [];
    Object.values(EXERCISE_DATABASE).forEach((muscleList) => {
      muscleList.forEach((ex) => {
        if (!list.some((item) => item.name === ex.name)) {
          list.push(ex);
        }
      });
    });
    return list;
  }, []);

  // Exercises that have at least one logged session
  const exercisesWithData = useMemo(() => {
    const names = new Set<string>();
    sessions.forEach((s) => {
      s.completedExercises.forEach((e) => names.add(e.name));
    });
    return Array.from(names);
  }, [sessions]);

  // Selected exercise state
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>(() => {
    if (initialExerciseName) return initialExerciseName;
    if (exercisesWithData.length > 0) return exercisesWithData[0];
    return allExercises[0]?.name || 'Agachamento Hack Guiado';
  });

  // Active chart view tab: 'weight' (1RM & Cargas) default | 'volume'
  const [chartView, setChartView] = useState<'weight' | 'volume'>('weight');

  // Extract historical trend data for the selected exercise across all sessions chronologically (oldest to newest)
  const chartData = useMemo(() => {
    // Reverse sessions so time flows left-to-right (past -> present)
    const chronological = [...sessions].reverse();

    const dataPoints: {
      sessionDate: string;
      displayDate: string;
      maxWeight: number;
      estimated1RM: number;
      avgReps: number;
      avgRpe: number | null;
      totalVolume: number;
      setsCount: number;
    }[] = [];

    chronological.forEach((session) => {
      const match = session.completedExercises.find((e) => e.name === selectedExerciseName);
      if (match && match.sets.length > 0) {
        let maxWeight = 0;
        let max1RM = 0;
        let totalReps = 0;
        let totalVol = 0;
        const rpes: number[] = [];

        match.sets.forEach((set) => {
          if (set.weight > maxWeight) maxWeight = set.weight;
          const e1rm = calculate1RM(set.weight.toString(), set.reps.toString(), set.rpe || set.rir);
          if (e1rm && e1rm > max1RM) max1RM = e1rm;
          totalReps += set.reps;
          totalVol += set.weight * set.reps;
          if (set.rpe) {
            const parsed = parseFloat(set.rpe);
            if (!isNaN(parsed)) rpes.push(parsed);
          }
        });

        const d = new Date(session.date);
        const displayDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

        dataPoints.push({
          sessionDate: session.date,
          displayDate,
          maxWeight,
          estimated1RM: max1RM > 0 ? max1RM : maxWeight,
          avgReps: Math.round(totalReps / match.sets.length),
          avgRpe: rpes.length > 0 ? +(rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : null,
          totalVolume: Math.round(totalVol),
          setsCount: match.sets.length,
        });
      }
    });

    return dataPoints;
  }, [sessions, selectedExerciseName]);

  // High-level analytics KPIs
  const kpis = useMemo(() => {
    if (chartData.length === 0) {
      return {
        prWeight: 0,
        pr1RM: 0,
        totalSessionsCount: 0,
        growthPercent: 0,
        isPlateaued: false,
        avgRpe: null,
        totalVolumeAccumulated: 0,
        maxSessionVolume: 0,
        avgVolumePerSession: 0,
      };
    }

    let prWeight = 0;
    let pr1RM = 0;
    let rpeSum = 0;
    let rpeCount = 0;
    let totalVolAcc = 0;
    let maxVol = 0;

    chartData.forEach((d) => {
      if (d.maxWeight > prWeight) prWeight = d.maxWeight;
      if (d.estimated1RM > pr1RM) pr1RM = d.estimated1RM;
      totalVolAcc += d.totalVolume;
      if (d.totalVolume > maxVol) maxVol = d.totalVolume;
      if (d.avgRpe !== null) {
        rpeSum += d.avgRpe;
        rpeCount++;
      }
    });

    const firstWeight = chartData[0].maxWeight;
    const lastWeight = chartData[chartData.length - 1].maxWeight;
    const growthPercent = firstWeight > 0 ? Math.round(((lastWeight - firstWeight) / firstWeight) * 100) : 0;

    // Detect plateau: last 3 sessions have identical or decreasing weight
    let isPlateaued = false;
    if (chartData.length >= 3) {
      const last3 = chartData.slice(-3);
      const w0 = last3[0].maxWeight;
      const w1 = last3[1].maxWeight;
      const w2 = last3[2].maxWeight;
      if (w2 <= w1 && w1 <= w0 && w0 > 0) {
        isPlateaued = true;
      }
    }

    return {
      prWeight,
      pr1RM,
      totalSessionsCount: chartData.length,
      growthPercent,
      isPlateaued,
      avgRpe: rpeCount > 0 ? (rpeSum / rpeCount).toFixed(1) : null,
      totalVolumeAccumulated: totalVolAcc,
      maxSessionVolume: maxVol,
      avgVolumePerSession: Math.round(totalVolAcc / chartData.length),
    };
  }, [chartData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f172a] border border-[#223354] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#0d1424] border-b border-slate-800 flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Análise de Cargas & Volume Total
              </h2>
              <p className="text-xs text-slate-400">
                Evolução do Volume de Carga (Séries × Reps × Peso) e Sobrecarga Progressiva
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 relative z-10">
          {/* Exercise Selector */}
          <div className="bg-[#080d19] border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              <span>Selecione o Exercício:</span>
            </label>

            <div className="relative flex-1 sm:max-w-md">
              <select
                value={selectedExerciseName}
                onChange={(e) => setSelectedExerciseName(e.target.value)}
                className="w-full bg-[#0e172a] border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                {/* Prioritize exercises with recorded data */}
                {exercisesWithData.length > 0 && (
                  <optgroup label="Exercícios com Histórico">
                    {exercisesWithData.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Todos os Exercícios do Banco">
                  {allExercises
                    .filter((ex) => !exercisesWithData.includes(ex.name))
                    .map((ex) => (
                      <option key={ex.id} value={ex.name}>
                        {ex.name} ({MUSCLE_NAMES[ex.muscleKey]})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* KPI Stat Cards (Volume & Cargas) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Volume Total (Kg)</span>
              <span className="text-lg font-black font-mono text-emerald-400 block mt-0.5">
                {kpis.totalVolumeAccumulated > 0 ? `${kpis.totalVolumeAccumulated.toLocaleString('pt-BR')} kg` : '—'}
              </span>
              <span className="text-[10px] text-slate-500">tonelagem acumulada</span>
            </div>

            <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Melhor Sessão (Vol)</span>
              <span className="text-lg font-black font-mono text-sky-400 block mt-0.5">
                {kpis.maxSessionVolume > 0 ? `${kpis.maxSessionVolume.toLocaleString('pt-BR')} kg` : '—'}
              </span>
              <span className="text-[10px] text-slate-500">recorde de tonelagem</span>
            </div>

            <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recorde (PR Carga)</span>
              <span className="text-lg font-black font-mono text-amber-400 block mt-0.5">
                {kpis.prWeight > 0 ? `${kpis.prWeight} kg` : '—'}
              </span>
              <span className="text-[10px] text-slate-500">1RM: ~{kpis.pr1RM || 0}kg</span>
            </div>

            <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Média por Treino</span>
              <span className="text-lg font-black font-mono text-purple-400 block mt-0.5">
                {kpis.avgVolumePerSession > 0 ? `${kpis.avgVolumePerSession.toLocaleString('pt-BR')} kg` : '—'}
              </span>
              <span className="text-[10px] text-slate-500">em {kpis.totalSessionsCount} sessões</span>
            </div>
          </div>

          {/* Plateau Warning if detected */}
          {kpis.isPlateaued && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3 text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong className="text-xs font-bold block">Alerta de Platô / Estagnação de Carga</strong>
                <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                  A carga máxima deste exercício está estável há 3 ou mais sessões consecutivas.
                  Tente aumentar o descanso entre séries, variar a ordem dos exercícios ou realizar uma semana com deload.
                </p>
              </div>
            </div>
          )}

          {/* Chart View Switcher: Cargas/1RM (Linha) vs Volume de Carga (Barras) */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 p-1 bg-[#090f1d] rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setChartView('weight')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartView === 'weight'
                    ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Evolução da Carga & 1RM Estimado</span>
              </button>
              <button
                type="button"
                onClick={() => setChartView('volume')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartView === 'volume'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Volume de Carga Total (kg)</span>
              </button>
            </div>

            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              {chartData.length} {chartData.length === 1 ? 'sessão registrada' : 'sessões registradas'}
            </span>
          </div>

          {/* 1. Componente Recharts de Curva de Linha de Cargas & 1RM Estimado */}
          {chartView === 'weight' && (
            <div className="bg-[#090f1d] border border-slate-800 rounded-3xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Evolução do 1RM Estimado e Carga Máxima ao Longo das Sessões
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  Fórmula Epley/Brzycki + RPE/RIR
                </span>
              </div>

              {chartData.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2d47" opacity={0.6} />
                        <XAxis 
                          dataKey="displayDate" 
                          stroke="#64748b" 
                          fontSize={11} 
                          tickLine={false} 
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={11} 
                          unit="kg"
                          tickLine={false}
                          domain={['dataMin - 5', 'dataMax + 10']}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0a101f', 
                            borderColor: '#223354', 
                            borderRadius: '1rem',
                            fontSize: '12px',
                            color: '#fff',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)'
                          }}
                          formatter={(value: any, name: any) => {
                            if (name === 'estimated1RM') return [`${value} kg`, '1RM Estimado'];
                            if (name === 'maxWeight') return [`${value} kg`, 'Carga Máxima Real'];
                            return [value, name];
                          }}
                          labelFormatter={(label, items) => {
                            const item = items?.[0]?.payload;
                            return item ? `Sessão: ${label} (${item.setsCount} séries · média ${item.avgReps} reps ${item.avgRpe ? `· @RPE ${item.avgRpe}` : ''})` : label;
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          height={36}
                          formatter={(val) => {
                            if (val === 'estimated1RM') return <span className="text-xs text-sky-300 font-bold">1RM Estimado (kg)</span>;
                            if (val === 'maxWeight') return <span className="text-xs text-emerald-300 font-bold">Carga Real Levantada (kg)</span>;
                            return val;
                          }}
                        />
                        {kpis.pr1RM > 0 && (
                          <ReferenceLine 
                            y={kpis.pr1RM} 
                            stroke="#f59e0b" 
                            strokeDasharray="4 4" 
                            strokeWidth={1.5}
                            label={{ 
                              value: `Recorde: ${kpis.pr1RM}kg`, 
                              fill: '#f59e0b', 
                              fontSize: 10, 
                              position: 'top' 
                            }} 
                          />
                        )}
                        <Line 
                          type="monotone" 
                          dataKey="estimated1RM" 
                          stroke="#38bdf8" 
                          strokeWidth={3} 
                          dot={{ fill: '#38bdf8', r: 4, stroke: '#0369a1', strokeWidth: 2 }} 
                          activeDot={{ r: 7, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="maxWeight" 
                          stroke="#10b981" 
                          strokeWidth={2} 
                          strokeDasharray="5 5"
                          dot={{ fill: '#10b981', r: 3 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Resumo Biomecânico de Sobrecarga */}
                  <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-slate-300">
                        {kpis.growthPercent > 0 ? (
                          <>Evolução de <strong>+{kpis.growthPercent}%</strong> na força máxima desde a 1ª sessão registrada.</>
                        ) : (
                          <>Mantenha o registro consistente de repetições e RPE para calibrar sua taxa de progressão.</>
                        )}
                      </span>
                    </div>

                    {kpis.pr1RM > 0 && (
                      <span className="text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                        Sugerido próx. sessão: ~{Math.round(kpis.prWeight * 1.025)}kg (8-10 reps)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-14 text-center text-slate-500 text-xs">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p>Nenhuma sessão concluída ainda com este exercício.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Assim que você registrar cargas e concluir o treino, a evolução do 1RM em gráfico de linha será exibida automaticamente!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. Componente Recharts de Volume de Carga Total */}
          {chartView === 'volume' && (
            <div className="bg-[#090f1d] border border-slate-800 rounded-3xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Volume de Carga Total ao Longo das Sessões (kg movimentados)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  Volume Load = Séries × Reps × Peso
                </span>
              </div>

              {chartData.length > 0 ? (
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2d47" opacity={0.6} />
                      <XAxis 
                        dataKey="displayDate" 
                        stroke="#64748b" 
                        fontSize={11} 
                        tickLine={false} 
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={11} 
                        unit="kg"
                        tickLine={false}
                        domain={[0, 'auto']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0a101f', 
                          borderColor: '#223354', 
                          borderRadius: '1rem',
                          fontSize: '12px',
                          color: '#fff',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)'
                        }}
                        formatter={(value: any) => [`${Number(value).toLocaleString('pt-BR')} kg`, 'Volume de Carga Total']}
                        labelFormatter={(label, items) => {
                          const item = items?.[0]?.payload;
                          return item ? `Sessão: ${label} (${item.setsCount} séries · média ${item.avgReps} reps · carga máx ${item.maxWeight}kg)` : label;
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36}
                        formatter={() => <span className="text-xs text-emerald-300 font-bold">Volume Total por Sessão (kg)</span>}
                      />
                      <Bar 
                        dataKey="totalVolume" 
                        fill="#10b981" 
                        radius={[8, 8, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-14 text-center text-slate-500 text-xs">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p>Nenhuma sessão concluída ainda com este exercício.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Assim que você registrar cargas e concluir o treino, a evolução do volume total será exibida automaticamente!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
