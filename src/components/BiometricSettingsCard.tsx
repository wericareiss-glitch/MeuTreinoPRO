/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Fingerprint,
  ScanFace,
  ShieldCheck,
  Lock,
  Unlock,
  Check,
  AlertCircle,
  Trash2,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { UserProfile } from '../types/workout';
import {
  checkBiometricAvailability,
  getUserBiometricCredentials,
  registerBiometricCredential,
  authenticateWithBiometrics,
  removeUserBiometricCredentials,
  isBiometricAppLockEnabled,
  setBiometricAppLockEnabled,
  markBiometricSessionUnlocked,
  onBiometricChange,
  StoredBiometricCredential,
  BiometricAvailability,
} from '../utils/biometricAuth';

interface BiometricSettingsCardProps {
  user: UserProfile;
  variant?: 'full' | 'compact';
  onLockAppNow?: () => void;
}

export const BiometricSettingsCard: React.FC<BiometricSettingsCardProps> = ({
  user,
  variant = 'full',
  onLockAppNow,
}) => {
  const [availability, setAvailability] = useState<BiometricAvailability>({
    isWebAuthnSupported: false,
    isPlatformAuthenticatorAvailable: false,
    biometricLabel: 'Face ID / Impressão Digital',
  });
  const [credentials, setCredentials] = useState<StoredBiometricCredential[]>(() =>
    getUserBiometricCredentials(user.id)
  );
  const [appLockEnabled, setAppLockEnabled] = useState<boolean>(() =>
    isBiometricAppLockEnabled(user.id)
  );
  const [isBusy, setIsBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const refreshState = useCallback(() => {
    setCredentials(getUserBiometricCredentials(user.id));
    setAppLockEnabled(isBiometricAppLockEnabled(user.id));
  }, [user.id]);

  useEffect(() => {
    let mounted = true;
    checkBiometricAvailability().then((res) => {
      if (mounted) setAvailability(res);
    });
    refreshState();
    const unsubscribe = onBiometricChange(refreshState);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [refreshState]);

  const isEnrolled = credentials.length > 0;

  const handleEnrollBiometrics = async () => {
    setIsBusy(true);
    setStatusMsg(null);
    const res = await registerBiometricCredential(user);
    setIsBusy(false);

    if (!res.success) {
      setStatusMsg({
        text: res.error || 'Não foi possível ativar a biometria.',
        isError: true,
      });
      return;
    }

    refreshState();
    setStatusMsg({
      text: `${availability.biometricLabel} ativado com sucesso! Agora você pode desbloquear o app sem digitar senha.`,
      isError: false,
    });
  };

  const handleTestBiometrics = async () => {
    setIsBusy(true);
    setStatusMsg(null);
    const res = await authenticateWithBiometrics({ userId: user.id });
    setIsBusy(false);

    if (!res.success) {
      setStatusMsg({
        text: res.error || 'Falha na leitura biométrica.',
        isError: true,
      });
      return;
    }

    refreshState();
    setStatusMsg({
      text: 'Identidade confirmada por biometria com sucesso!',
      isError: false,
    });
  };

  const handleRemoveBiometrics = () => {
    removeUserBiometricCredentials(user.id);
    refreshState();
    setStatusMsg({
      text: 'Credencial biométrica removida deste aparelho.',
      isError: false,
    });
  };

  const handleToggleAppLock = () => {
    const next = !appLockEnabled;
    setBiometricAppLockEnabled(user.id, next);
    setAppLockEnabled(next);
    setStatusMsg({
      text: next
        ? 'Bloqueio por biometria ativado ao abrir o aplicativo.'
        : 'Bloqueio automático ao abrir o aplicativo desativado.',
      isError: false,
    });
  };

  const handleLockImmediately = () => {
    setBiometricAppLockEnabled(user.id, true);
    markBiometricSessionUnlocked(user.id, false);
    if (onLockAppNow) {
      onLockAppNow();
    }
  };

  if (variant === 'compact') {
    return (
      <div className="p-3.5 rounded-2xl bg-[#0b1220] border border-emerald-500/30 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-white block">
                Acesso Rápido por {availability.biometricLabel}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {isEnrolled
                  ? 'Biometria ativa neste aparelho — Entre sem digitar senha'
                  : 'Desbloqueie o app usando seu rosto ou impressão digital'}
              </span>
            </div>
          </div>

          {isEnrolled ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
              Ativo
            </span>
          ) : (
            <button
              type="button"
              disabled={isBusy || !availability.isWebAuthnSupported}
              onClick={handleEnrollBiometrics}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 transition-all cursor-pointer shrink-0"
            >
              {isBusy ? 'Ativando...' : 'Ativar'}
            </button>
          )}
        </div>

        {statusMsg && (
          <div
            className={`p-2 rounded-xl text-[11px] flex items-center gap-1.5 ${
              statusMsg.isError
                ? 'bg-rose-950/40 border border-rose-800/50 text-rose-300'
                : 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
            }`}
          >
            {statusMsg.isError ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            ) : (
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {isEnrolled && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
            <button
              type="button"
              onClick={handleToggleAppLock}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                appLockEnabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>{appLockEnabled ? 'Pedir ao abrir: Sim' : 'Pedir ao abrir: Não'}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleLockImmediately}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-colors cursor-pointer"
              >
                Bloquear Agora
              </button>
              <button
                type="button"
                onClick={handleRemoveBiometrics}
                className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Remover biometria"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 relative">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Desbloqueio Biométrico ({availability.biometricLabel})
              </h2>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  isEnrolled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isEnrolled ? 'Ativado neste Aparelho' : 'Disponível'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Entre na sua conta e desbloqueie seus dados corporais usando o leitor de digital ou reconhecimento facial do celular, sem precisar digitar senha.
            </p>
          </div>
        </div>

        {!isEnrolled ? (
          <button
            type="button"
            disabled={isBusy || !availability.isWebAuthnSupported}
            onClick={handleEnrollBiometrics}
            className="px-4 py-2.5 rounded-2xl font-black text-xs bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <ScanFace className="w-4 h-4" />
            <span>{isBusy ? 'Aguardando Sensor...' : 'Ativar Biometria Agora'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleTestBiometrics}
              className="px-3.5 py-2 rounded-xl font-bold text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Fingerprint className="w-4 h-4" />
              <span>{isBusy ? 'Verificando...' : 'Testar Sensor'}</span>
            </button>
            <button
              type="button"
              onClick={handleLockImmediately}
              className="px-3.5 py-2 rounded-xl font-bold text-xs bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Bloquear a tela agora e pedir Face ID / Impressão Digital"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Bloquear App</span>
            </button>
          </div>
        )}
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
            statusMsg.isError
              ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
          }`}
        >
          {statusMsg.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          ) : (
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card 1: Status da Credencial no Aparelho */}
        <div className="p-4 rounded-2xl bg-[#0a101d] border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">
                {isEnrolled ? 'Aparelho Vinculado com Segurança' : 'Como Funciona no Celular'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {isEnrolled
                  ? `Sua chave biométrica (${credentials[0]?.deviceLabel}) está salva com criptografia nativa neste dispositivo.`
                  : 'Sua digital ou rosto nunca sai do aparelho. O sistema operacional valida sua identidade instantaneamente.'}
              </p>
            </div>
          </div>

          {isEnrolled && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-500 font-mono">
                Último uso:{' '}
                {new Date(credentials[0].lastUsedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <button
                type="button"
                onClick={handleRemoveBiometrics}
                className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Desativar</span>
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Bloqueio Automático ao Abrir o App */}
        <div className="p-4 rounded-2xl bg-[#0a101d] border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl border shrink-0 ${
                  appLockEnabled
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700'
                }`}
              >
                {appLockEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">
                  Pedir Biometria ao Abrir o App
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Protege seus treinos e medidas corporais com tela de desbloqueio rápido sempre que você iniciar o aplicativo.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400">
              {appLockEnabled ? 'Proteção na abertura ativa' : 'Proteção na abertura desativada'}
            </span>
            <button
              type="button"
              disabled={!isEnrolled}
              onClick={handleToggleAppLock}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer disabled:opacity-40 ${
                appLockEnabled
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {appLockEnabled ? 'Ativado' : 'Ativar Bloqueio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
