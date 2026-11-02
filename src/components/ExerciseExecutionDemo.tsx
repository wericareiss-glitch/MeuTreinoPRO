/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lottie, LottieHandle } from 'lottie-react';
import {
  Play,
  Pause,
  Sparkles,
  Video,
  Check,
  Link2,
  Gauge,
  Layers,
} from 'lucide-react';
import { Exercise } from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { EXERCISE_LOTTIE_MAP, getExerciseLottieAnimation } from '../data/exerciseLottieMap';
import { safeStorage } from '../utils/storage';

interface ExerciseExecutionDemoProps {
  exercise: Exercise;
  compact?: boolean;
}

type MovementArchetype =
  | 'squat'
  | 'hinge'
  | 'knee_extension'
  | 'knee_flexion'
  | 'hip_thrust'
  | 'calf_raise'
  | 'horizontal_press'
  | 'chest_fly'
  | 'vertical_pull'
  | 'horizontal_row'
  | 'overhead_press'
  | 'lateral_raise'
  | 'triceps_pressdown'
  | 'biceps_curl'
  | 'core_flexion';

function detectMovementArchetype(ex: Exercise): MovementArchetype {
  const n = ex.name.toLowerCase();
  if (n.includes('extensora')) return 'knee_extension';
  if (n.includes('flexora')) return 'knee_flexion';
  if (n.includes('elevação pélvica') || n.includes('glúteo') || n.includes('coice') || n.includes('abdutora')) return 'hip_thrust';
  if (n.includes('stiff') || n.includes('romeno') || n.includes('terra') || n.includes('bom dia')) return 'hinge';
  if (n.includes('agachamento') || n.includes('leg press') || n.includes('hack') || n.includes('afundo') || n.includes('búlgaro')) return 'squat';
  if (ex.muscleKey === 'calves' || n.includes('panturrilha') || n.includes('gêmeos')) return 'calf_raise';
  if (n.includes('crucifixo') || n.includes('crossover') || n.includes('peck deck') || n.includes('voador')) return 'chest_fly';
  if (ex.muscleKey === 'chest' || n.includes('supino') || n.includes('flexão')) return 'horizontal_press';
  if (n.includes('puxada') || n.includes('barra fixa') || n.includes('pulldown')) return 'vertical_pull';
  if (ex.muscleKey === 'back' || n.includes('remada') || n.includes('serrote')) return 'horizontal_row';
  if (n.includes('elevação lateral') || n.includes('elevação frontal') || ex.muscleKey === 'rear_delts' || n.includes('face pull')) return 'lateral_raise';
  if (ex.muscleKey === 'shoulders' || n.includes('desenvolvimento')) return 'overhead_press';
  if (ex.muscleKey === 'triceps' || n.includes('tríceps') || n.includes('testa') || n.includes('francês') || n.includes('paralela')) return 'triceps_pressdown';
  if (ex.muscleKey === 'biceps' || n.includes('rosca')) return 'biceps_curl';
  if (ex.muscleKey === 'abs' || n.includes('abdominal') || n.includes('prancha') || n.includes('infra')) return 'core_flexion';
  return 'squat';
}

export const ExerciseExecutionDemo: React.FC<ExerciseExecutionDemoProps> = ({
  exercise,
  compact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 0.5>(1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [viewMode, setViewMode] = useState<'lottie' | 'animation' | 'custom_gif'>('lottie');
  const lottieRef = useRef<LottieHandle | null>(null);

  // Busca a animação JSON no mapa de IDs (EXERCISE_LOTTIE_MAP) com fallback inteligente
  const lottieAnimationData = useMemo(() => {
    return (
      EXERCISE_LOTTIE_MAP[exercise.id] ||
      getExerciseLottieAnimation(exercise.id, exercise.name, exercise.muscleKey)
    );
  }, [exercise.id, exercise.name, exercise.muscleKey]);

  const isMappedDirectly = Boolean(EXERCISE_LOTTIE_MAP[exercise.id]);

  const customMediaKey = `meutreino_custom_demo_${exercise.id}`;
  const [customGifUrl, setCustomGifUrl] = useState<string>(() =>
    safeStorage.get<string>(customMediaKey, '')
  );
  const [urlInput, setUrlInput] = useState<string>(customGifUrl);
  const [savedUrlToast, setSavedUrlToast] = useState(false);

  const LOOP_DURATION_MS = 5000; // 5.0 seconds loop

  // Sincroniza estado de play/pause e velocidade com a instância do lottie-react
  useEffect(() => {
    if (!lottieRef.current) return;
    lottieRef.current.setSpeed(speed);
    if (isPlaying) {
      lottieRef.current.play();
    } else {
      lottieRef.current.pause();
    }
  }, [isPlaying, speed, viewMode, lottieAnimationData]);

  useEffect(() => {
    if (!isPlaying) return;
    let lastTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const dt = (now - lastTime) * speed;
      lastTime = now;
      setElapsedMs((prev) => (prev + dt) % LOOP_DURATION_MS);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, speed]);

  // Normalized progress t in [0, 1] over the 5s cycle
  const cycleProgress = elapsedMs / LOOP_DURATION_MS;
  const secondsDisplay = (elapsedMs / 1000).toFixed(1);

  // Biomechanical phase calculation:
  // 0.00 - 0.52 (0.0s - 2.6s): Eccentric (lengthening under control, 0 -> 1)
  // 0.52 - 0.64 (2.6s - 3.2s): Bottom / Peak Isometric pause (1)
  // 0.64 - 0.92 (3.2s - 4.6s): Concentric (explosive contraction, 1 -> 0)
  // 0.92 - 1.00 (4.6s - 5.0s): Lockout / Top stabilization (0)
  let contractionFactor = 0; // 0 = stretched/eccentric end, 1 = contracted/concentric peak
  let phaseLabel = 'Fase Excêntrica (Controle 3s)';
  let phaseColor = 'text-sky-400 border-sky-500/40 bg-sky-500/15';
  let phaseBarColor = 'from-sky-500 to-cyan-400';

  if (cycleProgress < 0.52) {
    // Moving from contracted (1) to stretched (0) smoothly
    const localT = cycleProgress / 0.52;
    contractionFactor = 1 - 0.5 * (1 - Math.cos(Math.PI * localT));
    phaseLabel = 'Fase Excêntrica · Alongamento Controlado';
    phaseColor = 'text-sky-300 border-sky-500/40 bg-sky-500/15';
    phaseBarColor = 'from-sky-500 to-blue-400';
  } else if (cycleProgress < 0.64) {
    contractionFactor = 0;
    phaseLabel = 'Transição Articular · Estabilidade Máxima';
    phaseColor = 'text-amber-300 border-amber-500/40 bg-amber-500/15';
    phaseBarColor = 'from-amber-500 to-yellow-400';
  } else if (cycleProgress < 0.92) {
    const localT = (cycleProgress - 0.64) / 0.28;
    contractionFactor = 0.5 * (1 - Math.cos(Math.PI * localT));
    phaseLabel = 'Fase Concêntrica · Contração Explosiva';
    phaseColor = 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15';
    phaseBarColor = 'from-emerald-500 to-teal-400';
  } else {
    contractionFactor = 1;
    phaseLabel = 'Pico de Contração · Tensão Contínua';
    phaseColor = 'text-purple-300 border-purple-500/40 bg-purple-500/15';
    phaseBarColor = 'from-purple-500 to-pink-400';
  }

  const archetype = detectMovementArchetype(exercise);
  const muscleName = MUSCLE_NAMES[exercise.muscleKey] || exercise.muscleKey;

  // Simulated EMG activation & joint angle for educational biofeedback
  const emgActivation = Math.round(55 + contractionFactor * 43);
  const jointAngle = Math.round(75 + contractionFactor * 85);

  const handleSaveCustomGif = () => {
    const trimmed = urlInput.trim();
    setCustomGifUrl(trimmed);
    safeStorage.set(customMediaKey, trimmed);
    setSavedUrlToast(true);
    setTimeout(() => setSavedUrlToast(false), 2000);
  };

  // Render dynamic SVG kinematic rig based on movement archetype & contractionFactor (0 = stretched, 1 = contracted)
  const renderBiomechanicalSvg = () => {
    const c = contractionFactor; // 0..1
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const activeGlowColor = c > 0.65 ? '#10b981' : c < 0.2 ? '#f59e0b' : '#38bdf8';

    switch (archetype) {
      case 'squat': {
        // Hip and knee flexion/extension
        const hipY = lerp(138, 86, c);
        const hipX = lerp(108, 122, c);
        const shoulderY = lerp(78, 38, c);
        const shoulderX = lerp(128, 128, c);
        const kneeX = lerp(155, 134, c);
        const kneeY = lerp(142, 136, c);
        const ankleX = 132;
        const ankleY = 182;

        return (
          <g>
            {/* Floor & Rack Reference */}
            <line x1="40" y1="186" x2="220" y2="186" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
            <line x1="128" y1="22" x2="128" y2="180" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
            {/* Barbell path */}
            <circle cx={shoulderX} cy={shoulderY} r="10" fill="#0f172a" stroke="#f59e0b" strokeWidth="3" />
            {/* Torso */}
            <line x1={hipX} y1={hipY} x2={shoulderX} y2={shoulderY} stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
            {/* Head */}
            <circle cx={shoulderX + 4} cy={shoulderY - 15} r="9" fill="#94a3b8" />
            {/* Femur (Active Quadriceps/Glutes highlight) */}
            <line
              x1={hipX}
              y1={hipY}
              x2={kneeX}
              y2={kneeY}
              stroke={activeGlowColor}
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Tibia */}
            <line x1={kneeX} y1={kneeY} x2={ankleX} y2={ankleY} stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
            {/* Foot */}
            <line x1={ankleX - 6} y1={ankleY} x2={ankleX + 18} y2={ankleY} stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
            {/* Joints */}
            <circle cx={hipX} cy={hipY} r="5" fill={activeGlowColor} />
            <circle cx={kneeX} cy={kneeY} r="5" fill={activeGlowColor} />
          </g>
        );
      }

      case 'hinge':
      case 'hip_thrust': {
        // Romanian Deadlift / Stiff / Hip hinge
        const hipX = lerp(92, 126, c);
        const hipY = lerp(108, 102, c);
        const shoulderX = lerp(162, 130, c);
        const shoulderY = lerp(100, 48, c);
        const kneeX = 124;
        const kneeY = 144;
        const ankleX = 120;
        const ankleY = 182;
        const barX = lerp(154, 134, c);
        const barY = lerp(152, 108, c);

        return (
          <g>
            <line x1="40" y1="186" x2="220" y2="186" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
            {/* Tibia */}
            <line x1={ankleX} y1={ankleY} x2={kneeX} y2={kneeY} stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
            {/* Femur / Hamstrings & Glutes active */}
            <line x1={kneeX} y1={kneeY} x2={hipX} y2={hipY} stroke={activeGlowColor} strokeWidth="10" strokeLinecap="round" />
            {/* Torso */}
            <line x1={hipX} y1={hipY} x2={shoulderX} y2={shoulderY} stroke="#cbd5e1" strokeWidth="8" strokeLinecap="round" />
            {/* Head */}
            <circle cx={shoulderX + 8} cy={shoulderY - 12} r="9" fill="#94a3b8" />
            {/* Arms holding barbell */}
            <line x1={shoulderX} y1={shoulderY} x2={barX} y2={barY} stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
            <circle cx={barX} cy={barY} r="11" fill="#0f172a" stroke="#f59e0b" strokeWidth="3.5" />
            {/* Hip Joint */}
            <circle cx={hipX} cy={hipY} r="6" fill={activeGlowColor} />
          </g>
        );
      }

      case 'knee_extension':
      case 'knee_flexion': {
        const isFlexion = archetype === 'knee_flexion';
        const kneeX = 135;
        const kneeY = 112;
        const angleRad = isFlexion
          ? lerp(-0.15, 1.45, c)
          : lerp(1.45, 0.05, c);
        const ankleX = kneeX + Math.cos(angleRad) * 52;
        const ankleY = kneeY + Math.sin(angleRad) * 52;

        return (
          <g>
            {/* Machine Seat */}
            <path d="M 65 75 L 85 118 L 138 118" fill="none" stroke="#475569" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="85" y1="118" x2="75" y2="182" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
            {/* Torso */}
            <line x1="78" y1="62" x2="92" y2="112" stroke="#cbd5e1" strokeWidth="8" strokeLinecap="round" />
            <circle cx="74" cy="46" r="9" fill="#94a3b8" />
            {/* Thigh (Target Muscle) */}
            <line x1="92" y1="112" x2={kneeX} y2={kneeY} stroke={activeGlowColor} strokeWidth="11" strokeLinecap="round" />
            {/* Lower leg moving */}
            <line x1={kneeX} y1={kneeY} x2={ankleX} y2={ankleY} stroke="#e2e8f0" strokeWidth="7" strokeLinecap="round" />
            {/* Roller Pad */}
            <circle cx={ankleX} cy={ankleY} r="7" fill="#f59e0b" />
            {/* Pivot */}
            <circle cx={kneeX} cy={kneeY} r="5.5" fill={activeGlowColor} />
          </g>
        );
      }

      case 'horizontal_press':
      case 'chest_fly': {
        // Bench press / Chest press view
        const shoulderX = 105;
        const shoulderY = 128;
        const handY = lerp(118, 52, c);
        const elbowX = lerp(78, 98, c);
        const elbowY = lerp(142, 88, c);

        return (
          <g>
            {/* Flat/Incline Bench */}
            <line x1="55" y1="142" x2="195" y2="142" stroke="#475569" strokeWidth="7" strokeLinecap="round" />
            <line x1="75" y1="142" x2="75" y2="184" stroke="#334155" strokeWidth="5" />
            <line x1="175" y1="142" x2="175" y2="184" stroke="#334155" strokeWidth="5" />
            {/* Athlete Torso on Bench (Chest highlighted) */}
            <line x1="95" y1="130" x2="160" y2="130" stroke={activeGlowColor} strokeWidth="12" strokeLinecap="round" />
            <circle cx="76" cy="126" r="9" fill="#94a3b8" />
            {/* Humerus */}
            <line x1={shoulderX} y1={shoulderY} x2={elbowX} y2={elbowY} stroke={activeGlowColor} strokeWidth="7" strokeLinecap="round" />
            {/* Forearm */}
            <line x1={elbowX} y1={elbowY} x2={shoulderX} y2={handY} stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
            {/* Barbell / Dumbbell */}
            <circle cx={shoulderX} cy={handY} r="10" fill="#0f172a" stroke="#f59e0b" strokeWidth="3.5" />
            {/* Vertical force line */}
            <line x1={shoulderX} y1="35" x2={shoulderX} y2="135" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          </g>
        );
      }

      case 'vertical_pull':
      case 'horizontal_row': {
        const isVertical = archetype === 'vertical_pull';
        const shoulderX = 125;
        const shoulderY = 98;
        const handX = isVertical ? 125 : lerp(188, 128, c);
        const handY = isVertical ? lerp(32, 92, c) : 102;
        const elbowX = isVertical ? lerp(112, 102, c) : lerp(158, 96, c);
        const elbowY = isVertical ? lerp(62, 118, c) : lerp(102, 112, c);

        return (
          <g>
            {/* Cable line */}
            <line
              x1={isVertical ? 125 : 210}
              y1={isVertical ? 15 : 102}
              x2={handX}
              y2={handY}
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
            {/* Torso (Back / Lats highlighted) */}
            <line x1="125" y1="92" x2="122" y2="155" stroke={activeGlowColor} strokeWidth="12" strokeLinecap="round" />
            <circle cx="126" cy="72" r="9" fill="#94a3b8" />
            {/* Upper Arm */}
            <line x1={shoulderX} y1={shoulderY} x2={elbowX} y2={elbowY} stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
            {/* Forearm */}
            <line x1={elbowX} y1={elbowY} x2={handX} y2={handY} stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
            {/* Handle */}
            <circle cx={handX} cy={handY} r="6" fill="#f59e0b" />
            <circle cx={elbowX} cy={elbowY} r="5" fill={activeGlowColor} />
          </g>
        );
      }

      case 'overhead_press':
      case 'lateral_raise': {
        const isLateral = archetype === 'lateral_raise';
        const shoulderY = 94;
        const leftShoulderX = 106;
        const rightShoulderX = 154;

        const armY = isLateral ? lerp(142, 86, c) : lerp(92, 34, c);
        const leftHandX = isLateral ? lerp(92, 52, c) : 96;
        const rightHandX = isLateral ? lerp(168, 208, c) : 164;

        return (
          <g>
            {/* Torso */}
            <line x1="130" y1="88" x2="130" y2="165" stroke="#cbd5e1" strokeWidth="14" strokeLinecap="round" />
            <circle cx="130" cy="66" r="10" fill="#94a3b8" />
            {/* Shoulders Deltoid Caps */}
            <circle cx={leftShoulderX} cy={shoulderY} r="8" fill={activeGlowColor} />
            <circle cx={rightShoulderX} cy={shoulderY} r="8" fill={activeGlowColor} />
            {/* Arms */}
            <line x1={leftShoulderX} y1={shoulderY} x2={leftHandX} y2={armY} stroke={activeGlowColor} strokeWidth="6.5" strokeLinecap="round" />
            <line x1={rightShoulderX} y1={shoulderY} x2={rightHandX} y2={armY} stroke={activeGlowColor} strokeWidth="6.5" strokeLinecap="round" />
            {/* Dumbbells */}
            <circle cx={leftHandX} cy={armY} r="6" fill="#f59e0b" />
            <circle cx={rightHandX} cy={armY} r="6" fill="#f59e0b" />
          </g>
        );
      }

      case 'biceps_curl':
      case 'triceps_pressdown': {
        const isBiceps = archetype === 'biceps_curl';
        const shoulderX = 115;
        const shoulderY = 74;
        const elbowX = 118;
        const elbowY = 122;
        // Forearm arc around fixed elbow
        const angle = isBiceps
          ? lerp(1.35, -0.85, c)
          : lerp(-0.65, 1.35, c);
        const handX = elbowX + Math.cos(angle) * 46;
        const handY = elbowY + Math.sin(angle) * 46;

        return (
          <g>
            {/* Torso */}
            <line x1="110" y1="68" x2="110" y2="168" stroke="#64748b" strokeWidth="12" strokeLinecap="round" />
            <circle cx="112" cy="48" r="9" fill="#94a3b8" />
            {/* Fixed Humerus (Biceps/Triceps highlighted) */}
            <line x1={shoulderX} y1={shoulderY} x2={elbowX} y2={elbowY} stroke={activeGlowColor} strokeWidth="10" strokeLinecap="round" />
            {/* Moving Forearm */}
            <line x1={elbowX} y1={elbowY} x2={handX} y2={handY} stroke="#f8fafc" strokeWidth="7" strokeLinecap="round" />
            {/* Fixed Elbow Pivot */}
            <circle cx={elbowX} cy={elbowY} r="5.5" fill="#38bdf8" />
            {/* Load in hand */}
            <circle cx={handX} cy={handY} r="7.5" fill="#f59e0b" />
          </g>
        );
      }

      case 'calf_raise':
      case 'core_flexion':
      default: {
        const liftY = lerp(0, -24, c);
        return (
          <g>
            <line x1="55" y1="176" x2="205" y2="176" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
            <line x1="130" y1={70 + liftY} x2="130" y2={135 + liftY} stroke="#cbd5e1" strokeWidth="10" strokeLinecap="round" />
            <circle cx="130" cy={50 + liftY} r="9" fill="#94a3b8" />
            <line x1="130" y1={135 + liftY} x2="130" y2={172 + liftY * 0.4} stroke={activeGlowColor} strokeWidth="10" strokeLinecap="round" />
            <circle cx="130" cy={150 + liftY * 0.6} r="6" fill={activeGlowColor} />
          </g>
        );
      }
    }
  };

  return (
    <div className="rounded-2xl bg-[#070c18] border border-sky-500/30 p-3 sm:p-3.5 space-y-3 shadow-inner">
      {/* Top Bar: Title + Mode Switcher + Playback Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-black uppercase tracking-wider">
            <Video className="w-3 h-3 text-sky-400" />
            <span>Lottie 5s · Loop Biomecânico</span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            ID: {exercise.id} {isMappedDirectly ? '✓ JSON' : '· Auto'}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {secondsDisplay}s / 5.0s
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Play / Pause */}
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="h-7 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title={isPlaying ? 'Pausar animação Lottie' : 'Reproduzir animação Lottie'}
          >
            {isPlaying ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
            <span>{isPlaying ? 'Pausar' : 'Play'}</span>
          </button>

          {/* Speed Toggle (1x vs 0.5x Slow Motion) */}
          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 0.5 : 1))}
            className={`h-7 px-2 rounded-lg text-[11px] font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
              speed === 0.5
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Alternar velocidade normal (1.0x) ou câmera lenta biomecânica (0.5x)"
          >
            <Gauge className="w-3 h-3" />
            <span>{speed}x</span>
          </button>

          {/* Mode Toggle: Lottie JSON vs Vetor Articulado vs GIF Externo */}
          <button
            type="button"
            onClick={() =>
              setViewMode((m) => (m === 'lottie' ? 'animation' : 'lottie'))
            }
            className={`h-7 px-2 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
              viewMode === 'lottie'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-sky-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Alternar entre Player Lottie JSON e Esqueleto Cinemático SVG"
          >
            <Layers className="w-3 h-3" />
            <span>{viewMode === 'lottie' ? 'Lottie JSON' : 'Vetor SVG'}</span>
          </button>

          {/* Custom GIF/Video Toggle */}
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'custom_gif' ? 'lottie' : 'custom_gif'))}
            className={`h-7 px-2 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
              viewMode === 'custom_gif'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Alternar para GIF/Vídeo Externo"
          >
            <Link2 className="w-3 h-3" />
            <span>{viewMode === 'custom_gif' ? 'Voltar ao Lottie' : 'GIF Externo'}</span>
          </button>
        </div>
      </div>

      {/* Main Viewport: Lottie-React JSON Player, Kinematic SVG, OR Custom GIF/MP4 */}
      {viewMode !== 'custom_gif' ? (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Animated Viewport (Lottie-React or SVG) */}
          <div className="sm:col-span-6 relative rounded-xl bg-gradient-to-b from-[#0b1326] to-[#060a14] border border-slate-800/90 h-48 flex items-center justify-center overflow-hidden">
            {viewMode === 'lottie' ? (
              <div className="w-full h-full flex items-center justify-center relative">
                {/* Subtle background grid behind Lottie player */}
                <svg className="absolute inset-0 w-full h-full opacity-50 pointer-events-none" viewBox="0 0 260 200">
                  <defs>
                    <pattern id={`lottie_grid_${exercise.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.6" />
                    </pattern>
                  </defs>
                  <rect width="260" height="200" fill={`url(#lottie_grid_${exercise.id})`} />
                </svg>
                <Lottie
                  lottieRef={lottieRef}
                  src={lottieAnimationData}
                  loop={true}
                  autoplay={isPlaying}
                  speed={speed}
                  className="w-full h-full max-w-[240px] max-h-[185px] relative z-10"
                />
              </div>
            ) : (
              <svg className="w-full h-full max-w-[260px]" viewBox="0 0 260 200">
                <defs>
                  <pattern id={`grid_${exercise.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.6" />
                  </pattern>
                </defs>
                <rect width="260" height="200" fill={`url(#grid_${exercise.id})`} />
                {renderBiomechanicalSvg()}
              </svg>
            )}

            {/* Live Overlay Badges */}
            <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md bg-slate-950/85 border border-slate-800 text-[10px] font-mono text-slate-300">
              Alvo: <strong className="text-emerald-400">{muscleName}</strong>
            </div>

            <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-md bg-slate-950/85 border border-slate-800 text-[10px] font-mono text-amber-300">
              EMG ~{emgActivation}% · {jointAngle}°
            </div>

            <div className={`absolute bottom-2 left-2 right-2 z-20 px-2.5 py-1 rounded-lg border text-[10px] font-black text-center truncate ${phaseColor}`}>
              {phaseLabel}
            </div>
          </div>

          {/* Right Column: Cadence Timeline & Biomechanical Cues */}
          <div className="sm:col-span-6 space-y-2.5 text-xs">
            {/* 5s Loop Progress Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>Ciclo de 1 Repetição (Cadência 3-1-1)</span>
                <span className="text-sky-400 font-bold">{Math.round(cycleProgress * 100)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className={`h-full bg-gradient-to-r ${phaseBarColor} transition-none`}
                  style={{ width: `${Math.round(cycleProgress * 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-1 mt-2 text-[9px] font-mono text-center">
                <div className={`p-1 rounded border ${cycleProgress < 0.52 ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 font-bold' : 'bg-slate-950/60 border-slate-800 text-slate-500'}`}>
                  1. Excêntrica (3s)
                </div>
                <div className={`p-1 rounded border ${cycleProgress >= 0.52 && cycleProgress < 0.64 ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold' : 'bg-slate-950/60 border-slate-800 text-slate-500'}`}>
                  2. Transição (0.5s)
                </div>
                <div className={`p-1 rounded border ${cycleProgress >= 0.64 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-950/60 border-slate-800 text-slate-500'}`}>
                  3. Concêntrica (1.5s)
                </div>
              </div>
            </div>

            {!compact && (
              <>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block mb-0.5">
                    🎯 Foco Anatômico ({exercise.target}):
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {exercise.bio}
                  </p>
                </div>

                <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 mb-0.5">
                    <Sparkles className="w-3 h-3" />
                    <span>Dica Prática na Série:</span>
                  </span>
                  <p className="text-[11px] text-emerald-200 font-medium leading-relaxed">
                    &ldquo;{exercise.cue}&rdquo;
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Custom External GIF / MP4 URL Mode */
        <div className="space-y-3">
          {customGifUrl ? (
            <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-2">
              {customGifUrl.endsWith('.mp4') || customGifUrl.endsWith('.webm') ? (
                <video
                  src={customGifUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="max-h-52 rounded-lg object-contain"
                />
              ) : (
                <img
                  src={customGifUrl}
                  alt={`Demonstração de ${exercise.name}`}
                  className="max-h-52 rounded-lg object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-center text-xs text-slate-400">
              Cole abaixo o link de um GIF ou vídeo curto (.mp4/.gif) personalizado para este exercício, ou use a Animação Vetorial 5s nativa.
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="url"
              placeholder="https://exemplo.com/execucao.gif ou .mp4"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleSaveCustomGif}
              className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs cursor-pointer transition-colors flex items-center gap-1"
            >
              {savedUrlToast ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{savedUrlToast ? 'Salvo!' : 'Salvar GIF'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
