import React, { useState, useEffect } from 'react';
import { 
  LogIn, 
  UserPlus, 
  Dumbbell, 
  Lock, 
  User, 
  Scale, 
  Ruler, 
  Zap, 
  AlertCircle, 
  Target, 
  Award, 
  Sparkles, 
  Check, 
  Calendar,
  Layers,
  Hash,
  Upload,
  Fingerprint,
  ScanFace,
  Cloud
} from 'lucide-react';
import { UserProfile, GenderOption, LevelOption, FocusOption, SplitOption } from '../types/workout';
import { authStorage, calculateDefaultBudget, createDefaultBudgets } from '../utils/auth';
import { safeStorage } from '../utils/storage';
import { loginWithGoogle, fetchUserDataFromFirebase, syncUserProfileToCloud } from '../services/firebase';
import {
  checkBiometricAvailability,
  getStoredBiometricCredentials,
  authenticateWithBiometrics,
  registerBiometricCredential,
  markBiometricSessionUnlocked,
  StoredBiometricCredential,
  BiometricAvailability,
} from '../utils/biometricAuth';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>(() => {
    return authStorage.hasRegisteredUsers() ? 'login' : 'register';
  });
  const [error, setError] = useState<string | null>(null);

  // Login form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [enableBiometricOnLogin, setEnableBiometricOnLogin] = useState(false);
  const [enableBiometricOnRegister, setEnableBiometricOnRegister] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [biometricAvailability, setBiometricAvailability] = useState<BiometricAvailability>({
    isWebAuthnSupported: false,
    isPlatformAuthenticatorAvailable: false,
    biometricLabel: 'Face ID / Impressão Digital',
  });
  const [savedCredentials, setSavedCredentials] = useState<StoredBiometricCredential[]>(() =>
    getStoredBiometricCredentials()
  );

  useEffect(() => {
    if (!isOpen) return;
    setSavedCredentials(getStoredBiometricCredentials());
    checkBiometricAvailability().then((res) => {
      setBiometricAvailability(res);
    });
  }, [isOpen]);

  // Register form
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regWeight, setRegWeight] = useState(72);
  const [regHeight, setRegHeight] = useState(1.72);

  const [regGender, setRegGender] = useState<GenderOption>('male');
  const [regLevel, setRegLevel] = useState<LevelOption>('beginner');
  const [regFocus, setRegFocus] = useState<FocusOption>('glutes');
  const [regFrequency, setRegFrequency] = useState<number>(4);
  const [regSplit, setRegSplit] = useState<SplitOption>('fullbody');

  if (!isOpen) return null;

  const handleQuickGuest = () => {
    const guest = authStorage.createGuestUser();
    onSuccess(guest);
  };

  const handleImportBackupAuth = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const res = authStorage.importBackupFile(parsed);
        if (res.error) {
          setError(res.error);
        } else if (res.user) {
          onSuccess(res.user);
        }
      } catch {
        setError('Arquivo de backup inválido ou corrompido.');
      }
    };
    reader.readAsText(file);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    const res = await loginWithGoogle();
    setIsGoogleLoading(false);

    if (res.error || !res.user) {
      setError(res.error || 'Falha ao autenticar com o Google.');
      return;
    }

    const gUser = res.user;
    const allUsers = authStorage.getUsers();
    let existing = allUsers.find(
      (u) => u.id === gUser.uid || (u.email && u.email.toLowerCase() === gUser.email?.toLowerCase())
    );

    if (existing) {
      authStorage.setActiveUserId(existing.id);
      markBiometricSessionUnlocked(existing.id, true);
      await syncUserProfileToCloud(existing);
      onSuccess(existing);
      return;
    }

    // Tenta carregar dados do Firestore caso o usuário já tenha treinos no banco online
    const remoteData = await fetchUserDataFromFirebase(gUser.uid);
    if (remoteData?.profile) {
      const rawUsers = (authStorage as any)._getRawUsers();
      rawUsers.push(remoteData.profile);
      authStorage.saveUsers(rawUsers);
      authStorage.setActiveUserId(remoteData.profile.id);
      markBiometricSessionUnlocked(remoteData.profile.id, true);

      if (remoteData.routines && remoteData.routines.length > 0) {
        safeStorage.set(`alex_u_${remoteData.profile.id}_routines`, remoteData.routines);
      }
      if (remoteData.sessions && remoteData.sessions.length > 0) {
        safeStorage.set(`alex_u_${remoteData.profile.id}_sessions`, remoteData.sessions);
      }
      if (remoteData.measurements && remoteData.measurements.length > 0) {
        safeStorage.set(`alex_u_${remoteData.profile.id}_measurements`, remoteData.measurements);
      }

      onSuccess(remoteData.profile);
      return;
    }

    // Cria novo perfil vinculado à conta Google do usuário
    const budget = calculateDefaultBudget('intermediate', 'male');
    const newUser: UserProfile = {
      id: gUser.uid,
      name: gUser.displayName || 'Atleta',
      username: (gUser.email?.split('@')[0] || `user_${Date.now()}`).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30),
      email: gUser.email || '',
      password: '',
      weightKg: 75,
      heightM: 1.75,
      gender: 'male',
      level: 'intermediate',
      focus: 'balanced',
      frequency: 4,
      preferredSplit: 'upper_lower',
      exercisesPerMuscle: 1,
      weeklyBudget: budget,
      muscleBudgets: createDefaultBudgets(budget, 'balanced'),
      createdAt: new Date().toISOString(),
    };

    const rawUsers = (authStorage as any)._getRawUsers();
    rawUsers.push(newUser);
    authStorage.saveUsers(rawUsers);
    authStorage.setActiveUserId(newUser.id);
    markBiometricSessionUnlocked(newUser.id, true);
    await syncUserProfileToCloud(newUser);
    onSuccess(newUser);
  };

  const handleBiometricQuickLogin = async (targetUserId?: string) => {
    setError(null);
    setIsBiometricLoading(true);
    const res = await authenticateWithBiometrics({
      userId: targetUserId,
      username: !targetUserId && loginUsername.trim() ? loginUsername.trim() : undefined,
    });
    setIsBiometricLoading(false);

    if (!res.success || !res.user) {
      setError(res.error || 'Não foi possível validar sua biometria.');
      return;
    }

    markBiometricSessionUnlocked(res.user.id, true);
    onSuccess(res.user);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = authStorage.login(loginUsername, loginPassword);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.user) {
      markBiometricSessionUnlocked(res.user.id, true);
      if (enableBiometricOnLogin && biometricAvailability.isWebAuthnSupported) {
        await registerBiometricCredential(res.user);
      }
      onSuccess(res.user);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (regPassword !== regPasswordConfirm) {
      setError('A confirmação de senha não confere.');
      return;
    }

    const calculatedBudget = calculateDefaultBudget(regLevel, regGender);

    const res = authStorage.register({
      name: regName,
      username: regUsername,
      password: regPassword,
      weightKg: regWeight,
      heightM: regHeight,
      gender: regGender,
      level: regLevel,
      focus: regFocus,
      frequency: regFrequency,
      preferredSplit: regSplit,
      exercisesPerMuscle: 1,
      weeklyBudget: calculatedBudget,
    });

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.user) {
      markBiometricSessionUnlocked(res.user.id, true);
      if (enableBiometricOnRegister && biometricAvailability.isWebAuthnSupported) {
        await registerBiometricCredential(res.user);
      }
      onSuccess(res.user);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl relative">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Banner */}
        <div className="text-center mb-5">
          <div className="w-11 h-11 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 mb-2.5">
            <Dumbbell className="w-5 h-5 stroke-[2.5]" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            MeuTreino Pro · Hipertrofia Individualizada
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Crie seu perfil e receba metas sob medida para o seu objetivo
          </p>
        </div>

        {/* Google One-Click Login & Online Cloud Storage Banner */}
        <div className="mb-4 space-y-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg active:scale-[0.98] disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isGoogleLoading ? 'Conectando ao Google...' : 'Entrar com Conta Google (Salvar na Nuvem)'}</span>
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <Cloud className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span>Banco de dados online conectado · Salva logins e treinos</span>
          </div>
        </div>

        {/* Quick Guest Exploration Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleQuickGuest}
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-sky-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <span>Continuar como visitante (offline)</span>
          </button>
        </div>

        {/* Segmented Tab Control */}
        <div className="grid grid-cols-2 p-1 bg-[#0b1220] rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'login'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'register'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar Perfil</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Tab */}
        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Acesso Rápido Biométrico (Face ID / Impressão Digital) */}
            {biometricAvailability.isWebAuthnSupported && savedCredentials.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-[#0b1324] to-[#0b1324] border border-emerald-500/40 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-white block">
                        Acesso Rápido sem Senha
                      </span>
                      <span className="text-[10px] text-emerald-300/90 block">
                        Desbloqueie com {biometricAvailability.biometricLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {savedCredentials.map((cred) => (
                    <button
                      key={cred.credentialId}
                      type="button"
                      disabled={isBiometricLoading}
                      onClick={() => handleBiometricQuickLogin(cred.userId)}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <ScanFace className="w-4 h-4" />
                      <span>
                        {isBiometricLoading
                          ? 'Verificando Biometria...'
                          : `Entrar como ${cred.userDisplayName || cred.username} (${biometricAvailability.biometricLabel})`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nome de Usuário
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-500 absolute left-3" />
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="ex: alex"
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Senha
              </label>
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {biometricAvailability.isWebAuthnSupported && (
                  <button
                    type="button"
                    disabled={isBiometricLoading}
                    onClick={() => handleBiometricQuickLogin()}
                    className="px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-95"
                    title={`Entrar com ${biometricAvailability.biometricLabel}`}
                  >
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">Biometria</span>
                  </button>
                )}
              </div>
            </div>

            {biometricAvailability.isWebAuthnSupported && savedCredentials.length === 0 && (
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0b1220] border border-slate-800 cursor-pointer hover:border-emerald-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={enableBiometricOnLogin}
                  onChange={(e) => setEnableBiometricOnLogin(e.target.checked)}
                  className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Fingerprint className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Ativar <strong className="text-white">{biometricAvailability.biometricLabel}</strong> neste aparelho para entrar sem senha nas próximas vezes
                  </span>
                </div>
              </label>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="submit"
                className="w-full py-3 px-3 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Acessar Meu Perfil</span>
              </button>
              <label className="w-full py-3 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center">
                <Upload className="w-4 h-4 text-sky-400" />
                <span>Restaurar Cópia Salva</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackupAuth}
                  className="hidden"
                />
              </label>
            </div>

          </form>
        ) : (
          /* Register Tab */
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Identification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Nome / Apelido
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ex: Carlos ou Camila"
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Nome de Usuário (login)
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="Ex: carlos_fit"
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  required
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* 1. SELEÇÃO DE SEXO */}
            <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                1. Sexo Biológico
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegGender('male')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    regGender === 'male'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-base">👨</span>
                  <span>Masculino</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegGender('female')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    regGender === 'female'
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
            <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Nível de Experiência</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRegLevel('beginner')}
                  className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    regLevel === 'beginner'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md font-black'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white font-bold'
                  }`}
                >
                  <span className="block text-xs">Iniciante</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegLevel('intermediate')}
                  className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    regLevel === 'intermediate'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md font-black'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white font-bold'
                  }`}
                >
                  <span className="block text-xs">Intermediário</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegLevel('advanced')}
                  className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    regLevel === 'advanced'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md font-black'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white font-bold'
                  }`}
                >
                  <span className="block text-xs">Avançado</span>
                </button>
              </div>
            </div>

            {/* 3. SELEÇÃO DE FOCO DO TREINO */}
            <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-rose-400" />
                <span>3. Foco Principal do Treino</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegFocus('glutes')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    regFocus === 'glutes'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>🍑</span>
                    <span>Glúteos & Pernas</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    Máxima ênfase em glúteo, posterior e quadríceps
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegFocus('strength')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    regFocus === 'strength'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>🏋️</span>
                    <span>Força & Cargas</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    Grandes compostos para força e densidade
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegFocus('v_taper')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    regFocus === 'v_taper'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>🔱</span>
                    <span>Shape em V</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    Costas largas, ombros e peitoral destacado
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegFocus('balanced')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    regFocus === 'balanced'
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
            <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>4. Frequência Semanal</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-sky-400">
                  {regFrequency}x por semana
                </span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[2, 3, 4, 5, 6].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => {
                      setRegFrequency(freq);
                      if (freq === 2) setRegSplit('upper_lower');
                      else if (freq === 3) setRegSplit('ppl');
                      else if (freq === 4) setRegSplit('upper_lower');
                      else if (freq === 5) setRegSplit('abcde');
                      else setRegSplit('ppl');
                    }}
                    className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                      regFrequency === freq
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

            {/* 5. SELEÇÃO DE DIVISÃO MUSCULAR (SPLIT) */}
            <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>5. Divisão de Treino</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {regSplit === 'fullbody'
                    ? 'Full Body'
                    : regSplit === 'abcde'
                    ? 'ABCDE (5 Dias)'
                    : regSplit === 'upper_lower'
                    ? 'Upper / Lower'
                    : regSplit === 'ppl'
                    ? 'Push Pull Legs'
                    : regSplit === 'lower'
                    ? 'Foco Inferiores'
                    : regSplit === 'upper'
                    ? 'Foco Superiores'
                    : 'PPL Clássico'}
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'fullbody', label: 'Full Body', desc: 'Corpo Todo' },
                  { id: 'abcde', label: 'ABCDE', desc: '5 Dias' },
                  { id: 'upper_lower', label: 'Upper / Lower', desc: 'Sup. & Inf.' },
                  { id: 'ppl', label: 'PPL', desc: 'Push Pull Legs' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setRegSplit(s.id as SplitOption)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      regSplit === s.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md font-black'
                        : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="block text-xs font-bold">{s.label}</span>
                    <span className="text-[9px] block text-slate-500 font-normal">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dados Corporais */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Peso Corporal (kg)</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={regWeight}
                  onChange={(e) => setRegWeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-sky-400" />
                  <span>Altura (m)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={regHeight}
                  onChange={(e) => setRegHeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Descrição informando que o treino será gerado com base nas respostas */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-sky-950/30 border border-emerald-500/20 text-slate-300 text-xs">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Seu treino será gerado baseado no seu <strong className="text-white">sexo</strong>, <strong className="text-white">nível de experiência</strong>, <strong className="text-white">foco</strong>, <strong className="text-white">frequência semanal</strong> e <strong className="text-white">volume alvo</strong>.
                </p>
              </div>
            </div>

            {biometricAvailability.isWebAuthnSupported && (
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0b1220] border border-slate-800 cursor-pointer hover:border-emerald-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={enableBiometricOnRegister}
                  onChange={(e) => setEnableBiometricOnRegister(e.target.checked)}
                  className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Fingerprint className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Vincular <strong className="text-white">{biometricAvailability.biometricLabel}</strong> ao criar meu perfil para desbloqueio rápido
                  </span>
                </div>
              </label>
            )}

            <button
              type="submit"
              className="w-full mt-1 py-3.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Criar Perfil & Gerar Treinos</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
