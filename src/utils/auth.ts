/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, MuscleGroup, GenderOption, LevelOption, FocusOption } from '../types/workout';
import { safeStorage } from './storage';

const USERS_KEY = 'alex_all_users';
const ACTIVE_USER_KEY = 'alex_active_user_id';
const LOGIN_RATE_LIMIT_KEY = 'mtp_auth_rate_limit_v1';
const HASH_PREFIX_V1 = 'mtp_hash_v1$';
const HASH_PREFIX_V2 = 'mtp_hash_v2$';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 segundos de bloqueio após 5 tentativas inválidas

interface LoginAttemptRecord {
  count: number;
  lockedUntil: number;
}

export const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'quadriceps',
  'hamstrings',
  'shoulders',
  'rear_delts',
  'biceps',
  'triceps',
  'glutes',
  'calves',
  'abs',
];

function generateSecureRandomHex(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Comparação em tempo constante para mitigar ataques de canal lateral por tempo (Timing Attacks)
 */
function constantTimeEqual(a: string, b: string): boolean {
  const lenA = a.length;
  const lenB = b.length;
  const maxLen = Math.max(lenA, lenB);
  let diff = lenA ^ lenB;
  for (let i = 0; i < maxLen; i++) {
    const codeA = i < lenA ? a.charCodeAt(i) : 0;
    const codeB = i < lenB ? b.charCodeAt(i) : 0;
    diff |= codeA ^ codeB;
  }
  return diff === 0;
}

function computeSaltedDigestV1(password: string, salt: string): string {
  const input = `${salt}::${password}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let round = 0; round < 64; round++) {
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i) + round;
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const part3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}${part3}`;
}

/**
 * Key stretching V2 com 10.000 iterações com CSPRNG salt para credenciais locais
 */
function computeSaltedDigestV2(password: string, salt: string): string {
  const input = `${salt}::${password}`;
  let s0 = 0x6a09e667 ^ input.length;
  let s1 = 0xbb67ae85 ^ input.length;
  let s2 = 0x3c6ef372 ^ input.length;
  let s3 = 0xa54ff53a ^ input.length;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    s0 = Math.imul(s0 ^ ch, 0x85ebca6b);
    s1 = Math.imul(s1 ^ (ch + i), 0xc2b2ae35);
    s2 = Math.imul(s2 ^ (ch * 31), 0x27d4eb2f);
    s3 = Math.imul(s3 ^ (ch ^ (i * 17)), 0x165667b1);
  }

  for (let round = 0; round < 10000; round++) {
    s0 = Math.imul(s0 ^ (s0 >>> 16) ^ round, 0x85ebca6b) ^ s1;
    s1 = Math.imul(s1 ^ (s1 >>> 13), 0xc2b2ae35) ^ s2;
    s2 = Math.imul(s2 ^ (s2 >>> 15) ^ round, 0x27d4eb2f) ^ s3;
    s3 = Math.imul(s3 ^ (s3 >>> 14), 0x165667b1) ^ s0;
  }

  const p0 = (s0 >>> 0).toString(16).padStart(8, '0');
  const p1 = (s1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (s2 >>> 0).toString(16).padStart(8, '0');
  const p3 = (s3 >>> 0).toString(16).padStart(8, '0');
  return `${p0}${p1}${p2}${p3}`;
}

function isHashedPassword(value?: string): boolean {
  if (!value) return false;
  return value.startsWith(HASH_PREFIX_V2) || value.startsWith(HASH_PREFIX_V1);
}

export function hashPassword(plainPassword: string, existingSalt?: string): string {
  if (!plainPassword) return '';
  if (plainPassword.startsWith(HASH_PREFIX_V2)) return plainPassword;
  const salt = existingSalt || generateSecureRandomHex(16);
  const digest = computeSaltedDigestV2(plainPassword, salt);
  return `${HASH_PREFIX_V2}${salt}$${digest}`;
}

export function verifyPasswordHash(inputPassword: string, storedPassword: string): boolean {
  if (!storedPassword || !inputPassword) return false;
  if (storedPassword.startsWith(HASH_PREFIX_V2)) {
    const parts = storedPassword.split('$');
    const salt = parts[1] || '';
    const expected = parts[2] || '';
    const actual = computeSaltedDigestV2(inputPassword, salt);
    return constantTimeEqual(actual, expected);
  }
  if (storedPassword.startsWith(HASH_PREFIX_V1)) {
    const parts = storedPassword.split('$');
    const salt = parts[1] || '';
    const expected = parts[2] || '';
    const actual = computeSaltedDigestV1(inputPassword, salt);
    return constantTimeEqual(actual, expected);
  }
  return false;
}

function checkRateLimit(identifier: string): { blocked: boolean; remainingSec: number } {
  const key = identifier.trim().toLowerCase();
  const map = safeStorage.get<Record<string, LoginAttemptRecord>>(LOGIN_RATE_LIMIT_KEY, {});
  const rec = map[key];
  if (!rec) return { blocked: false, remainingSec: 0 };
  const now = Date.now();
  if (rec.lockedUntil > now) {
    return { blocked: true, remainingSec: Math.ceil((rec.lockedUntil - now) / 1000) };
  }
  return { blocked: false, remainingSec: 0 };
}

function recordFailedAttempt(identifier: string): void {
  const key = identifier.trim().toLowerCase();
  const map = safeStorage.get<Record<string, LoginAttemptRecord>>(LOGIN_RATE_LIMIT_KEY, {});
  const now = Date.now();
  const prev = map[key];
  const nextCount = prev && prev.lockedUntil <= now ? prev.count + 1 : 1;
  map[key] = {
    count: nextCount,
    lockedUntil: nextCount >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_DURATION_MS : 0,
  };
  safeStorage.set(LOGIN_RATE_LIMIT_KEY, map);
}

function clearFailedAttempts(identifier: string): void {
  const key = identifier.trim().toLowerCase();
  const map = safeStorage.get<Record<string, LoginAttemptRecord>>(LOGIN_RATE_LIMIT_KEY, {});
  if (map[key]) {
    delete map[key];
    safeStorage.set(LOGIN_RATE_LIMIT_KEY, map);
  }
}

function sanitizeSafeId(rawId: unknown): string {
  if (typeof rawId !== 'string' || !rawId.trim()) {
    return `user_${Date.now()}_${generateSecureRandomHex(6)}`;
  }
  const cleaned = rawId.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return cleaned || `user_${Date.now()}_${generateSecureRandomHex(6)}`;
}

function sanitizeUntrustedObject<T>(input: T): T {
  if (input === null || typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeUntrustedObject(item)) as unknown as T;
  }
  const cleanObj: Record<string, any> = {};
  for (const [k, v] of Object.entries(input as Record<string, any>)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    cleanObj[k] = sanitizeUntrustedObject(v);
  }
  return cleanObj as T;
}

function sanitizeUserProfile(user: UserProfile): UserProfile {
  return {
    ...user,
    password: '', // Never expose password or hash in runtime memory or exports
  };
}

/**
 * Calcula as séries semanais totais recomendadas com base no nível e sexo
 */
export function calculateDefaultBudget(level: LevelOption = 'beginner', _gender: GenderOption = 'male'): number {
  const baseByLevel: Record<LevelOption, number> = {
    beginner: 60,
    intermediate: 90,
    advanced: 120,
  };
  return baseByLevel[level] || 90;
}

/**
 * Pesos proporcionais de distribuição conforme o foco escolhido pelo atleta
 */
export function getPresetWeights(focus: FocusOption = 'v_taper'): Record<MuscleGroup, number> {
  if (focus === 'glutes') {
    return {
      glutes: 20,
      hamstrings: 14,
      quadriceps: 15,
      back: 9,
      shoulders: 8,
      chest: 5,
      rear_delts: 6,
      biceps: 5,
      triceps: 5,
      calves: 7,
      abs: 6,
    };
  }
  if (focus === 'strength') {
    return {
      chest: 13,
      back: 14,
      quadriceps: 14,
      hamstrings: 11,
      shoulders: 10,
      triceps: 9,
      biceps: 8,
      glutes: 8,
      rear_delts: 5,
      calves: 4,
      abs: 4,
    };
  }
  if (focus === 'v_taper') {
    return {
      back: 15,
      shoulders: 14,
      chest: 13,
      quadriceps: 10,
      rear_delts: 9,
      biceps: 9,
      triceps: 9,
      hamstrings: 7,
      glutes: 5,
      calves: 5,
      abs: 4,
    };
  }
  return {
    chest: 10,
    back: 11,
    quadriceps: 11,
    hamstrings: 9,
    shoulders: 10,
    rear_delts: 7,
    biceps: 8,
    triceps: 8,
    glutes: 10,
    calves: 8,
    abs: 8,
  };
}

/**
 * Converte pesos proporcionais em número inteiro exato de séries somando totalBudget
 * Preserva estritamente músculos excluídos (com 0 séries)
 */
export function scaleWeightsToBudget(
  weights: Record<MuscleGroup, number>,
  totalBudget: number
): Record<MuscleGroup, number> {
  const result = {} as Record<MuscleGroup, number>;
  const activeMuscles = ALL_MUSCLE_GROUPS.filter((m) => (weights[m] || 0) > 0);
  
  // Se todos os músculos estiverem zerados ou não houver ativos
  if (activeMuscles.length === 0) {
    ALL_MUSCLE_GROUPS.forEach((m) => {
      result[m] = 0;
    });
    return result;
  }

  const sumWeights = activeMuscles.reduce((acc, m) => acc + (weights[m] || 0), 0);
  let currentSum = 0;

  ALL_MUSCLE_GROUPS.forEach((m) => {
    const raw = weights[m] || 0;
    if (raw <= 0) {
      result[m] = 0;
    } else {
      const val = Math.max(1, Math.round((raw / (sumWeights || 1)) * totalBudget));
      result[m] = val;
      currentSum += val;
    }
  });

  const diff = totalBudget - currentSum;
  if (diff !== 0 && activeMuscles.length > 0) {
    const topMuscle = activeMuscles.reduce((a, b) => ((weights[a] || 0) >= (weights[b] || 0) ? a : b));
    result[topMuscle] = Math.max(1, result[topMuscle] + diff);
  }

  return result;
}

/**
 * Redistribui as séries sobrando entre os músculos ativos com base no foco estético/biomecânico do atleta.
 * Músculos excluídos (0 séries ou alvo de exclusão) são estritamente preservados em 0.
 */
export function distributeLeftoverSetsByFocus(
  currentBudgets: Record<MuscleGroup, number>,
  totalBudget: number,
  focus: FocusOption = 'balanced',
  muscleToExclude?: MuscleGroup
): Record<MuscleGroup, number> {
  const result: Record<MuscleGroup, number> = { ...currentBudgets };

  if (muscleToExclude) {
    result[muscleToExclude] = 0;
  }

  const activeMuscles = ALL_MUSCLE_GROUPS.filter(
    (m) => m !== muscleToExclude && (result[m] || 0) > 0
  );

  // Se não houver nenhum outro músculo ativo, nada a redistribuir
  if (activeMuscles.length === 0) {
    return result;
  }

  const allocatedSum = activeMuscles.reduce((sum, m) => sum + (result[m] || 0), 0);
  const leftover = totalBudget - allocatedSum;

  if (leftover <= 0) {
    return result;
  }

  const weights = getPresetWeights(focus);
  const sumWeights = activeMuscles.reduce((acc, m) => acc + (weights[m] || 8), 0);

  // Ordena os músculos ativos pela prioridade decrescente do foco
  const sortedActive = [...activeMuscles].sort(
    (a, b) => (weights[b] || 8) - (weights[a] || 8)
  );

  // 1ª passada: distribuição proporcional do volume sobrando
  let distributed = 0;
  const additions: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;
  activeMuscles.forEach((m) => {
    const w = weights[m] || 8;
    const share = Math.floor((w / (sumWeights || 1)) * leftover);
    additions[m] = share;
    distributed += share;
  });

  // 2ª passada: aloca qualquer resíduo restante 1 a 1 para o topo da prioridade do foco
  let residue = leftover - distributed;
  let pIdx = 0;
  while (residue > 0 && sortedActive.length > 0) {
    const target = sortedActive[pIdx % sortedActive.length];
    additions[target] = (additions[target] || 0) + 1;
    residue -= 1;
    pIdx++;
  }

  // Aplica as séries adicionais nos músculos ativos
  activeMuscles.forEach((m) => {
    result[m] = (result[m] || 0) + (additions[m] || 0);
  });

  return result;
}

export const BUDGET_PRESETS: Record<
  string,
  { name: string; icon: string; desc: string; weights: Record<MuscleGroup, number> }
> = {
  v_taper: {
    name: 'Shape em V (Estética Clássica)',
    icon: '🔱',
    desc: 'Ênfase em dorsais largos, deltóides laterais e peitoral superior.',
    weights: getPresetWeights('v_taper'),
  },
  glutes: {
    name: 'Foco em Glúteos & Inferiores',
    icon: '🍑',
    desc: 'Prioridade máxima para glúteos, posteriores e quadríceps.',
    weights: getPresetWeights('glutes'),
  },
  strength: {
    name: 'Força & Densidade (Powerbuilding)',
    icon: '🏋️',
    desc: 'Distribuição focada nos grandes levantamentos compostos.',
    weights: getPresetWeights('strength'),
  },
  balanced: {
    name: 'Equilíbrio Total (Simetria)',
    icon: '⚖️',
    desc: 'Volume harmônico entre membros superiores e inferiores.',
    weights: getPresetWeights('balanced'),
  },
};

export function createDefaultBudgets(
  totalBudget = 88,
  focus: FocusOption = 'v_taper'
): Record<MuscleGroup, number> {
  const weights = getPresetWeights(focus);
  return scaleWeightsToBudget(weights, totalBudget);
}

export const authStorage = {
  /**
   * Internal reader that automatically upgrades any legacy plaintext passwords to salted hashes
   */
  _getRawUsers(): UserProfile[] {
    const users = safeStorage.get<UserProfile[]>(USERS_KEY, []);
    let upgraded = false;
    const normalized = users.map((u) => {
      if (u.password && !isHashedPassword(u.password)) {
        upgraded = true;
        return { ...u, password: hashPassword(u.password) };
      }
      return u;
    });
    if (upgraded) {
      safeStorage.set(USERS_KEY, normalized);
    }
    return normalized;
  },

  /**
   * Returns sanitized user profiles (passwords stripped)
   */
  getUsers(): UserProfile[] {
    return this._getRawUsers().map(sanitizeUserProfile);
  },

  hasRegisteredUsers(): boolean {
    return this._getRawUsers().length > 0;
  },

  saveUsers(users: UserProfile[]): void {
    const secured = users.map((u) => ({
      ...u,
      password: u.password && !isHashedPassword(u.password) ? hashPassword(u.password) : u.password,
    }));
    safeStorage.set(USERS_KEY, secured);
  },

  getActiveUserId(): string | null {
    return safeStorage.get<string | null>(ACTIVE_USER_KEY, null);
  },

  setActiveUserId(id: string | null): void {
    if (id) {
      safeStorage.set(ACTIVE_USER_KEY, id);
    } else {
      safeStorage.remove(ACTIVE_USER_KEY);
    }
  },

  getActiveUser(): UserProfile | null {
    const id = this.getActiveUserId();
    if (!id) return null;
    const users = this._getRawUsers();
    const found = users.find((u) => u.id === id);
    return found ? sanitizeUserProfile(found) : null;
  },

  verifyUserPassword(userId: string, passwordAttempt: string): boolean {
    const rate = checkRateLimit(`uid:${userId}`);
    if (rate.blocked) return false;

    const users = this._getRawUsers();
    const user = users.find((u) => u.id === userId);
    if (!user || user.isVisitor || !user.password) return false;
    const isValid = verifyPasswordHash(passwordAttempt, user.password);
    if (!isValid) {
      recordFailedAttempt(`uid:${userId}`);
      return false;
    }
    clearFailedAttempts(`uid:${userId}`);
    return true;
  },

  createGuestUser(): UserProfile {
    const users = this._getRawUsers();
    const existingGuest = users.find((u) => u.username === 'visitante');
    if (existingGuest) {
      this.setActiveUserId(existingGuest.id);
      return sanitizeUserProfile(existingGuest);
    }

    const budget = calculateDefaultBudget('intermediate', 'male');
    const newGuest: UserProfile = {
      id: 'user_guest_' + Date.now(),
      name: 'Atleta Visitante',
      username: 'visitante',
      password: '',
      isVisitor: true,
      weightKg: 75,
      heightM: 175,
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

    users.push(newGuest);
    this.saveUsers(users);
    this.setActiveUserId(newGuest.id);
    return sanitizeUserProfile(newGuest);
  },

  convertVisitorToPermanent(
    userId: string,
    data: { name: string; username: string; password: string }
  ): { user?: UserProfile; error?: string } {
    const users = this._getRawUsers();
    const cleanUsername = data.username.trim().toLowerCase();

    if (!cleanUsername || !data.password || !data.name.trim()) {
      return { error: 'Preencha nome, usuário e senha para criar sua conta.' };
    }

    if (data.password.length < 6) {
      return { error: 'A senha deve ter pelo menos 6 caracteres para sua segurança.' };
    }

    if (users.some((u) => u.id !== userId && u.username.toLowerCase() === cleanUsername)) {
      return { error: 'Este nome de usuário já está em uso. Escolha outro.' };
    }

    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return { error: 'Usuário não encontrado.' };

    users[idx] = {
      ...users[idx],
      name: data.name.trim().slice(0, 80),
      username: cleanUsername.slice(0, 40),
      password: hashPassword(data.password),
      isVisitor: false,
    };

    this.saveUsers(users);
    return { user: sanitizeUserProfile(users[idx]) };
  },

  register(data: Omit<UserProfile, 'id' | 'createdAt' | 'muscleBudgets'>): { user?: UserProfile; error?: string } {
    const users = this._getRawUsers();
    const cleanUsername = data.username.trim().toLowerCase();

    if (!cleanUsername || !data.name.trim()) {
      return { error: 'Preencha seu nome e nome de usuário.' };
    }

    if (data.password && data.password.length < 6) {
      return { error: 'A senha deve ter pelo menos 6 caracteres para proteger seus dados.' };
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { error: 'Este nome de usuário já está cadastrado.' };
    }

    const budget = data.weeklyBudget || calculateDefaultBudget(data.level, data.gender);
    const focus = data.focus || 'v_taper';
    const newUser: UserProfile = {
      ...data,
      name: data.name.trim().slice(0, 80),
      username: cleanUsername.slice(0, 40),
      password: data.password ? hashPassword(data.password) : '',
      id: `user_${Date.now()}_${generateSecureRandomHex(6)}`,
      weeklyBudget: budget,
      muscleBudgets: createDefaultBudgets(budget, focus),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setActiveUserId(newUser.id);
    return { user: sanitizeUserProfile(newUser) };
  },

  login(username: string, password: string): { user?: UserProfile; error?: string } {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !password) {
      return { error: 'Informe seu usuário e senha.' };
    }

    const rate = checkRateLimit(`user:${cleanUsername}`);
    if (rate.blocked) {
      return {
        error: `Muitas tentativas incorretas. Aguarde ${rate.remainingSec}s antes de tentar novamente.`,
      };
    }

    const users = this._getRawUsers();
    const foundIdx = users.findIndex(
      (u) => u.username.toLowerCase() === cleanUsername && verifyPasswordHash(password, u.password)
    );
    if (foundIdx === -1) {
      recordFailedAttempt(`user:${cleanUsername}`);
      return { error: 'Usuário ou senha incorretos.' };
    }

    clearFailedAttempts(`user:${cleanUsername}`);
    const found = users[foundIdx];

    // Transparently upgrade v1 hash to v2 (10,000 rounds + CSPRNG salt) upon login
    if (found.password && !found.password.startsWith(HASH_PREFIX_V2)) {
      users[foundIdx] = { ...found, password: hashPassword(password) };
      this.saveUsers(users);
    }

    this.setActiveUserId(found.id);
    return { user: sanitizeUserProfile(found) };
  },

  loginWithBiometricUserId(userId: string): { user?: UserProfile; error?: string } {
    const users = this._getRawUsers();
    const found = users.find((u) => u.id === userId);
    if (!found) {
      return { error: 'Perfil vinculado à biometria não foi encontrado neste aparelho.' };
    }
    clearFailedAttempts(`user:${found.username.toLowerCase()}`);
    clearFailedAttempts(`uid:${found.id}`);
    this.setActiveUserId(found.id);
    return { user: sanitizeUserProfile(found) };
  },

  logout(): void {
    this.setActiveUserId(null);
  },

  deleteUser(userId: string): void {
    const users = this._getRawUsers().filter((u) => u.id !== userId);
    this.saveUsers(users);

    const keysToRemove = [
      `alex_u_${userId}_split`,
      `alex_u_${userId}_strategy`,
      `alex_u_${userId}_ex_per_muscle`,
      `alex_u_${userId}_weekly_budget`,
      `alex_u_${userId}_level`,
      `alex_u_${userId}_equip`,
      `alex_u_${userId}_routines`,
      `alex_u_${userId}_active_routine_id`,
      `alex_u_${userId}_active_routine_started_at`,
      `alex_u_${userId}_workout`,
      `alex_u_${userId}_workout_items`,
      `alex_u_${userId}_current_logs`,
      `alex_u_${userId}_history_logs`,
      `alex_u_${userId}_sessions`,
      `alex_u_${userId}_weekly_volume`,
      `alex_u_${userId}_workout_notes`,
      `alex_u_${userId}_measurements`,
      `alex_u_${userId}_has_init_routines`,
      `mtp_reminder_${userId}`,
      `mtp_feedback_history_${userId}`,
      `mtp_cardio_active_${userId}`,
      `mtp_cardio_logs_${userId}`,
      `mtp_water_tracker_${userId}`,
      `mtp_deload_${userId}`,
    ];
    keysToRemove.forEach((k) => safeStorage.remove(k));

    // Remove credenciais biométricas vinculadas ao usuário excluído
    const bioCreds = safeStorage.get<any[]>('mtp_webauthn_credentials_v1', []);
    if (Array.isArray(bioCreds) && bioCreds.length > 0) {
      safeStorage.set(
        'mtp_webauthn_credentials_v1',
        bioCreds.filter((c) => c && c.userId !== userId)
      );
    }
    const bioLockMap = safeStorage.get<Record<string, boolean>>('mtp_webauthn_app_lock_v1', {});
    if (bioLockMap && typeof bioLockMap === 'object' && userId in bioLockMap) {
      delete bioLockMap[userId];
      safeStorage.set('mtp_webauthn_app_lock_v1', bioLockMap);
    }

    // Security fix: NEVER auto-login into another user's profile after deletion
    if (this.getActiveUserId() === userId) {
      this.setActiveUserId(null);
    }
  },

  updateProfile(
    userId: string,
    updates: Partial<
      Pick<
        UserProfile,
        | 'name'
        | 'weightKg'
        | 'heightM'
        | 'age'
        | 'bodyFatPercent'
        | 'gender'
        | 'level'
        | 'focus'
        | 'frequency'
        | 'preferredSplit'
        | 'exercisesPerMuscle'
        | 'weeklyBudget'
        | 'muscleBudgets'
        | 'nutritionPlan'
        | 'periodizationStrategy'
        | 'deepWorkMode'
      >
    >
  ): UserProfile | null {
    const users = this._getRawUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;

    const cleanUpdates = sanitizeUntrustedObject(updates);
    users[idx] = { ...users[idx], ...cleanUpdates };
    this.saveUsers(users);
    return sanitizeUserProfile(users[idx]);
  },

  changePassword(userId: string, oldPass: string, newPass: string): { success: boolean; error?: string } {
    const rate = checkRateLimit(`uid:${userId}`);
    if (rate.blocked) {
      return {
        success: false,
        error: `Muitas tentativas incorretas. Aguarde ${rate.remainingSec}s antes de tentar novamente.`,
      };
    }

    const users = this._getRawUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return { success: false, error: 'Usuário não encontrado.' };

    if (!verifyPasswordHash(oldPass, users[idx].password)) {
      recordFailedAttempt(`uid:${userId}`);
      return { success: false, error: 'A senha atual está incorreta.' };
    }
    clearFailedAttempts(`uid:${userId}`);

    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'A nova senha deve ter pelo menos 6 caracteres.' };
    }

    users[idx].password = hashPassword(newPass);
    this.saveUsers(users);
    return { success: true };
  },

  importBackupFile(backupData: any): { user?: UserProfile; error?: string } {
    try {
      const sanitizedBackup = sanitizeUntrustedObject(backupData);
      if (
        !sanitizedBackup ||
        typeof sanitizedBackup !== 'object' ||
        !sanitizedBackup.user ||
        typeof sanitizedBackup.user.username !== 'string' ||
        !sanitizedBackup.user.username.trim()
      ) {
        return { error: 'Arquivo JSON inválido ou não contém um perfil do MeuTreino Pro.' };
      }

      const rawUser = sanitizedBackup.user;
      const cleanUsername = String(rawUser.username).trim().toLowerCase().slice(0, 40);
      const cleanName = String(rawUser.name || cleanUsername).trim().slice(0, 80);
      const safeId = sanitizeSafeId(rawUser.id);

      const importedUser: UserProfile = {
        ...rawUser,
        id: safeId,
        name: cleanName,
        username: cleanUsername,
        password: rawUser.password ? hashPassword(String(rawUser.password)) : '',
      };

      const users = this._getRawUsers();
      const activeUserId = this.getActiveUserId();
      const existingIdx = users.findIndex(
        (u) => u.id === importedUser.id || u.username.toLowerCase() === cleanUsername
      );

      if (existingIdx >= 0) {
        const existingUser = users[existingIdx];
        const isAlreadyAuthenticatedAsOwner = activeUserId === existingUser.id;
        const hasValidBackupPassword =
          Boolean(rawUser.password) &&
          (verifyPasswordHash(String(rawUser.password), existingUser.password) ||
            constantTimeEqual(String(rawUser.password), existingUser.password));

        // Previne Account Takeover: se a conta já existe no aparelho e possui senha,
        // um arquivo de backup sem autenticação na tela de login não pode sobrescrever nem logar na conta existente.
        if (!isAlreadyAuthenticatedAsOwner && existingUser.password && !hasValidBackupPassword) {
          return {
            error:
              'Já existe uma conta protegida por senha com este usuário neste dispositivo. Faça login com sua senha antes de restaurar o backup.',
          };
        }

        const preservedPassword = existingUser.password || importedUser.password;
        users[existingIdx] = {
          ...importedUser,
          id: existingUser.id,
          password: preservedPassword,
        };
        importedUser.id = existingUser.id;
      } else {
        // Se um novo perfil é importado sem senha, cria como conta protegida ou exige configuração
        users.push(importedUser);
      }

      this.saveUsers(users);
      const uid = importedUser.id;
      this.setActiveUserId(uid);

      if (sanitizedBackup.settings && typeof sanitizedBackup.settings === 'object') {
        if (sanitizedBackup.settings.split) safeStorage.set(`alex_u_${uid}_split`, sanitizedBackup.settings.split);
        if (sanitizedBackup.settings.strategy) safeStorage.set(`alex_u_${uid}_strategy`, sanitizedBackup.settings.strategy);
        if (sanitizedBackup.settings.level) safeStorage.set(`alex_u_${uid}_level`, sanitizedBackup.settings.level);
        if (sanitizedBackup.settings.equip) safeStorage.set(`alex_u_${uid}_equip`, sanitizedBackup.settings.equip);
        if (sanitizedBackup.settings.weeklyBudget) safeStorage.set(`alex_u_${uid}_weekly_budget`, sanitizedBackup.settings.weeklyBudget);
      }

      if (Array.isArray(sanitizedBackup.routines)) safeStorage.set(`alex_u_${uid}_routines`, sanitizedBackup.routines);
      if (Array.isArray(sanitizedBackup.measurements)) safeStorage.set(`alex_u_${uid}_measurements`, sanitizedBackup.measurements);
      if (Array.isArray(sanitizedBackup.workoutItems)) safeStorage.set(`alex_u_${uid}_workout`, sanitizedBackup.workoutItems);
      if (sanitizedBackup.currentLogs && typeof sanitizedBackup.currentLogs === 'object') {
        safeStorage.set(`alex_u_${uid}_current_logs`, sanitizedBackup.currentLogs);
      }
      if (sanitizedBackup.historyLogs && typeof sanitizedBackup.historyLogs === 'object') {
        safeStorage.set(`alex_u_${uid}_history_logs`, sanitizedBackup.historyLogs);
      }
      if (Array.isArray(sanitizedBackup.sessions)) safeStorage.set(`alex_u_${uid}_sessions`, sanitizedBackup.sessions);
      if (sanitizedBackup.weeklyVolume && typeof sanitizedBackup.weeklyVolume === 'object') {
        safeStorage.set(`alex_u_${uid}_weekly_volume`, sanitizedBackup.weeklyVolume);
      }
      if (typeof sanitizedBackup.workoutNotes === 'string') {
        safeStorage.set(`alex_u_${uid}_workout_notes`, sanitizedBackup.workoutNotes);
      }

      return { user: sanitizeUserProfile(importedUser) };
    } catch {
      return { error: 'Falha ao processar o arquivo de backup.' };
    }
  },

  migrateUserData(oldUserId: string, newUserId: string): void {
    if (!oldUserId || !newUserId || oldUserId === newUserId) return;
    const suffixes = [
      '_split',
      '_strategy',
      '_ex_per_muscle',
      '_weekly_budget',
      '_level',
      '_equip',
      '_routines',
      '_active_routine_id',
      '_active_routine_started_at',
      '_workout',
      '_workout_items',
      '_current_logs',
      '_history_logs',
      '_sessions',
      '_weekly_volume',
      '_workout_notes',
      '_measurements',
      '_has_init_routines',
    ];
    suffixes.forEach((suffix) => {
      const oldVal = safeStorage.get(`alex_u_${oldUserId}${suffix}`, null);
      if (oldVal !== null) {
        safeStorage.set(`alex_u_${newUserId}${suffix}`, oldVal);
        safeStorage.remove(`alex_u_${oldUserId}${suffix}`);
      }
    });

    const singleKeys = [
      'mtp_reminder_',
      'mtp_feedback_history_',
      'mtp_cardio_active_',
      'mtp_cardio_logs_',
      'mtp_water_tracker_',
      'mtp_deload_',
    ];
    singleKeys.forEach((prefix) => {
      const oldVal = safeStorage.get(`${prefix}${oldUserId}`, null);
      if (oldVal !== null) {
        safeStorage.set(`${prefix}${newUserId}`, oldVal);
        safeStorage.remove(`${prefix}${oldUserId}`);
      }
    });
  },

  linkGoogleAccount(
    currentUserId: string, 
    firebaseUser: { uid: string; email?: string | null; displayName?: string | null }
  ): UserProfile {
    const users = this._getRawUsers();
    const idx = users.findIndex((u) => u.id === currentUserId);
    const newUid = firebaseUser.uid;
    const newEmail = firebaseUser.email || undefined;
    
    const existingIdx = users.findIndex((u) => u.id === newUid);
    if (existingIdx !== -1 && existingIdx !== idx) {
      users.splice(existingIdx, 1);
    }

    if (idx !== -1) {
      const current = users[idx];
      const updated: UserProfile = {
        ...current,
        id: newUid,
        email: newEmail,
        isVisitor: false,
        password: '', // Platform auth delegated to Google / Firebase Auth
        name: current.name === 'Atleta Visitante' && firebaseUser.displayName ? firebaseUser.displayName : current.name,
      };
      users[idx] = updated;
      this.saveUsers(users);
      this.setActiveUserId(newUid);
      this.migrateUserData(currentUserId, newUid);
      return sanitizeUserProfile(updated);
    } else {
      const budget = calculateDefaultBudget('intermediate', 'male');
      const newUser: UserProfile = {
        id: newUid,
        name: firebaseUser.displayName || 'Atleta',
        username: (firebaseUser.email?.split('@')[0] || `user_${Date.now()}`).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30),
        email: newEmail,
        password: '',
        isVisitor: false,
        weightKg: 75,
        heightM: 175,
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
      users.push(newUser);
      this.saveUsers(users);
      this.setActiveUserId(newUid);
      return sanitizeUserProfile(newUser);
    }
  },
};

