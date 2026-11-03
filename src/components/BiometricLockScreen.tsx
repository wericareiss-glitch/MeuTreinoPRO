/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Fingerprint,
  ScanFace,
  Lock,
  KeyRound,
  LogOut,
  AlertCircle,
  Dumbbell,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile } from '../types/workout';
import {
  authenticateWithBiometrics,
  getDeviceBiometricLabel,
  markBiometricSessionUnlocked,
} from '../utils/biometricAuth';
import { authStorage } from '../utils/auth';

interface BiometricLockScreenProps {
  user: UserProfile;
  onUnlocked: () => void;
  onSwitchAccount: () => void;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({
  user,
  onUnlocked,
  onSwitchAccount,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const biometricLabel = getDeviceBiometricLabel();

  const handleBiometricUnlock = useCallback(async () => {
    setIsScanning(true);
    setErrorMsg(null);
    const res = await authenticateWithBiometrics({ userId: user.id });
    setIsScanning(false);

    if (res.success) {
      markBiometricSessionUnlocked(user.id, true);
      onUnlocked();
      return;
    }

    if (res.error) {
      setErrorMsg(res.error);
    }
  }, [user.id, onUnlocked]);

  // Dispara automaticamente o prompt biométrico ao abrir a tela de bloqueio
  useEffect(() => {
    const timer = setTimeout(() => {
      handleBiometricUnlock();
    }, 180);
    return () => clearTimeout(timer);
  }, [handleBiometricUnlock]);

  const handlePasswordUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const valid = authStorage.verifyUserPassword(user.id, password);
    if (!valid) {
      setErrorMsg('Senha incorreta. Tente novamente ou use sua biometria.');
      return;
    }
    markBiometricSessionUnlocked(user.id, true);
    onUnlocked();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#070b14]/95 backdrop-blur-xl animate-fadeIn">
      <div className="w-full max-w-sm bg-[#101828] border border-emerald-500/35 rounded-3xl p-6 sm:p-7 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand & Athlete Header */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
            <Dumbbell className="w-6 h-6 stroke-[2.5]" />
          </div>

          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-2">
            <ShieldCheck className="w-3 h-3" />
            <span>Sessão Protegida</span>
          </span>

          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Olá, {user.name.split(' ')[0]}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Use seu <strong className="text-slate-200">{biometricLabel}</strong> para desbloquear o MeuTreino Pro instantaneamente.
          </p>
        </div>

        {/* Biometric Scanner Trigger */}
        {!showPasswordFallback ? (
          <div className="my-6 flex flex-col items-center space-y-4 relative z-10">
            <button
              type="button"
              disabled={isScanning}
              onClick={handleBiometricUnlock}
              className={`w-24 h-24 rounded-3xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xl ${
                isScanning
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 animate-pulse shadow-emerald-500/30'
                  : 'bg-[#0b1220] hover:bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-emerald-500/15'
              }`}
              title={`Toque para desbloquear com ${biometricLabel}`}
            >
              <Fingerprint className="w-11 h-11 stroke-[1.8]" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                {isScanning ? 'Lendo...' : 'Tocar'}
              </span>
            </button>

            <button
              type="button"
              disabled={isScanning}
              onClick={handleBiometricUnlock}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-xs bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <ScanFace className="w-4 h-4" />
              <span>
                {isScanning
                  ? 'Verificando Biometria...'
                  : `Desbloquear com ${biometricLabel}`}
              </span>
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordUnlock} className="my-5 space-y-3 text-left relative z-10">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Senha do Perfil
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3" />
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha..."
                  className="w-full bg-[#0b1220] border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Desbloquear com Senha
            </button>
          </form>
        )}

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2 text-left relative z-10">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Actions: Toggle Password Fallback or Switch Profile */}
        <div className="pt-3 border-t border-slate-800/90 flex items-center justify-between gap-2 text-xs relative z-10">
          {!user.isVisitor && (
            <button
              type="button"
              onClick={() => {
                setShowPasswordFallback((prev) => !prev);
                setErrorMsg(null);
              }}
              className="text-slate-400 hover:text-white font-bold flex items-center gap-1.5 py-1 cursor-pointer transition-colors"
            >
              {showPasswordFallback ? (
                <>
                  <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Usar Biometria</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                  <span>Usar Senha</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onSwitchAccount}
            className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 py-1 ml-auto cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Trocar Conta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
