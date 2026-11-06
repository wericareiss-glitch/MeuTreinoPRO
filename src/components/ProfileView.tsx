/

@license

SPDX-License-Identifier: Apache-2.0
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
Calendar,
Trash2,
Award,
Sparkles,
ChevronDown,
ChevronUp,
Target,
Users,
MoreVertical,
Flame,
Cloud,
Fingerprint,
Bell
} from 'lucide-react';
import {
UserProfile,
WorkoutSessionSummary,
GenderOption,
LevelOption,
FocusOption,
} from '../types/workout';
import { authStorage, ALL_MUSCLE_GROUPS, calculateDefaultBudget, getPresetWeights, scaleWeightsToBudget } from '../utils/auth';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { useI18n } from '../utils/i18n';
import { ConsistencyCalendar } from './ConsistencyCalendar';
import { ThemeToggle } from './ThemeToggle';
import { ProfilePushNotificationManager } from './ProfilePushNotificationManager';
import { FirebaseSyncCard } from './FirebaseSyncCard';
import { BiometricSettingsCard } from './BiometricSettingsCard';
import { loginWithGoogle, syncUserProfileToCloud } from '../services/firebase';

interface ProfileViewProps {
user: UserProfile;
sessions: WorkoutSessionSummary[];
onUpdateUser: (updated: UserProfile) => void;
onLogout: () => void;
onOpenVolumeBudget: () => void;
onExportBackup?: () => void;
onImportBackup?: (e: React.ChangeEvent) => void;
onViewSummary?: (session: WorkoutSessionSummary) => void;
onClearHistory?: () => void;
onDeleteProfile?: (userId: string) => void;
onSwitchProfile?: () => void;
}

export const ProfileView: React.FC = ({
user,
sessions,
onUpdateUser,
onLogout,
onOpenVolumeBudget,
onDeleteProfile,
onSwitchProfile,
}) => {
const { t } = useI18n();

// Personal data editing state with safety fallbacks
const [name, setName] = useState(user?.name || '');
const [weightKg, setWeightKg] = useState(user?.weightKg || 70);
const initialHeightCm = user?.heightM > 3 ? Math.round(user.heightM) : Math.round((user?.heightM || 1.75) * 100);
const [heightCm, setHeightCm] = useState(initialHeightCm);
const [age, setAge] = useState(user?.age || 28);
const [bodyFatPercent, setBodyFatPercent] = useState<number | undefined>(user?.bodyFatPercent);
const [gender, setGender] = useState(user?.gender || 'male');
const [level, setLevel] = useState(user?.level || 'beginner');
const [focus, setFocus] = useState(user?.focus || 'v_taper');
const [frequency, setFrequency] = useState(user?.frequency || 4);
const [savedSuccess, setSavedSuccess] = useState(false);

// Collapsible cards state (default minimized / closed)
const [isThemeOpen, setIsThemeOpen] = useState(false);
const [isBiometricOpen, setIsBiometricOpen] = useState(false);
const [isCloudOpen, setIsCloudOpen] = useState(false);
const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

// Platform authentication & Google linking state
const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
const [linkGoogleError, setLinkGoogleError] = useState<string | null>(null);

const [showProfileMenu, setShowProfileMenu] = useState(false);
const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
const profileMenuRef = useRef(null);

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

// IMC (BMI) calculation
const heightMeters = heightCm > 0 ? (heightCm > 3 ? heightCm / 100 : heightCm) : 0;
const imcNum = heightMeters > 0 ? weightKg / (heightMeters * heightMeters) : 0;
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
if (!user?.id) return;
const updated = authStorage.updateProfile(user.id, {
name: name.trim(),
weightKg,
heightM: heightCm,
age,
bodyFatPercent,
gender,
level,
focus,
frequency,
});
if (updated) {
onUpdateUser(updated);
setSavedSuccess(true);
setTimeout(() => setSavedSuccess(false), 2200);
}
};

// Recalcula as séries automaticamente com base no nível, sexo e foco
const handleApplyRecommendedBudget = () => {
if (!user?.id) return;
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

const handleConnectGoogle = async () => {
if (!user?.id) return;
setLinkGoogleError(null);
setIsLinkingGoogle(true);
const res = await loginWithGoogle();
setIsLinkingGoogle(false);

if (res.error || !res.user) {
  setLinkGoogleError(res.error || 'Falha ao autenticar com o Google.');
  return;
}

const linkedProfile = authStorage.linkGoogleAccount(user.id, res.user);
await syncUserProfileToCloud(linkedProfile);
onUpdateUser(linkedProfile);


};

if (!user) {
return null;
}

return (

{/* Top Profile Header Card */}




{user.name ? user.name.charAt(0).toUpperCase() : 'U'}




{user.name || 'Atleta'}


{t.badgePro}



@{user.username || 'usuario'}




      {/* Action Zone: Theme Toggle & Options */}
      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
        <ThemeToggle variant="segmented" />

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
    {user?.isVisitor && (
      <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#101b31] to-sky-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white">Você está como Visitante (Sessão Offline)</h3>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              Conecte sua Conta Google para salvar seus treinos e metas na nuvem com autenticação segura de plataforma.
            </p>
            {linkGoogleError && (
              <p className="text-[11px] font-bold text-rose-400 mt-1">{linkGoogleError}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          disabled={isLinkingGoogle}
          onClick={handleConnectGoogle}
          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white hover:bg-slate-100 text-slate-900 transition-all shadow-md active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{isLinkingGoogle ? 'Conectando...' : 'Salvar na Nuvem com Google'}</span>
        </button>
      </div>
    )}

    {/* Edit Body Metrics Form */}
    <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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

    <div className="mt-6 pt-5 border-t border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0a101d] border border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              Autenticação & Segurança da Conta
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {user?.isVisitor
                ? 'Sessão anônima offline. Conecte sua Conta Google para sincronização.'
                : `Protegido via Google / Firebase Auth (${user?.email || 'Conta de Plataforma'}).`}
            </span>
          </div>
        </div>
        {user?.isVisitor ? (
          <button
            type="button"
            disabled={isLinkingGoogle}
            onClick={handleConnectGoogle}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto shrink-0 shadow-sm"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{isLinkingGoogle ? 'Conectando...' : 'Conectar Conta Google'}</span>
          </button>
        ) : (
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/25 self-start sm:self-auto shrink-0">
            ✓ Autenticação de Plataforma
          </span>
        )}
      </div>
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

    <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          {t.budgetCeilingLabel}
        </span>
        <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
          {user?.weeklyBudget || 88} <span className="text-sm font-normal text-slate-400">{t.seriesLabel} / semana</span>
        </span>
      </div>

      <div className="text-xs text-slate-300 bg-[#101828] px-4 py-2.5 rounded-xl border border-slate-800 max-w-sm">
        <span className="text-emerald-400 font-bold block mb-0.5">Capacidade Recuperativa Adaptativa</span>
        Volume distribuído matematicamente entre os 11 grupos musculares para hipertrofia sem sobretreino.
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
      {ALL_MUSCLE_GROUPS.map((m) => {
        const targetSets = user?.muscleBudgets?.[m] || 8;
        const weeklyBudget = user?.weeklyBudget || 88;
        const pct = weeklyBudget > 0 ? Math.round((targetSets / weeklyBudget) * 100) : 0;
        const muscleName = t?.muscles?.[m] || MUSCLE_NAMES[m] || m;

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

  {/* 1. 🎨 Aparência & Tema Visual */}
  <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl shadow-2xl overflow-hidden transition-all">
    <button
      type="button"
      onClick={() => setIsThemeOpen((prev) => !prev)}
      className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Aparência & Tema Visual
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {isThemeOpen ? 'Expandido' : 'Minimizado'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Alterne entre modo escuro, modo claro ou contraste OLED
          </p>
        </div>
      </div>
      <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
        {isThemeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
    </button>

    {isThemeOpen && (
      <div className="p-5 sm:p-6 pt-0 border-t border-slate-800 space-y-4 animate-fadeIn">
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-300">Seleção Rápida de Tema:</span>
          <ThemeToggle variant="segmented" />
        </div>
        <ThemeToggle variant="profile-card" />
      </div>
    )}
  </div>

  {/* 2. 🔐 Desbloqueio Biométrico */}
  <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl shadow-2xl overflow-hidden transition-all">
    <button
      type="button"
      onClick={() => setIsBiometricOpen((prev) => !prev)}
      className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          <Fingerprint className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Desbloqueio Biométrico
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {isBiometricOpen ? 'Expandido' : 'Minimizado'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Face ID / Impressão Digital via WebAuthn seguro
          </p>
        </div>
      </div>
      <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
        {isBiometricOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
    </button>

    {isBiometricOpen && (
      <div className="p-5 sm:p-6 pt-0 border-t border-slate-800 animate-fadeIn">
        <div className="pt-4">
          <BiometricSettingsCard user={user} variant="full" />
        </div>
      </div>
    )}
  </div>

  {/* 3. ☁️ Integridade & Nuvem Firebase */}
  <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl shadow-2xl overflow-hidden transition-all">
    <button
      type="button"
      onClick={() => setIsCloudOpen((prev) => !prev)}
      className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
          <Cloud className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Integridade & Nuvem
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {isCloudOpen ? 'Expandido' : 'Minimizado'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Backup contínuo, sincronização e resolução de conflitos offline
          </p>
        </div>
      </div>
      <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
        {isCloudOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
    </button>

    {isCloudOpen && (
      <div className="p-5 sm:p-6 pt-0 border-t border-slate-800 animate-fadeIn">
        <div className="pt-4">
          <FirebaseSyncCard user={user} />
        </div>
      </div>
    )}
  </div>

  {/* 4. 🔔 Lembretes e Alertas de Treino */}
  <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl shadow-2xl overflow-hidden transition-all">
    <button
      type="button"
      onClick={() => setIsNotificationsOpen((prev) => !prev)}
      className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Lembretes e Alertas de Treino
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {isNotificationsOpen ? 'Expandido' : 'Minimizado'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Notificações push programadas para horário de treino e lembretes de descanso
          </p>
        </div>
      </div>
      <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
        {isNotificationsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
    </button>

    {isNotificationsOpen && (
      <div className="p-5 sm:p-6 pt-0 border-t border-slate-800 animate-fadeIn">
        <div className="pt-4">
          <ProfilePushNotificationManager
            userId={user.id}
            userName={user.name}
            sessions={sessions}
          />
        </div>
      </div>
    )}
  </div>

  <ConsistencyCalendar
    sessions={sessions}
    weeklyFrequencyGoal={user?.frequency || 4}
  />

  {showDeleteConfirmModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#101828] border border-rose-500/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-3 text-rose-400">
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30">
            <Trash2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-white">Excluir Perfil?</h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Tem certeza que deseja apagar o perfil <strong className="text-white">{user?.name}</strong>? Todos os treinos gerados, histórico e registros deste aparelho serão excluídos. Esta ação não pode ser desfeita.
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirmModal(false);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirmModal(false);
              onDeleteProfile?.(user.id);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition-all cursor-pointer active:scale-95"
          >
            Sim, Excluir Perfil
          </button>
        </div>
      </div>
    </div>
  )}
</div>


);
};