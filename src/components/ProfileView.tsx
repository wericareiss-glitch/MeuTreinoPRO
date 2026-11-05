/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Scale, 
  Ruler, 
  Lock, 
  LogOut, 
  Sliders, 
  Save, 
  KeyRound, 
  Check, 
  AlertCircle,
  Globe,
  Download,
  Upload,
  Calendar,
  Share2,
  Trash2,
  Award,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Target,
  Dumbbell,
  Users,
  MoreVertical,
  X,
  FileSpreadsheet,
  Flame
} from 'lucide-react';
import { 
  UserProfile, 
  WorkoutSessionSummary, 
  MuscleGroup, 
  GenderOption, 
  LevelOption, 
  FocusOption,
  SplitOption,
  StrategyOption,
  EquipmentRequirement
} from '../types/workout';
import { authStorage, ALL_MUSCLE_GROUPS, calculateDefaultBudget, getPresetWeights, scaleWeightsToBudget } from '../utils/auth';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { useI18n, Language } from '../utils/i18n';
import { PWAInstallButton } from './PWAInstallButton';
import { ConsistencyCalendar } from './ConsistencyCalendar';
import { ThemeToggle } from './ThemeToggle';
import { ProfilePushNotificationManager } from './ProfilePushNotificationManager';
import { FirebaseSyncCard } from './FirebaseSyncCard';
import { PrivacyShieldControl } from './PrivacyShieldControl';
import { BiometricSettingsCard } from './BiometricSettingsCard';
import {
  usePrivacyMode,
  maskSensitiveValue,
  maskUsername,
  maskDisplayName,
} from '../utils/privacy';

interface ProfileViewProps {
  user: UserProfile;
  sessions: WorkoutSessionSummary[];
  onUpdateUser: (updated: UserProfile) => void;
  onLogout: () => void;
  onOpenVolumeBudget: () => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onViewSummary: (session: WorkoutSessionSummary) => void;
  onClearHistory: () => void;
  onDeleteProfile?: (userId: string) => void;
  onSwitchProfile?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  sessions,
  onUpdateUser,
  onLogout,
  onOpenVolumeBudget,
  onExportBackup,
  onImportBackup,
  onViewSummary,
  onClearHistory,
  onDeleteProfile,
  onSwitchProfile,
}) => {
  const { t, language } = useI18n();
  const { isPrivacyHidden } = usePrivacyMode();

  // Personal data editing state
  const [name, setName] = useState(user.name);
  const [weightKg, setWeightKg] = useState(user.weightKg);
  const [heightM, setHeightM] = useState(user.heightM);
  const [age, setAge] = useState<number>(user.age || 28);
  const [bodyFatPercent, setBodyFatPercent] = useState<number | undefined>(user.bodyFatPercent);
  const [gender, setGender] = useState<GenderOption>(user.gender || 'male');
  const [level, setLevel] = useState<LevelOption>(user.level || 'beginner');
  const [focus, setFocus] = useState<FocusOption>(user.focus || 'v_taper');
  const [frequency, setFrequency] = useState<number>(user.frequency || 4);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // RIR alvo por grupo muscular (Periodização Granular)
  const [muscleTargetRir, setMuscleTargetRir] = useState<Partial<Record<MuscleGroup, number>>>(() => user.muscleTargetRir || {});
  const [rirSavedSuccess, setRirSavedSuccess] = useState(false);

  // Change password state
  const [showPassChange, setShowPassChange] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ text: string; error: boolean } | null>(null);

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertName, setConvertName] = useState(user.name);
  const [convertUsername, setConvertUsername] = useState('');
  const [convertPassword, setConvertPassword] = useState('');
  const [convertError, setConvertError] = useState<string | null>(null);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleExportCSV = () => {
    if (sessions.length === 0) return;
    const headers = [
      'Data',
      'Divisao',
      'Duracao (min)',
      'Tonelagem Total (kg)',
      'Exercicio',
      'Musculo',
      'Serie',
      'Carga (kg)',
      'Repeticoes',
      'RPE',
      'RIR',
      'Observacoes'
    ];

    const rows: string[][] = [];

    sessions.forEach((s) => {
      const dateStr = new Date(s.date).toLocaleDateString('pt-BR');
      const estDurationMin = Math.round((s.totalSets || 0) * 2.2);
      const cleanNotes = (s.notes || '').replace(/"/g, '""');

      s.completedExercises.forEach((ex) => {
        ex.sets.forEach((set, setIdx) => {
          rows.push([
            `"${dateStr}"`,
            `"${(s.splitName || '').replace(/"/g, '""')}"`,
            `"${estDurationMin}"`,
            `"${s.totalVolumeLoadKg || 0}"`,
            `"${ex.name.replace(/"/g, '""')}"`,
            `"${(ex.muscleGroup || (ex as any).muscleKey || '').replace(/"/g, '""')}"`,
            `"${setIdx + 1}"`,
            `"${set.weight}"`,
            `"${set.reps}"`,
            `"${set.rpe || ''}"`,
            `"${set.rir || ''}"`,
            `"${cleanNotes}"`
          ]);
        });
      });
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meutreino_pro_historico_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  // IMC (BMI) calculation
  const imcNum = heightM > 0 ? weightKg / (heightM * heightM) : 0;
  const imcStr = imcNum > 0 ? imcNum.toFixed(1) : '0';

  const getBMICategory = (bmi: number) => {
    if (bmi === 0) return { label: '-', color: 'text-slate-400' };
    if (bmi < 18.5) return { label: t.bmiUnderweight, color: 'text-sky-400' };
    if (bmi < 25) return { label: t.bmiNormal, color: 'text-emerald-400' };
    if (bmi < 30) return { label: t.bmiOverweight, color: 'text-amber-400' };
    return { label: t.bmiObese, color: 'text-rose-400' };
  };

  const bmiCat = getBMICategory(imcNum);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = authStorage.updateProfile(user.id, {
      name: name.trim(),
      weightKg,
      heightM,
      age,
      bodyFatPercent,
      gender,
      level,
      focus,
      frequency,
      muscleTargetRir,
    });
    if (updated) {
      onUpdateUser(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2200);
    }
  };

  const handleSaveTargetRir = () => {
    const updated = authStorage.updateProfile(user.id, {
      muscleTargetRir,
    });
    if (updated) {
      onUpdateUser(updated);
      setRirSavedSuccess(true);
      setTimeout(() => setRirSavedSuccess(false), 2200);
    }
  };

  const handleApplyHypertrophyDefaultRir = () => {
    const defaultRir: Partial<Record<MuscleGroup, number>> = {
      chest: 1,
      back: 1,
      quadriceps: 1,
      hamstrings: 1,
      shoulders: 1,
      rear_delts: 1,
      biceps: 1,
      triceps: 1,
      glutes: 1,
      calves: 0,
      abs: 0,
    };
    setMuscleTargetRir(defaultRir);
    const updated = authStorage.updateProfile(user.id, {
      muscleTargetRir: defaultRir,
    });
    if (updated) {
      onUpdateUser(updated);
      setRirSavedSuccess(true);
      setTimeout(() => setRirSavedSuccess(false), 2200);
    }
  };

  // Recalcula as séries automaticamente com base no nível, sexo e foco
  const handleApplyRecommendedBudget = () => {
    const recommendedBudget = calculateDefaultBudget(level, gender);
    const weights = getPresetWeights(focus);
    const newBudgets = scaleWeightsToBudget(weights, recommendedBudget);

    const updated = authStorage.updateProfile(user.id, {
      gender,
      level,
      focus,
      frequency,
      weeklyBudget: recommendedBudget,
      muscleBudgets: newBudgets,
    });
    if (updated) {
      onUpdateUser(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2200);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    const res = authStorage.changePassword(user.id, oldPass, newPass);
    if (!res.success) {
      setPassMsg({ text: res.error || 'Erro', error: true });
    } else {
      setPassMsg({ text: 'Senha alterada com sucesso!', error: false });
      setOldPass('');
      setNewPass('');
      setTimeout(() => {
        setPassMsg(null);
        setShowPassChange(false);
      }, 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Profile Header Card */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {maskDisplayName(user.name, isPrivacyHidden)}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {t.badgePro}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {maskUsername(user.username, isPrivacyHidden)}
              </p>
            </div>
          </div>

          {/* Action Zone: Theme Toggle, 3-Dots Menu on Mobile & Clean Desktop Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <ThemeToggle variant="segmented" />

            {/* Desktop Quick Buttons */}
            {onSwitchProfile && (
              <button
                type="button"
                onClick={onSwitchProfile}
                className="hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold text-sky-300 bg-sky-950/20 hover:bg-sky-950/40 border border-sky-900/40 items-center gap-1.5 transition-all cursor-pointer"
                title="Trocar de conta/atleta"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Trocar Perfil</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Desconectar</span>
            </button>

            {onDeleteProfile && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(true)}
                className="hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 items-center gap-1.5 transition-all cursor-pointer"
                title="Excluir perfil permanentemente"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Perfil</span>
              </button>
            )}

            {/* Mobile 3-Dots Menu Trigger */}
            <div className="relative sm:hidden" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="w-9 h-9 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-sm"
                title="Opções do perfil"
                aria-label="Opções do perfil"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-10 w-52 bg-[#0c1424] border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-40 animate-fadeIn space-y-1">
                  {onSwitchProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onSwitchProfile();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-950/40 text-left transition-colors cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Trocar Perfil / Atleta</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Desconectar</span>
                  </button>

                  {onDeleteProfile && (
                    <div className="pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowDeleteConfirmModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 text-left transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Excluir Perfil</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visitor Warning & Promotion Banner */}
        {user.isVisitor && (
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#101b31] to-sky-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white">Você está como Visitante</h3>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Crie sua conta definitiva (com nome de usuário e senha) para nunca perder seus treinos e registros.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowConvertModal(true)}
              className="px-4 py-2 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              Criar Conta Permanente
            </button>
          </div>
        )}

        {/* Central de Privacidade & Proteção de Dados Sensíveis */}
        <div className="mt-5">
          <PrivacyShieldControl user={user} variant="banner" />
        </div>

        {/* Edit Body Metrics Form */}
        <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
          {isPrivacyHidden ? (
            <div className="p-4 rounded-2xl bg-[#0a101d] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-1">
                <div className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{t.nameLabel}</span>
                  <span className="text-xs font-mono font-bold text-slate-300">{maskDisplayName(name, true)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{t.weightLabel}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{maskSensitiveValue(weightKg, 'kg', true)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{t.heightLabel}</span>
                  <span className="text-xs font-mono font-bold text-sky-400">{maskSensitiveValue(heightM, 'm', true)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Idade</span>
                  <span className="text-xs font-mono font-bold text-amber-400">{maskSensitiveValue(age, 'anos', true)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block">% Gordura & IMC</span>
                  <span className="text-xs font-mono font-bold text-rose-400">{maskSensitiveValue(bodyFatPercent, '%', true)}</span>
                </div>
              </div>
              <PrivacyShieldControl user={user} variant="inline" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Full Name */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0a101d] border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Body Weight */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.weightLabel}</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a101d] border border-slate-700/80 rounded-xl pl-3 pr-8 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-2.5 text-xs text-slate-500 font-mono">kg</span>
                </div>
              </div>

              {/* Height */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.heightLabel}</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.01"
                    value={heightM}
                    onChange={(e) => setHeightM(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a101d] border border-slate-700/80 rounded-xl pl-3 pr-8 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-2.5 text-xs text-slate-500 font-mono">m</span>
                </div>
              </div>

              {/* Idade */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Idade</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="1"
                    min="12"
                    max="100"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value, 10) || 25)}
                    className="w-full bg-[#0a101d] border border-slate-700/80 rounded-xl pl-3 pr-10 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-2.5 text-xs text-slate-500 font-mono">anos</span>
                </div>
              </div>

              {/* % Gordura Corporal (Opcional) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>% Gordura</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Opcional</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.5"
                    min="3"
                    max="60"
                    placeholder="Ex: 14"
                    value={bodyFatPercent !== undefined ? bodyFatPercent : ''}
                    onChange={(e) => setBodyFatPercent(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[#0a101d] border border-slate-700/80 rounded-xl pl-3 pr-8 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-2.5 text-xs text-slate-500 font-mono">%</span>
                </div>
              </div>
            </div>
          )}

          {/* 1. SELEÇÃO DE SEXO */}
          <div className="bg-[#0b1220] p-3.5 rounded-2xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              <span>Sexo Biológico</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  gender === 'male'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span className="text-base">👨</span>
                <span>Masculino</span>
              </button>

              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  gender === 'female'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span className="text-base">👩</span>
                <span>Feminino</span>
              </button>
            </div>
          </div>

          {/* 2. SELEÇÃO DE NÍVEL DE TREINO */}
          <div className="bg-[#0b1220] p-3.5 rounded-2xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Nível de Experiência</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLevel('beginner')}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  level === 'beginner'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md font-black'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white font-bold'
                }`}
              >
                <span className="block text-xs">Iniciante</span>
              </button>

              <button
                type="button"
                onClick={() => setLevel('intermediate')}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  level === 'intermediate'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md font-black'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white font-bold'
                }`}
              >
                <span className="block text-xs">Intermediário</span>
              </button>

              <button
                type="button"
                onClick={() => setLevel('advanced')}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  level === 'advanced'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md font-black'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white font-bold'
                }`}
              >
                <span className="block text-xs">Avançado</span>
              </button>
            </div>
          </div>

          {/* 3. SELEÇÃO DE FOCO DO TREINO */}
          <div className="bg-[#0b1220] p-3.5 rounded-2xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-rose-400" />
              <span>Foco Principal do Treino</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFocus('glutes')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  focus === 'glutes'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>🍑</span>
                  <span>Glúteos & Pernas</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                  Ênfase máxima em glúteo, posterior e pernas
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFocus('strength')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  focus === 'strength'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>🏋️</span>
                  <span>Força & Cargas</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                  Foco em cargas progressivas e grandes compostos
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFocus('v_taper')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  focus === 'v_taper'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>🔱</span>
                  <span>Shape em V</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                  Costas largas, ombros e peitoral em destaque
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFocus('balanced')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  focus === 'balanced'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>⚖️</span>
                  <span>Equilíbrio Total</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                  Harmonia e simetria para o corpo inteiro
                </span>
              </button>
            </div>
          </div>

          {/* 4. SELEÇÃO DE FREQUÊNCIA SEMANAL */}
          <div className="bg-[#0b1220] p-3.5 rounded-2xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>4. Frequência Semanal</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-sky-400">
                {frequency}x por semana
              </span>
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq)}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                    frequency === freq
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md font-black'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="block text-xs font-bold">{freq}x</span>
                  <span className="text-[9px] block text-slate-500 font-normal">dias</span>
                </button>
              ))}
            </div>
          </div>

          {/* BMI Info pill & Save CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="bg-[#0a101d] px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-2 text-xs">
              <span className="text-slate-400">{t.bmiLabel}:</span>
              <span className="font-mono font-bold text-white">
                {isPrivacyHidden ? '••••' : imcStr}
              </span>
              {!isPrivacyHidden && (
                <span className={`font-semibold ${bmiCat.color}`}>({bmiCat.label})</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleApplyRecommendedBudget}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Aplica e calibra automaticamente as séries ideais e distribui conforme o foco selecionado"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Otimizar Séries por Foco</span>
              </button>

              {savedSuccess && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>{t.profileSavedSuccess}</span>
                </span>
              )}

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{t.saveProfileBtn}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Change Password Dropdown */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          {!showPassChange ? (
            <button
              type="button"
              onClick={() => setShowPassChange(true)}
              className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>{t.changePasswordBtn}</span>
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3 bg-[#0a101d] p-4 rounded-2xl border border-slate-800 max-w-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  {t.changePasswordBtn}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassChange(false)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {t.closeBtn}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="password"
                  placeholder={t.oldPasswordLabel}
                  required
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  className="bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="password"
                  placeholder={t.newPasswordLabel}
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {passMsg && (
                <p className={`text-xs ${passMsg.error ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {passMsg.text}
                </p>
              )}

              <button
                type="submit"
                className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                {t.savePasswordBtn}
              </button>
            </form>
          )}
        </div>
      </div>




      {/* Metas & Séries Semanais */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {t.budgetSectionTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {t.budgetSectionSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenVolumeBudget}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Sliders className="w-4 h-4" />
            <span>{t.budgetAdjustBtn}</span>
          </button>
        </div>

        {/* Total Budget KPI */}
        <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {t.budgetCeilingLabel}
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {user.weeklyBudget || 88} <span className="text-sm font-normal text-slate-400">{t.seriesLabel} / semana</span>
            </span>
          </div>

          <div className="text-xs text-slate-300 bg-[#101828] px-4 py-2.5 rounded-xl border border-slate-800 max-w-sm">
            <span className="text-emerald-400 font-bold block mb-0.5">Capacidade Recuperativa Adaptativa</span>
            Volume distribuído matematicamente entre os 11 grupos musculares para hipertrofia sem sobretreino.
          </div>
        </div>

        {/* 11 Muscle groups distribution breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {ALL_MUSCLE_GROUPS.map((m) => {
            const targetSets = user.muscleBudgets?.[m] || 8;
            const pct = user.weeklyBudget > 0 ? Math.round((targetSets / user.weeklyBudget) * 100) : 0;
            const muscleName = t.muscles[m] || MUSCLE_NAMES[m];

            return (
              <div
                key={m}
                className="bg-[#0a101d] p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {muscleName}
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {targetSets}s
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, pct * 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIR ALVO POR GRUPO MUSCULAR (Periodização Granular) */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  RIR Alvo por Grupo Muscular
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Periodização Fina
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Defina quantas repetições na reserva (RIR) cada músculo deve buscar antes de encerrar a série
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleApplyHypertrophyDefaultRir}
              className="px-3.5 py-2 rounded-xl font-bold text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Aplica RIR 1-2 para grandes compostos e RIR 0-1 para isoladores/braços"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Padrão Hipertrofia (RIR 1-2)</span>
            </button>

            <button
              type="button"
              onClick={handleSaveTargetRir}
              className="px-4 py-2 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar RIR</span>
            </button>
          </div>
        </div>

        {/* Guia Rápido de RIR / RPE */}
        <div className="bg-[#0a101d] p-3.5 rounded-2xl border border-slate-800 mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
              <span className="font-mono font-black block">RIR 0 · RPE 10</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Falha mecânica total</span>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <span className="font-mono font-black block">RIR 1 · RPE 9</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">1 rep sobra (máx. hipertrofia)</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <span className="font-mono font-black block">RIR 2 · RPE 8</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">2 reps sobram (estímulo limpo)</span>
            </div>
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300">
              <span className="font-mono font-black block">RIR 3 · RPE 7</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">3 reps sobram (técnico/força)</span>
            </div>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 col-span-2 sm:col-span-1">
              <span className="font-mono font-black block">RIR 4 · RPE 6</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Recuperativo / Submáximo</span>
            </div>
          </div>
        </div>

        {/* 11 Muscle Target RIR Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ALL_MUSCLE_GROUPS.map((m) => {
            const currentRir = muscleTargetRir[m] !== undefined ? muscleTargetRir[m]! : 1;
            const muscleName = t.muscles[m] || MUSCLE_NAMES[m];

            return (
              <div
                key={m}
                className="bg-[#0a101d] p-3 rounded-2xl border border-slate-800/90 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white block truncate">
                    {muscleName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block">
                    Alvo: <strong className="text-amber-400">RIR {currentRir}</strong> (RPE {10 - currentRir})
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {[0, 1, 2, 3, 4].map((rirVal) => {
                    const isSelected = currentRir === rirVal;
                    let badgeColor = 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white';
                    if (isSelected) {
                      if (rirVal === 0) badgeColor = 'bg-rose-500 text-slate-950 font-black shadow-sm ring-1 ring-rose-400';
                      else if (rirVal === 1) badgeColor = 'bg-amber-400 text-slate-950 font-black shadow-sm ring-1 ring-amber-300';
                      else if (rirVal === 2) badgeColor = 'bg-emerald-400 text-slate-950 font-black shadow-sm ring-1 ring-emerald-300';
                      else if (rirVal === 3) badgeColor = 'bg-sky-400 text-slate-950 font-black shadow-sm ring-1 ring-sky-300';
                      else badgeColor = 'bg-purple-400 text-slate-950 font-black shadow-sm ring-1 ring-purple-300';
                    }

                    return (
                      <button
                        key={rirVal}
                        type="button"
                        onClick={() => {
                          setMuscleTargetRir((prev) => ({
                            ...prev,
                            [m]: rirVal,
                          }));
                        }}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${badgeColor}`}
                        title={`${muscleName}: RIR ${rirVal} (RPE ${10 - rirVal})`}
                      >
                        {rirVal}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {rirSavedSuccess && (
          <div className="mt-4 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>RIR alvo por grupo muscular salvo com sucesso! O motor de periodização já está calibrado.</span>
          </div>
        )}
      </div>


      {/* 🎨 Aparência & Tema Visual (Alternância Dark / Light Forçada) */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Aparência & Tema Visual
              </h2>
              <p className="text-xs text-slate-400">
                Escolha entre o modo escuro ou claro para treinar com mais conforto visual.
              </p>
            </div>
          </div>
          <ThemeToggle variant="segmented" />
        </div>

        <ThemeToggle variant="profile-card" />
      </div>

      {/* 🔐 Desbloqueio Biométrico (Face ID / Impressão Digital via WebAuthn) */}
      <BiometricSettingsCard user={user} variant="full" />

      {/* ☁️ Sincronização em Nuvem (Firebase Firestore) */}
      <FirebaseSyncCard user={user} />

      {/* 🔔 Gerenciador de Permissões e Lembretes Personalizados via Notificações Push Nativa */}
      <ProfilePushNotificationManager
        userId={user.id}
        userName={user.name}
        sessions={sessions}
      />

      {/* Organizar Treinos & Ferramentas */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              {t.toolsSectionTitle}
            </h2>
            <p className="text-xs text-slate-400">
              {t.toolsSectionSubtitle}
            </p>
          </div>
        </div>

        {/* PWA Install Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0a101d] to-[#0a101d] border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Instalar Aplicativo Oficial</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Acesse direto da tela inicial do celular com tela cheia e funcionamento sem internet.
              </p>
            </div>
          </div>
          <PWAInstallButton variant="full" className="shrink-0 sm:w-auto text-xs py-2 px-3.5" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {/* Armazenamento Seguro no Aparelho */}
          <div className="p-4 rounded-2xl bg-[#0a101d] border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Protegido & Sem Internet
                </span>
              </div>
              <h3 className="text-xs font-bold text-white mb-1">
                Memória de Alta Capacidade no Aparelho
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Todo o seu histórico de treinos, cargas e evolução fica salvo automaticamente no seu aparelho e funciona mesmo sem sinal de internet.
              </p>
            </div>
          </div>

          {/* Backup */}
          <div className="p-4 rounded-2xl bg-[#0a101d] border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Download className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-xs font-bold text-white mb-1">{t.toolBackup}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{t.toolBackupDesc}</p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onExportBackup}
                  className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Salvar cópia de segurança dos seus treinos"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Salvar Cópia</span>
                </button>

                <label className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer text-center">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Restaurar</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={onImportBackup}
                    className="hidden"
                  />
                </label>
              </div>

              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full py-1.5 px-2 rounded-xl text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Baixar histórico de treinos em planilha para Excel ou Google Planilhas"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Baixar Planilha (Excel)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calendário de Consistência & Histórico de Dias Treinados */}
      <ConsistencyCalendar
        sessions={sessions}
        weeklyFrequencyGoal={user.frequency || 4}
      />

      {/* Histórico Geral do Perfil */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {t.profileHistoryTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {t.profileHistorySubtitle} ({sessions.length} {sessions.length === 1 ? 'treino' : 'treinos'})
              </p>
            </div>
          </div>

          {sessions.length > 0 && (
            confirmClearHistory ? (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] font-bold text-rose-400">Apagar tudo?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setConfirmClearHistory(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-500 hover:bg-rose-400 text-slate-950 transition-colors cursor-pointer"
                >
                  Sim, apagar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearHistory(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearHistory(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/30 border border-rose-900/40 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.clearHistoryBtn}</span>
              </button>
            )
          )}
        </div>

        {sessions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            {t.historyEmptyTitle}
          </p>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="bg-[#0a101d] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 shrink-0">
                    {sess.splitName}
                  </span>
                  <span className="text-xs text-slate-400 font-mono truncate">
                    {new Date(sess.date).toLocaleDateString(
                      language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR',
                      { day: '2-digit', month: 'short', year: 'numeric' }
                    )}
                  </span>
                  <span className="text-xs text-emerald-400 font-mono font-bold shrink-0">
                    {sess.totalVolumeLoadKg.toLocaleString()} kg
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onViewSummary(sess)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Resumo</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Deixar de ser Visitante e Criar Conta Permanente */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#101828] border border-amber-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Criar Conta Definitiva</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Defina seu nome de usuário e senha para salvar todos os seus treinos e configurações de forma permanente.
            </p>

            {convertError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs">
                {convertError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setConvertError(null);
                const res = authStorage.convertVisitorToPermanent(user.id, {
                  name: convertName,
                  username: convertUsername,
                  password: convertPassword,
                });
                if (res.error) {
                  setConvertError(res.error);
                } else if (res.user) {
                  onUpdateUser(res.user);
                  setShowConvertModal(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Seu Nome / Apelido</label>
                <input
                  type="text"
                  required
                  value={convertName}
                  onChange={(e) => setConvertName(e.target.value)}
                  className="w-full bg-[#0a101d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Nome de Usuário (login)</label>
                <input
                  type="text"
                  required
                  placeholder="ex: carlos_hipertrofia"
                  value={convertUsername}
                  onChange={(e) => setConvertUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full bg-[#0a101d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Criar Senha</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 3 caracteres"
                  value={convertPassword}
                  onChange={(e) => setConvertPassword(e.target.value)}
                  className="w-full bg-[#0a101d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md cursor-pointer"
                >
                  Salvar Perfil Definitivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Seguro de Confirmação para Exclusão de Perfil (Exige Senha para Contas Registradas) */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#101828] border border-rose-500/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-white">Excluir Perfil Protegido?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Tem certeza que deseja apagar permanentemente este perfil? Todos os treinos gerados, histórico e registros serão excluídos. Esta ação não pode ser desfeita.
            </p>

            {!user.isVisitor && (
              <div className="mb-4 space-y-2">
                <label className="text-[11px] font-bold text-slate-400 block">
                  Confirme sua senha para autorizar a exclusão:
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError(null);
                  }}
                  placeholder="Digite sua senha atual"
                  className="w-full bg-[#0a101d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
                {deleteError && (
                  <p className="text-[11px] font-bold text-rose-400">{deleteError}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!user.isVisitor && !authStorage.verifyUserPassword(user.id, deletePassword)) {
                    setDeleteError('Senha incorreta. Exclusão bloqueada.');
                    return;
                  }
                  setShowDeleteConfirmModal(false);
                  setDeletePassword('');
                  setDeleteError(null);
                  onDeleteProfile?.(user.id);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition-all cursor-pointer active:scale-95"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
