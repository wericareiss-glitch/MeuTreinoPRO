/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Activity } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface CadenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CadencePreset {
  id: string;
  name: string;
  eccentric: number; // segundos descida (alongamento)
  pauseBottom: number; // pausa no estiramento
  concentric: number; // subida explosiva
  pauseTop: number; // pico de contração
  description: string;
}

const CADENCE_PRESETS: CadencePreset[] = [
  {
    id: '3010',
    name: '3-0-1-0 (Hipertrofia Padrão)',
    eccentric: 3,
    pauseBottom: 0,
    concentric: 1,
    pauseTop: 0,
    description: '3s descida controlada · 1s subida potente. Máximo estímulo mecânico.',
  },
  {
    id: '4110',
    name: '4-1-1-0 (Tensão sob Alongamento)',
    eccentric: 4,
    pauseBottom: 1,
    concentric: 1,
    pauseTop: 0,
    description: '4s excêntrica lenta · 1s pausa esticada · 1s subida. Hipertrofia mediada por estiramento.',
  },
  {
    id: '2020',
    name: '2-0-2-0 (Tensão Contínua Metabólica)',
    eccentric: 2,
    pauseBottom: 0,
    concentric: 2,
    pauseTop: 0,
    description: '2s descida e 2s subida sem bloqueio articular. Oclusão vascular e estresse metabólico.',
  },
  {
    id: '3111',
    name: '3-1-1-1 (Pico de Contração & Isometria)',
    eccentric: 3,
    pauseBottom: 1,
    concentric: 1,
    pauseTop: 1,
    description: '3s descida · 1s base · 1s subida · 1s contração máxima no encurtamento.',
  },
];

type PhaseType = 'eccentric' | 'pauseBottom' | 'concentric' | 'pauseTop';

export const CadenceModal: React.FC<CadenceModalProps> = ({ isOpen, onClose }) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('3010');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<PhaseType>('eccentric');
  const [secondsInPhase, setSecondsInPhase] = useState<number>(3);
  const [repCount, setRepCount] = useState<number>(0);
  const [tutSeconds, setTutSeconds] = useState<number>(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);

  const preset = CADENCE_PRESETS.find((p) => p.id === selectedPresetId) || CADENCE_PRESETS[0];

  const stateRef = useRef({
    isRunning: false,
    preset,
    phase: 'eccentric' as PhaseType,
    secondsLeft: 3,
    repCount: 0,
    tutSeconds: 0,
    isAudioEnabled: true,
  });

  useEffect(() => {
    stateRef.current.preset = preset;
    stateRef.current.isAudioEnabled = isAudioEnabled;
  }, [preset, isAudioEnabled]);

  // Stop when modal closes
  useEffect(() => {
    if (!isOpen) {
      handleStop();
    }
  }, [isOpen]);

  const handleStop = () => {
    setIsRunning(false);
    stateRef.current.isRunning = false;
    setCurrentPhase('eccentric');
    setSecondsInPhase(preset.eccentric);
    stateRef.current.phase = 'eccentric';
    stateRef.current.secondsLeft = preset.eccentric;
  };

  const handleResetAll = () => {
    handleStop();
    setRepCount(0);
    setTutSeconds(0);
    stateRef.current.repCount = 0;
    stateRef.current.tutSeconds = 0;
  };

  const handleToggle = () => {
    if (isRunning) {
      handleStop();
    } else {
      setIsRunning(true);
      stateRef.current.isRunning = true;
      setCurrentPhase('eccentric');
      setSecondsInPhase(preset.eccentric);
      stateRef.current.phase = 'eccentric';
      stateRef.current.secondsLeft = preset.eccentric;
      // Play initial beep
      if (isAudioEnabled) {
        soundManager.playTone(420, 0.08);
      }
    }
  };

  // Main Metronome Loop (Runs every 1 second)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const cur = stateRef.current;
      if (!cur.isRunning) return;

      // Increment total Time Under Tension
      cur.tutSeconds += 1;
      setTutSeconds(cur.tutSeconds);

      cur.secondsLeft -= 1;

      if (cur.secondsLeft <= 0) {
        // Transition to next phase
        const p = cur.preset;
        if (cur.phase === 'eccentric') {
          if (p.pauseBottom > 0) {
            cur.phase = 'pauseBottom';
            cur.secondsLeft = p.pauseBottom;
            if (cur.isAudioEnabled) soundManager.playTone(520, 0.08);
          } else {
            cur.phase = 'concentric';
            cur.secondsLeft = p.concentric;
            if (cur.isAudioEnabled) soundManager.playTone(880, 0.15);
          }
        } else if (cur.phase === 'pauseBottom') {
          cur.phase = 'concentric';
          cur.secondsLeft = p.concentric;
          if (cur.isAudioEnabled) soundManager.playTone(880, 0.15);
        } else if (cur.phase === 'concentric') {
          // Rep completed!
          cur.repCount += 1;
          setRepCount(cur.repCount);
          soundManager.vibrate(80);

          if (p.pauseTop > 0) {
            cur.phase = 'pauseTop';
            cur.secondsLeft = p.pauseTop;
            if (cur.isAudioEnabled) soundManager.playTone(660, 0.08);
          } else {
            cur.phase = 'eccentric';
            cur.secondsLeft = p.eccentric;
            if (cur.isAudioEnabled) soundManager.playTone(420, 0.08);
          }
        } else if (cur.phase === 'pauseTop') {
          cur.phase = 'eccentric';
          cur.secondsLeft = p.eccentric;
          if (cur.isAudioEnabled) soundManager.playTone(420, 0.08);
        }
      } else {
        // Still inside current phase
        if (cur.isAudioEnabled) {
          if (cur.phase === 'eccentric') {
            soundManager.playTone(420, 0.06);
          } else if (cur.phase === 'concentric') {
            soundManager.playTone(880, 0.08);
          } else {
            soundManager.playTone(560, 0.06);
          }
        }
      }

      setCurrentPhase(cur.phase);
      setSecondsInPhase(cur.secondsLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  if (!isOpen) return null;

  // Visual cues based on phase
  let phaseTitle = 'Pronto para Iniciar';
  let phaseSubtitle = 'Selecione a cadência e clique em Iniciar';
  let phaseColor = 'text-slate-400';
  let circleBorder = 'border-slate-700 bg-slate-900/60';
  let circleScale = 'scale-100';

  if (isRunning) {
    if (currentPhase === 'eccentric') {
      phaseTitle = 'Descida · Alongamento';
      phaseSubtitle = 'Resista ao peso lentamente com controle tensional';
      phaseColor = 'text-emerald-400';
      circleBorder = 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20';
      circleScale = 'scale-90';
    } else if (currentPhase === 'pauseBottom') {
      phaseTitle = 'Pausa no Estiramento';
      phaseSubtitle = 'Elimine o reflexo miotático elástico';
      phaseColor = 'text-amber-400';
      circleBorder = 'border-amber-500 bg-amber-500/15';
      circleScale = 'scale-85';
    } else if (currentPhase === 'concentric') {
      phaseTitle = 'Subida · Explosão';
      phaseSubtitle = 'Acelere com força máxima concêntrica';
      phaseColor = 'text-sky-400';
      circleBorder = 'border-sky-400 bg-sky-500/20 shadow-xl shadow-sky-500/30';
      circleScale = 'scale-110';
    } else if (currentPhase === 'pauseTop') {
      phaseTitle = 'Pico de Contração';
      phaseSubtitle = 'Aperte e esmague o músculo alvo';
      phaseColor = 'text-purple-400';
      circleBorder = 'border-purple-400 bg-purple-500/15';
      circleScale = 'scale-105';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Metrônomo de Cadência & TUT</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  TUT Biomecânico
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Guia auditivo e visual de tempo sob tensão por repetição
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Selector */}
        <div className="mb-4 relative z-10">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Modelo de Cadência:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CADENCE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedPresetId(p.id);
                  if (isRunning) handleStop();
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedPresetId === p.id
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md ring-1 ring-purple-500/30 font-bold'
                    : 'bg-[#0b1220] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold leading-tight">{p.name}</div>
                <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Metronome Visual Display & Countdown Ring */}
        <div className="py-6 px-4 bg-[#080d17] border border-slate-800/90 rounded-3xl text-center relative shadow-inner mb-4 flex flex-col items-center justify-center">
          {/* Animated Interactive Ring */}
          <div
            className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300 ${circleBorder} ${circleScale}`}
          >
            <span className={`text-xs font-black uppercase tracking-wider ${phaseColor}`}>
              {isRunning ? phaseTitle.split('·')[0].trim() : 'PRONTO'}
            </span>
            <div className="font-mono text-5xl font-black text-white tracking-tight my-0.5">
              {isRunning ? `${secondsInPhase}s` : `${preset.eccentric}s`}
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              {isRunning ? `Fase: ${currentPhase}` : '3-0-1-0'}
            </span>
          </div>

          <div className="mt-3">
            <h4 className={`text-sm font-black tracking-tight ${phaseColor}`}>{phaseTitle}</h4>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xs mx-auto">{phaseSubtitle}</p>
          </div>
        </div>

        {/* Rep & TUT Counter Row */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Repetições Feitas
            </span>
            <span className="text-2xl font-black font-mono text-sky-400 block mt-0.5">
              {repCount} <span className="text-xs text-slate-500 font-normal">reps</span>
            </span>
          </div>
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Tempo Sob Tensão (TUT)
            </span>
            <span className="text-2xl font-black font-mono text-emerald-400 block mt-0.5">
              {tutSeconds} <span className="text-xs text-slate-500 font-normal">s</span>
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            className={`flex-1 py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pausar Ritmo</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Iniciar Metrônomo</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={`p-3.5 rounded-2xl border transition-colors cursor-pointer ${
              isAudioEnabled
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title={isAudioEnabled ? 'Bipes sonoros ativados' : 'Bipes silenciados'}
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title="Zerar repetições e tempo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
