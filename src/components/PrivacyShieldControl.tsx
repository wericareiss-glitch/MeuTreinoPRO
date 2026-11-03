/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, KeyRound, X, AlertCircle, Fingerprint } from 'lucide-react';
import { UserProfile } from '../types/workout';
import { usePrivacyMode } from '../utils/privacy';
import { authStorage } from '../utils/auth';
import {
  hasUserBiometricEnabled,
  authenticateWithBiometrics,
  getDeviceBiometricLabel,
} from '../utils/biometricAuth';

interface PrivacyShieldControlProps {
  user: UserProfile | null;
  variant?: 'compact' | 'banner' | 'inline';
}

export const PrivacyShieldControl: React.FC<PrivacyShieldControlProps> = ({
  user,
  variant = 'compact',
}) => {
  const { isPrivacyHidden, lockPrivacy, unlockPrivacy } = usePrivacyMode();
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);

  const canUseBiometricUnlock = Boolean(user && hasUserBiometricEnabled(user.id));
  const biometricLabel = getDeviceBiometricLabel();

  const handleRequestToggle = () => {
    if (!isPrivacyHidden) {
      // Locking sensitive data is always instant (1 click)
      lockPrivacy();
      return;
    }

    // If user is a registered account (not a visitor), require password or biometric verification to reveal sensitive data
    if (user && !user.isVisitor) {
      setPasswordInput('');
      setErrorMsg(null);
      setShowVerifyModal(true);
    } else {
      unlockPrivacy();
    }
  };

  const handleBiometricUnlock = async () => {
    if (!user) return;
    setErrorMsg(null);
    setIsBiometricScanning(true);
    const res = await authenticateWithBiometrics({ userId: user.id });
    setIsBiometricScanning(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Falha na leitura biométrica.');
      return;
    }

    setPasswordInput('');
    setErrorMsg(null);
    setShowVerifyModal(false);
    unlockPrivacy();
  };

  const handleConfirmPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const isValid = authStorage.verifyUserPassword(user.id, passwordInput);
    if (!isValid) {
      setErrorMsg('Senha incorreta. Acesso aos dados sensíveis negado.');
      return;
    }
    setPasswordInput('');
    setErrorMsg(null);
    setShowVerifyModal(false);
    unlockPrivacy();
  };

  return (
    <>
      {variant === 'compact' && (
        <button
          type="button"
          onClick={handleRequestToggle}
          className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 ${
            isPrivacyHidden
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
          }`}
          title={
            isPrivacyHidden
              ? 'Dados Sensíveis Ocultos (Protegido) — Clique para desbloquear'
              : 'Dados Sensíveis Visíveis — Clique para ocultar imediatamente'
          }
        >
          {isPrivacyHidden ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Protegido</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">Ocultar Dados</span>
            </>
          )}
        </button>
      )}

      {variant === 'inline' && (
        <button
          type="button"
          onClick={handleRequestToggle}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
            isPrivacyHidden
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
          }`}
        >
          {isPrivacyHidden ? (
            <>
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Revelar Dados Sensíveis</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Ocultar Dados Sensíveis</span>
            </>
          )}
        </button>
      )}

      {variant === 'banner' && (
        <div
          className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
            isPrivacyHidden
              ? 'bg-gradient-to-r from-emerald-950/40 via-[#0b1324] to-[#0b1324] border-emerald-500/35'
              : 'bg-gradient-to-r from-amber-950/35 via-[#0b1324] to-[#0b1324] border-amber-500/35'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isPrivacyHidden
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {isPrivacyHidden ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-white">
                  {isPrivacyHidden
                    ? 'Escudo de Privacidade Ativo — Dados Sensíveis Ocultos'
                    : 'Dados Sensíveis Desbloqueados Temporariamente'}
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    isPrivacyHidden
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {isPrivacyHidden ? 'Protegido' : 'Visível'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {isPrivacyHidden
                  ? 'Peso, medidas corporais, % de gordura, fotos de evolução, credenciais e métricas pessoais estão mascarados contra acesso de terceiros.'
                  : 'Seus dados pessoais estão visíveis para edição. Clique em "Bloquear Dados" ao terminar para protegê-los.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestToggle}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-md ${
              isPrivacyHidden
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {isPrivacyHidden ? (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>Desbloquear Dados</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Bloquear Dados</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Modal de Verificação de Senha para Revelar Dados Sensíveis */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#101828] border border-emerald-500/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Proteção de Dados Sensíveis</h3>
                  <p className="text-[10px] text-slate-400">Verificação de identidade necessária</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {canUseBiometricUnlock
                ? `Use seu ${biometricLabel} ou digite a senha do perfil para visualizar informações corporais protegidas.`
                : 'Digite a senha do seu perfil para visualizar ou editar informações corporais e dados pessoais protegidos.'}
            </p>

            {canUseBiometricUnlock && (
              <button
                type="button"
                disabled={isBiometricScanning}
                onClick={handleBiometricUnlock}
                className="w-full mb-3 py-3 px-4 rounded-2xl font-black text-xs bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Fingerprint className="w-4 h-4" />
                <span>
                  {isBiometricScanning
                    ? 'Lendo Biometria...'
                    : `Desbloquear com ${biometricLabel}`}
                </span>
              </button>
            )}

            {errorMsg && (
              <div className="p-2.5 mb-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleConfirmPassword} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  {canUseBiometricUnlock ? 'Ou use a Senha da Conta' : 'Senha da Conta'}
                </label>
                <input
                  type="password"
                  required
                  autoFocus={!canUseBiometricUnlock}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0a101d] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  Desbloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
