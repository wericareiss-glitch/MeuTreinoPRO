/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Scale, 
  Ruler, 
  Calendar, 
  Flame, 
  Award, 
  Target, 
  Sparkles, 
  Check, 
  Save 
} from 'lucide-react';
import { GenderOption, LevelOption, FocusOption } from '../../types/workout';
import { useI18n } from '../../utils/i18n';

export interface BodyMetricsFormProps {
  name: string;
  setName: (v: string) => void;
  weightKg: number;
  setWeightKg: (v: number) => void;
  heightCm: number;
  setHeightCm: (v: number) => void;
  age: number;
  setAge: (v: number) => void;
  bodyFatPercent: number | undefined;
  setBodyFatPercent: (v: number | undefined) => void;
  gender: GenderOption;
  setGender: (v: GenderOption) => void;
  level: LevelOption;
  setLevel: (v: LevelOption) => void;
  focus: FocusOption;
  setFocus: (v: FocusOption) => void;
  frequency: number;
  setFrequency: (v: number) => void;
  imcStr: string;
  bmiCat: { label: string; color: string };
  onSave: (e: React.FormEvent) => void;
  onApplyRecommendedBudget: () => void;
  savedSuccess: boolean;
}

export const BodyMetricsForm: React.FC<BodyMetricsFormProps> = ({
  name,
  setName,
  weightKg,
  setWeightKg,
  heightCm,
  setHeightCm,
  age,
  setAge,
  bodyFatPercent,
  setBodyFatPercent,
  gender,
  setGender,
  level,
  setLevel,
  focus,
  setFocus,
  frequency,
  setFrequency,
  imcStr,
  bmiCat,
  onSave,
  onApplyRecommendedBudget,
  savedSuccess,
}) => {
  const { t } = useI18n();

  return (
    <form onSubmit={onSave} className="mt-6 space-y-4">
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

        {/* Estatura (cm) */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.heightLabel}</span>
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
              className="w-full bg-[#0a101d] border border-slate-700/80 rounded-xl pl-3 pr-9 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-2.5 text-xs text-slate-500 font-mono">cm</span>
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

      {/* 1. SELEÇÃO DE SEXO (Menu Dropdown) */}
      <div className="bg-[#0b1220] p-3.5 rounded-2xl border border-slate-800">
        <label htmlFor="profile-gender-select" className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
          Sexo Biológico
        </label>
        <select
          id="profile-gender-select"
          value={gender}
          onChange={(e) => setGender(e.target.value as GenderOption)}
          className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
        >
          <option value="male" className="bg-[#0f172a] text-white">👨 Masculino</option>
          <option value="female" className="bg-[#0f172a] text-white">👩 Feminino</option>
        </select>
      </div>

      {/* 2. SELEÇÃO DE NÍVEL DE TREINO (Menu Dropdown) */}
      <div className="bg-[#0b1220] p-3.5 rounded-2xl border border-slate-800">
        <label htmlFor="profile-level-select" className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>Nível de Experiência</span>
        </label>
        <select
          id="profile-level-select"
          value={level}
          onChange={(e) => setLevel(e.target.value as LevelOption)}
          className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
        >
          <option value="beginner" className="bg-[#0f172a] text-white">Iniciante</option>
          <option value="intermediate" className="bg-[#0f172a] text-white">Intermediário</option>
          <option value="advanced" className="bg-[#0f172a] text-white">Avançado</option>
        </select>
      </div>

      {/* 3. SELEÇÃO DE FOCO DO TREINO (Menu Dropdown) */}
      <div className="bg-[#0b1220] p-3.5 rounded-2xl border border-slate-800">
        <label htmlFor="profile-focus-select" className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-rose-400" />
          <span>Foco Principal do Treino</span>
        </label>
        <select
          id="profile-focus-select"
          value={focus}
          onChange={(e) => setFocus(e.target.value as FocusOption)}
          className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
        >
          <option value="balanced" className="bg-[#0f172a] text-white">⚖️ Equilíbrio Total (Harmonia e simetria para o corpo inteiro)</option>
          <option value="glutes" className="bg-[#0f172a] text-white">🍑 Glúteos & Membros Inferiores (Ênfase máxima em glúteo, posterior e pernas)</option>
          <option value="v_taper" className="bg-[#0f172a] text-white">🔱 Shape em V (Costas largas, ombros e peitoral em destaque)</option>
          <option value="strength" className="bg-[#0f172a] text-white">🏋️ Força & Cargas (Progressão de cargas e grandes compostos)</option>
        </select>
      </div>

      {/* 4. SELEÇÃO DE FREQUÊNCIA SEMANAL (Menu Dropdown) */}
      <div className="bg-[#0b1220] p-3.5 rounded-2xl border border-slate-800">
        <label htmlFor="profile-frequency-select" className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Frequência Semanal</span>
          </span>
          <span className="text-[11px] font-mono font-bold text-sky-400">
            {frequency}x por semana
          </span>
        </label>
        <select
          id="profile-frequency-select"
          value={frequency}
          onChange={(e) => setFrequency(Number(e.target.value))}
          className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
        >
          <option value={1} className="bg-[#0f172a] text-white">1 dia por semana (Manutenção Geral)</option>
          <option value={2} className="bg-[#0f172a] text-white">2 dias por semana (Divisão A/B)</option>
          <option value={3} className="bg-[#0f172a] text-white">3 dias por semana (Full Body ou ABC)</option>
          <option value={4} className="bg-[#0f172a] text-white">4 dias por semana (Upper / Lower 2x)</option>
          <option value={5} className="bg-[#0f172a] text-white">5 dias por semana (Push / Pull / Legs + Upper / Lower)</option>
          <option value={6} className="bg-[#0f172a] text-white">6 dias por semana (PPL 2x Alta Frequência)</option>
        </select>
      </div>

      {/* BMI Info pill & Save CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="bg-[#0a101d] px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-2 text-xs">
          <span className="text-slate-400">{t.bmiLabel}:</span>
          <span className="font-mono font-bold text-white">
            {imcStr}
          </span>
          <span className={`font-semibold ${bmiCat.color}`}>({bmiCat.label})</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onApplyRecommendedBudget}
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
  );
};
