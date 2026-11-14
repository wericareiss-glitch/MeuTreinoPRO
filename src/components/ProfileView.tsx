/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Lock,
  Cloud,
  Heart,
  ChevronDown,
  ChevronUp,
  Target,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { GenderOption } from '../types/workout';
import { authStorage } from '../utils/auth';
import { useI18n } from '../utils/i18n';
import { loginWithGoogle, syncUserProfileToCloud } from '../services/firebase';
import { DonationModal } from './DonationModal';
import {
  ProfileViewProps,
  ProfileHeaderCard,
  BodyMetricsForm,
  WeeklyVolumeCard,
  CollapsiblePreferences,
} from './profile';

type ProfileAccordionSection = 'goals' | 'body' | 'security' | null;

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  sessions,
  onUpdateUser,
  onLogout,
  onOpenVolumeBudget,
}) => {
  const { t } = useI18n();

  // Acordeão ativo (recolhido por padrão para minimizar rolagem)
  const [openSection, setOpenSection] = useState<ProfileAccordionSection>(null);
  const toggleSection = (section: Exclude<ProfileAccordionSection, null>) => {
    setOpenSection((curr) => (curr === section ? null : section));
  };

  // Personal metrics state
  const [name, setName] = useState(user.name);
  const [weightKg, setWeightKg] = useState(user.weightKg);
  const initialHeightCm =
    user.heightM > 3 ? Math.round(user.heightM) : Math.round((user.heightM || 1.75) * 100);
  const [heightCm, setHeightCm] = useState<number>(initialHeightCm);
  const [age, setAge] = useState<number>(user.age || 28);
  const [bodyFatPercent, setBodyFatPercent] = useState<number | undefined>(user.bodyFatPercent);
  const [gender, setGender] = useState<GenderOption>(user.gender || 'male');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Platform authentication & Google linking state
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [linkGoogleError, setLinkGoogleError] = useState<string | null>(null);
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
    <div className="space-y-3.5 animate-fadeIn pb-[max(6.5rem,calc(5.5rem+env(safe-area-inset-bottom)))] sm:pb-20 w-full max-w-full min-w-0 touch-pan-y">
      {/* 1. Cartão Resumo do Perfil */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <ProfileHeaderCard
          user={user}
          onLogout={onLogout}
          onOpenDonation={() => setIsDonationOpen(true)}
          isLinkingGoogle={isLinkingGoogle}
          linkGoogleError={linkGoogleError}
          onConnectGoogle={handleConnectGoogle}
        />

        {/* Resumo rápido em 1 linha sem precisar abrir formulários */}
        <div className="mt-3.5 grid grid-cols-4 gap-2 text-center">
          <div className="bg-[#090f1d] border border-slate-800/90 rounded-xl px-2 py-2">
            <span className="text-[10px] text-slate-400 block">Peso</span>
            <strong className="text-xs sm:text-sm font-mono font-black text-white tabular-nums">
              {weightKg}kg
            </strong>
          </div>
          <div className="bg-[#090f1d] border border-slate-800/90 rounded-xl px-2 py-2">
            <span className="text-[10px] text-slate-400 block">Altura</span>
            <strong className="text-xs sm:text-sm font-mono font-black text-white tabular-nums">
              {heightCm}cm
            </strong>
          </div>
          <div className="bg-[#090f1d] border border-slate-800/90 rounded-xl px-2 py-2">
            <span className="text-[10px] text-slate-400 block">IMC</span>
            <strong className={`text-xs sm:text-sm font-mono font-black tabular-nums ${bmiCat.color}`}>
              {imcStr}
            </strong>
          </div>
          <div className="bg-[#090f1d] border border-slate-800/90 rounded-xl px-2 py-2">
            <span className="text-[10px] text-slate-400 block">Meta Sem.</span>
            <strong className="text-xs sm:text-sm font-mono font-black text-emerald-400 tabular-nums">
              {user.weeklyBudget || 90}s
            </strong>
          </div>
        </div>
      </div>

      {/* 2. Acordeão 1: Minhas Metas */}
      {onOpenVolumeBudget && (
        <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-2xl shadow-xl overflow-hidden">
          <button
            type="button"
            aria-expanded={openSection === 'goals'}
            onClick={() => toggleSection('goals')}
            className="w-full min-h-[60px] p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                  Minhas Metas
                </h2>
                <p className="text-[11px] text-slate-400 truncate">
                  {user.weeklyBudget || 90} séries/semana · 11 grupos musculares
                </p>
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 shrink-0">
              {openSection === 'goals' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {openSection === 'goals' && (
            <div className="p-4 pt-3 border-t border-slate-800 animate-fadeIn">
              <WeeklyVolumeCard
                user={user}
                onOpenVolumeBudget={onOpenVolumeBudget}
                embedded
              />
            </div>
          )}
        </div>
      )}

      {/* 3. Acordeão 2: Medidas Corporais */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-2xl shadow-xl overflow-hidden">
        <button
          type="button"
          aria-expanded={openSection === 'body'}
          onClick={() => toggleSection('body')}
          className="w-full min-h-[60px] p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                Medidas Corporais
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {weightKg}kg · {heightCm}cm · {age} anos · IMC {imcStr} ({bmiCat.label})
              </p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 shrink-0">
            {openSection === 'body' ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {openSection === 'body' && (
          <div className="p-4 pt-0 border-t border-slate-800 animate-fadeIn">
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
              imcStr={imcStr}
              bmiCat={bmiCat}
              onSave={handleSaveProfile}
              savedSuccess={savedSuccess}
            />
          </div>
        )}
      </div>

      {/* 4. Acordeão 3: Segurança e Preferências */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-2xl shadow-xl overflow-hidden">
        <button
          type="button"
          aria-expanded={openSection === 'security'}
          onClick={() => toggleSection('security')}
          className="w-full min-h-[60px] p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                Segurança e Preferências
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {user.isVisitor ? 'Sessão Offline' : 'Google Sync'} · Tema, Biometria, Nuvem e Lembretes
              </p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 shrink-0">
            {openSection === 'security' ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {openSection === 'security' && (
          <div className="p-4 pt-3 border-t border-slate-800 space-y-3 animate-fadeIn">
            {/* Autenticação & Segurança da Conta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0a101d] border border-slate-800/90">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block">
                    Autenticação & Segurança da Conta
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                    {user.isVisitor
                      ? 'Sessão anônima offline. Conecte o Google para sincronizar.'
                      : `Protegido via Google / Firebase (${user.email || 'Plataforma'}).`}
                  </span>
                </div>
              </div>
              {user.isVisitor ? (
                <button
                  type="button"
                  disabled={isLinkingGoogle}
                  onClick={handleConnectGoogle}
                  className="min-h-[38px] px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto shrink-0 shadow-sm"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{isLinkingGoogle ? 'Conectando...' : 'Conectar Google'}</span>
                </button>
              ) : (
                <span className="text-[11px] font-bold text-emerald-400 self-start sm:self-auto shrink-0">
                  ✓ Conta Conectada
                </span>
              )}
            </div>

            <CollapsiblePreferences
              user={user}
              sessions={sessions}
            />
          </div>
        )}
      </div>

      {/* 5. Apoio ao Projeto (Compacto) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-pink-500/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4 fill-pink-500/20" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-slate-200 truncate">
              Apoiar o Projeto MeuTreino Pro · Voluntário
            </h4>
            <p className="text-[11px] text-slate-400 truncate">
              Ajude a manter os servidores e melhorias contínuas via PIX.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDonationOpen(true)}
          className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95 whitespace-nowrap"
        >
          <Heart className="w-3.5 h-3.5 fill-pink-400/40" />
          <span>Fazer Doação PIX</span>
        </button>
      </div>

      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
      />
    </div>
  );
};
