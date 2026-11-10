/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, Cloud, Heart } from 'lucide-react';
import { 
  UserProfile, 
  GenderOption, 
  LevelOption, 
  FocusOption 
} from '../types/workout';
import { 
  authStorage, 
  calculateDefaultBudget, 
  getPresetWeights, 
  scaleWeightsToBudget 
} from '../utils/auth';
import { useI18n } from '../utils/i18n';
import { loginWithGoogle, syncUserProfileToCloud } from '../services/firebase';
import { ConsistencyCalendar } from './ConsistencyCalendar';
import { DonationModal } from './DonationModal';
import { 
  ProfileViewProps,
  ProfileHeaderCard,
  BodyMetricsForm,
  WeeklyVolumeCard,
  CollapsiblePreferences,
  DeleteProfileModal
} from './profile';

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  sessions,
  onUpdateUser,
  onLogout,
  onOpenVolumeBudget,
  onDeleteProfile,
  onSwitchProfile,
}) => {
  const { t } = useI18n();

  // Personal metrics state
  const [name, setName] = useState(user.name);
  const [weightKg, setWeightKg] = useState(user.weightKg);
  const initialHeightCm = user.heightM > 3 ? Math.round(user.heightM) : Math.round((user.heightM || 1.75) * 100);
  const [heightCm, setHeightCm] = useState<number>(initialHeightCm);
  const [age, setAge] = useState<number>(user.age || 28);
  const [bodyFatPercent, setBodyFatPercent] = useState<number | undefined>(user.bodyFatPercent);
  const [gender, setGender] = useState<GenderOption>(user.gender || 'male');
  const [level, setLevel] = useState<LevelOption>(user.level || 'beginner');
  const [focus, setFocus] = useState<FocusOption>(user.focus || 'v_taper');
  const [frequency, setFrequency] = useState<number>(user.frequency || 4);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Platform authentication & Google linking state
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [linkGoogleError, setLinkGoogleError] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);

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

  const handleConnectGoogle = async () => {
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

  return (
    <div className="space-y-6 animate-fadeIn pb-[max(6.5rem,calc(5.5rem+env(safe-area-inset-bottom)))] sm:pb-20">
      {/* Top Profile Header Card */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <ProfileHeaderCard
          user={user}
          onSwitchProfile={onSwitchProfile}
          onLogout={onLogout}
          onRequestDelete={onDeleteProfile ? () => setShowDeleteConfirmModal(true) : undefined}
          onOpenDonation={() => setIsDonationOpen(true)}
          isLinkingGoogle={isLinkingGoogle}
          linkGoogleError={linkGoogleError}
          onConnectGoogle={handleConnectGoogle}
        />

        {/* Edit Body Metrics Form */}
        <BodyMetricsForm
          name={name}
          setName={setName}
          weightKg={weightKg}
          setWeightKg={setWeightKg}
          heightCm={heightCm}
          setHeightCm={setHeightCm}
          age={age}
          setAge={setAge}
          bodyFatPercent={bodyFatPercent}
          setBodyFatPercent={setBodyFatPercent}
          gender={gender}
          setGender={setGender}
          level={level}
          setLevel={setLevel}
          focus={focus}
          setFocus={setFocus}
          frequency={frequency}
          setFrequency={setFrequency}
          imcStr={imcStr}
          bmiCat={bmiCat}
          onSave={handleSaveProfile}
          onApplyRecommendedBudget={handleApplyRecommendedBudget}
          savedSuccess={savedSuccess}
        />

        {/* Security & Platform Authentication Info */}
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
                  {user.isVisitor
                    ? 'Sessão anônima offline. Conecte sua Conta Google para sincronização.'
                    : `Protegido via Google / Firebase Auth (${user.email || 'Conta de Plataforma'}).`}
                </span>
              </div>
            </div>
            {user.isVisitor ? (
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
      <WeeklyVolumeCard
        user={user}
        onOpenVolumeBudget={onOpenVolumeBudget}
      />

      {/* Seções de Preferências Minimizadas por Padrão */}
      <CollapsiblePreferences
        user={user}
        sessions={sessions}
      />

      {/* Calendário de Consistência & Histórico de Dias Treinados */}
      <ConsistencyCalendar
        sessions={sessions}
        weeklyFrequencyGoal={user.frequency || 4}
      />

      {/* Apoio ao Projeto (Discreto e Elegante) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/40 border border-slate-800/80 hover:border-pink-500/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center shrink-0 shadow-sm">
            <Heart className="w-5 h-5 fill-pink-500/20" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>Apoiar o Projeto MeuTreino Pro</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                Voluntário
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Ajude a manter os servidores e a evolução contínua do aplicativo com qualquer valor via PIX.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDonationOpen(true)}
          className="px-4 py-2.5 rounded-2xl text-xs font-bold text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95 shadow-sm"
        >
          <Heart className="w-3.5 h-3.5 fill-pink-400/40" />
          <span>Fazer Doação PIX</span>
        </button>
      </div>

      {/* Modal Seguro de Doação com QR Code Dinâmico e Chave Oculta */}
      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
      />

      {/* Modal Seguro de Confirmação para Exclusão de Perfil */}
      <DeleteProfileModal
        isOpen={showDeleteConfirmModal}
        userName={user.name}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={() => {
          setShowDeleteConfirmModal(false);
          onDeleteProfile?.(user.id);
        }}
      />
    </div>
  );
};
