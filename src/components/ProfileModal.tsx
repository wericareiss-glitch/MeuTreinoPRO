/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  User, 
  Scale, 
  Ruler, 
  LogOut, 
  Sliders, 
  Save, 
  KeyRound, 
  Check, 
  AlertCircle,
  Award,
  Target,
  Sparkles,
  Calendar,
  Lock
} from 'lucide-react';
import { UserProfile, GenderOption, LevelOption, FocusOption } from '../types/workout';
import { authStorage, calculateDefaultBudget, getPresetWeights, scaleWeightsToBudget } from '../utils/auth';
import { ThemeToggle } from './ThemeToggle';
import { BiometricSettingsCard } from './BiometricSettingsCard';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onLogout: () => void;
  onOpenVolumeBudget: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
  onOpenVolumeBudget,
}) => {
  const [name, setName] = useState(user.name);
  const [weightKg, setWeightKg] = useState(user.weightKg);
  const initialHeightCm = user.heightM > 3 ? Math.round(user.heightM) : Math.round((user.heightM || 1.75) * 100);
  const [heightCm, setHeightCm] = useState<number>(initialHeightCm);
  const [gender, setGender] = useState<GenderOption>(user.gender || 'male');
  const [level, setLevel] = useState<LevelOption>(user.level || 'beginner');
  const [focus, setFocus] = useState<FocusOption>(user.focus || 'v_taper');
  const [frequency, setFrequency] = useState<number>(user.frequency || 4);

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  // IMC (BMI) calculation
  const heightMeters = heightCm > 0 ? (heightCm > 3 ? heightCm / 100 : heightCm) : 0;
  const imc = heightMeters > 0 ? (weightKg / (heightMeters * heightMeters)).toFixed(1) : '0';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = authStorage.updateProfile(user.id, {
      name: name.trim(),
      weightKg,
      heightM: heightCm,
      gender,
      level,
      focus,
      frequency,
    });
    if (updated) {
      onUpdateUser(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

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
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Perfil do Atleta
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                @{user.username}
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

        {/* Profile Info Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Nome / Apelido
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
                <span>Peso Corporal</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-2.5 text-xs text-slate-500 font-mono">kg</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-sky-400" />
                <span>Estatura</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="1"
                  min="100"
                  max="250"
                  placeholder="Ex: 175"
                  value={heightCm}
                  onChange={(e) => setHeightCm(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl pl-3 pr-9 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-2.5 text-xs text-slate-500 font-mono">cm</span>
              </div>
            </div>
          </div>

          {/* 1. SELEÇÃO DE SEXO (Dropdown) */}
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
            <label htmlFor="modal-gender-select" className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Sexo Biológico
            </label>
            <select
              id="modal-gender-select"
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderOption)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="male" className="bg-[#0f172a] text-white">👨 Masculino</option>
              <option value="female" className="bg-[#0f172a] text-white">👩 Feminino</option>
            </select>
          </div>

          {/* 2. SELEÇÃO DE NÍVEL DE TREINO (Dropdown) */}
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
            <label htmlFor="modal-level-select" className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Nível de Experiência</span>
            </label>
            <select
              id="modal-level-select"
              value={level}
              onChange={(e) => setLevel(e.target.value as LevelOption)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="beginner" className="bg-[#0f172a] text-white">Iniciante</option>
              <option value="intermediate" className="bg-[#0f172a] text-white">Intermediário</option>
              <option value="advanced" className="bg-[#0f172a] text-white">Avançado</option>
            </select>
          </div>

          {/* 3. SELEÇÃO DE FOCO DO TREINO (Dropdown) */}
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
            <label htmlFor="modal-focus-select" className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-rose-400" />
              <span>Foco Principal</span>
            </label>
            <select
              id="modal-focus-select"
              value={focus}
              onChange={(e) => setFocus(e.target.value as FocusOption)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="balanced" className="bg-[#0f172a] text-white">⚖️ Equilíbrio Total (Desenvolvimento Completo)</option>
              <option value="glutes" className="bg-[#0f172a] text-white">🍑 Glúteos & Membros Inferiores</option>
              <option value="v_taper" className="bg-[#0f172a] text-white">🔱 Shape em V (Dorsais e Ombros)</option>
              <option value="strength" className="bg-[#0f172a] text-white">🏋️ Força & Progressão de Cargas</option>
            </select>
          </div>

          {/* 4. SELEÇÃO DE FREQUÊNCIA SEMANAL (Dropdown) */}
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
            <label htmlFor="modal-frequency-select" className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Frequência Semanal</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-sky-400">
                {frequency}x por semana
              </span>
            </label>
            <select
              id="modal-frequency-select"
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value={2} className="bg-[#0f172a] text-white">2 dias por semana (Treino A/B)</option>
              <option value={3} className="bg-[#0f172a] text-white">3 dias por semana (Treino Full Body ou ABC)</option>
              <option value={4} className="bg-[#0f172a] text-white">4 dias por semana (Upper / Lower)</option>
              <option value={5} className="bg-[#0f172a] text-white">5 dias por semana (Push / Pull / Legs + Upper/Lower)</option>
              <option value={6} className="bg-[#0f172a] text-white">6 dias por semana (PPL 2x Alta Frequência)</option>
            </select>
          </div>

          {/* IMC Pill */}
          <div className="bg-[#0b1220] p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Índice de Massa Corporal (IMC):</span>
            <span className="font-mono font-black text-emerald-400">
              {imc} <span className="text-[10px] text-slate-500 font-normal">kg/m²</span>
            </span>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleApplyRecommendedBudget}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Aplicar Séries Recomendadas ({calculateDefaultBudget(level, gender)}s)</span>
            </button>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Perfil Atualizado!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Dados do Perfil</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Action: Open Volume Budget & Theme Toggle */}
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
          <div className="p-3 rounded-2xl bg-[#0b1220] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-xs font-bold text-white block">Modo de Visualização (Dark / Light)</span>
              <span className="text-[10px] text-slate-400 block">
                Força o tema no localStorage e desativa a detecção automática
              </span>
            </div>
            <ThemeToggle variant="segmented" />
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenVolumeBudget();
            }}
            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-[#131d31] hover:bg-[#192742] text-amber-300 border border-amber-500/30 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Séries Semanais</span>
            </div>
            <span className="font-mono font-black bg-amber-500/20 px-2 py-0.5 rounded text-[11px]">
              {user.weeklyBudget}s / sem
            </span>
          </button>

          <BiometricSettingsCard user={user} variant="compact" onLockAppNow={onClose} />
        </div>

        {/* Security Info */}
        <div className="mt-3 p-3 rounded-xl bg-[#0b1220] border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {user.isVisitor
              ? 'Sessão anônima offline. Conecte com o Google para backup.'
              : 'Autenticação de plataforma (Google / Firebase Auth) ativa.'}
          </span>
        </div>

        {/* Logout / Switch Profile */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Desconectar / Trocar de Perfil</span>
          </button>
        </div>
      </div>
    </div>
  );
};
