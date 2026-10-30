/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MuscleGroup, UserProfile, LevelOption, GenderOption, FocusOption, SplitOption } from '../types/workout';
import { safeStorage } from './storage';

export const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'chest',
  'back',
  'shoulders',
  'rear_delts',
  'triceps',
  'biceps',
  'abs',
];

export const BUDGET_PRESETS: Record<
  string,
  { name: string; icon: string; desc: string; weights: Record<MuscleGroup, number> }
> = {
  glutes: {
    name: 'Foco Glúteos & Pernas',
    icon: '🍑',
    desc: 'Prioridade máxima para Glúteos, Isquiotibiais e Quadríceps.',
    weights: {
      quadriceps: 13,
      hamstrings: 13,
      glutes: 16,
      calves: 8,
      chest: 5,
      back: 7,
      shoulders: 6,
      rear_delts: 5,
      triceps: 5,
      biceps: 5,
      abs: 7,
    },
  },
  strength: {
    name: 'Foco Força & Cargas',
    icon: '🏋️',
    desc: 'Grandes exercícios compostos para ganho acelerado de força e densidade.',
    weights: {
      quadriceps: 11,
      hamstrings: 10,
      glutes: 7,
      calves: 6,
      chest: 12,
      back: 12,
      shoulders: 10,
      rear_delts: 7,
      triceps: 8,
      biceps: 8,
      abs: 6,
    },
  },
  v_taper: {
    name: 'Foco Shape em V',
    icon: '🔱',
    desc: 'Prioridade para Dorsal, Deltoide Lateral, Peitoral Superior e Braços.',
    weights: {
      quadriceps: 7,
      hamstrings: 7,
      glutes: 5,
      calves: 6,
      chest: 11,
      back: 14,
      shoulders: 13,
      rear_delts: 8,
      triceps: 9,
      biceps: 9,
      abs: 6,
    },
  },
  balanced: {
    name: 'Equilíbrio Total',
    icon: '⚖️',
    desc: 'Distribuição simétrica e harmônica para o corpo todo.',
    weights: {
      quadriceps: 8,
      hamstrings: 8,
      glutes: 6,
      calves: 8,
      chest: 9,
      back: 9,
      shoulders: 8,
      rear_delts: 7,
      triceps: 8,
      biceps: 8,
      abs: 6,
    },
  },
};

/**
 * Calcula o total padrão de séries semanais baseado no nível do atleta:
 * - Iniciante: 80 séries totais semanais
 * - Intermediário: 120 séries totais semanais
 * - Avançado: 160 séries totais semanais
 */
export function calculateDefaultBudget(
  level: LevelOption = 'beginner',
  gender: GenderOption = 'male'
): number {
  if (level === 'advanced') return 160;
  if (level === 'intermediate') return 120;
  return 80;
}

export function getPresetWeights(focus: FocusOption = 'balanced'): Record<MuscleGroup, number> {
  if (focus === 'glutes') return BUDGET_PRESETS.glutes.weights;
  if (focus === 'strength') return BUDGET_PRESETS.strength.weights;
  if (focus === 'v_taper') return BUDGET_PRESETS.v_taper.weights;
  return BUDGET_PRESETS.balanced.weights;
}

export function scaleWeightsToBudget(
  weights: Record<MuscleGroup, number>,
  totalBudget: number
): Record<MuscleGroup, number> {
  const sumWeights = Object.values(weights).reduce((a, b) => a + b, 0);
  const result: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;

  let allocated = 0;
  ALL_MUSCLE_GROUPS.forEach((m) => {
    const raw = Math.round((weights[m] / sumWeights) * totalBudget);
    result[m] = Math.max(2, raw);
    allocated += result[m];
  });

  // Adjust difference to match exactly totalBudget on primary groups
  let diff = totalBudget - allocated;
  const priorityOrder: MuscleGroup[] = ['back', 'chest', 'quadriceps', 'shoulders', 'hamstrings', 'glutes'];
  let idx = 0;
  while (diff !== 0) {
    const targetMuscle = priorityOrder[idx % priorityOrder.length];
    if (diff > 0) {
      result[targetMuscle] += 1;
      diff -= 1;
    } else if (diff < 0 && result[targetMuscle] > 2) {
      result[targetMuscle] -= 1;
      diff += 1;
    } else {
      break;
    }
    idx++;
  }

  return result;
}

export const authStorage = {
  getUsers(): UserProfile[] {
    const users = safeStorage.get<UserProfile[]>('alex_all_users', []);
    // Remove any legacy demo accounts from storage
    const realUsers = users.filter((u) => u.username.toLowerCase() !== 'alex' && u.id !== 'user_alex_demo');
    if (realUsers.length !== users.length) {
      safeStorage.set('alex_all_users', realUsers);
    }
    return realUsers;
  },

  getActiveUser(): UserProfile | null {
    let activeId = safeStorage.get<string | null>('alex_active_user_id', null);
    if (activeId === 'user_alex_demo') {
      safeStorage.remove('alex_active_user_id');
      activeId = null;
    }
    if (!activeId) return null;
    const users = this.getUsers();
    return users.find((u) => u.id === activeId) || null;
  },

  setActiveUserId(id: string | null) {
    if (id && id !== 'user_alex_demo') {
      safeStorage.set('alex_active_user_id', id);
    } else {
      safeStorage.remove('alex_active_user_id');
    }
  },

  login(username: string, pass: string): { user?: UserProfile; error?: string } {
    const users = this.getUsers();
    const cleanUser = username.trim().toLowerCase();
    const found = users.find((u) => u.username.toLowerCase() === cleanUser);

    if (!found) {
      return { error: 'Usuário não encontrado.' };
    }
    if (found.password !== pass) {
      return { error: 'Senha incorreta.' };
    }

    this.setActiveUserId(found.id);
    return { user: found };
  },

  register(data: {
    username: string;
    name: string;
    password: string;
    weightKg: number;
    heightM: number;
    gender?: GenderOption;
    level?: LevelOption;
    focus?: FocusOption;
    frequency?: number;
    preferredSplit?: SplitOption;
    exercisesPerMuscle?: 1 | 2;
    weeklyBudget?: number;
    isVisitor?: boolean;
  }): { user?: UserProfile; error?: string } {
    const users = this.getUsers();
    const cleanUsername = data.username.trim().toLowerCase();

    if (!cleanUsername) return { error: 'Nome de usuário obrigatório.' };
    if (cleanUsername.length < 3) return { error: 'Nome de usuário deve ter ao menos 3 caracteres.' };
    if (!data.name.trim()) return { error: 'Nome / Apelido obrigatório.' };
    if (!data.password || data.password.length < 3) {
      return { error: 'A senha deve ter ao menos 3 caracteres.' };
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { error: 'Este nome de usuário já está cadastrado.' };
    }

    const gender: GenderOption = data.gender || 'male';
    const level: LevelOption = data.level || 'beginner';
    const focus: FocusOption = data.focus || 'v_taper';
    const frequency: number = data.frequency || 4;
    const preferredSplit: SplitOption = data.preferredSplit || (frequency <= 3 ? 'fullbody' : 'upper');
    const exercisesPerMuscle: 1 | 2 = 1; // Padrão sempre 1 exercício por músculo
    const budget = data.weeklyBudget || calculateDefaultBudget(level, gender);
    const weights = getPresetWeights(focus);

    const newUser: UserProfile = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      username: cleanUsername,
      name: data.name.trim(),
      password: data.password,
      weightKg: data.weightKg || 75,
      heightM: data.heightM || 1.75,
      gender,
      level,
      focus,
      frequency,
      preferredSplit,
      exercisesPerMuscle,
      weeklyBudget: budget,
      muscleBudgets: scaleWeightsToBudget(weights, budget),
      isVisitor: data.isVisitor || false,
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    safeStorage.set('alex_all_users', updated);
    this.setActiveUserId(newUser.id);
    return { user: newUser };
  },

  updateProfile(userId: string, partial: Partial<UserProfile>): UserProfile | null {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;

    const updatedUser = { ...users[idx], ...partial };
    users[idx] = updatedUser;
    safeStorage.set('alex_all_users', users);
    return updatedUser;
  },

  convertVisitorToPermanent(
    userId: string,
    data: { name: string; username: string; password: string }
  ): { user?: UserProfile; error?: string } {
    const users = this.getUsers();
    const cleanUsername = data.username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { error: 'Nome de usuário deve ter ao menos 3 caracteres.' };
    }
    if (users.some((u) => u.id !== userId && u.username.toLowerCase() === cleanUsername)) {
      return { error: 'Este nome de usuário já está em uso.' };
    }
    if (!data.password || data.password.length < 3) {
      return { error: 'A senha deve ter ao menos 3 caracteres.' };
    }
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return { error: 'Perfil não encontrado.' };

    const updated = {
      ...users[idx],
      name: data.name.trim() || users[idx].name,
      username: cleanUsername,
      password: data.password,
      isVisitor: false,
    };
    users[idx] = updated;
    safeStorage.set('alex_all_users', users);
    return { user: updated };
  },

  deleteUser(userId: string): boolean {
    const users = this.getUsers().filter((u) => u.id !== userId);
    safeStorage.set('alex_all_users', users);

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
      `alex_u_${userId}_current_logs`,
      `alex_u_${userId}_history_logs`,
      `alex_u_${userId}_sessions`,
      `alex_u_${userId}_weekly_volume`,
      `alex_u_${userId}_workout_notes`,
      `alex_u_${userId}_measurements`,
      `mtp_cardio_active_${userId}`,
      `mtp_cardio_history_${userId}`,
    ];
    keysToRemove.forEach((k) => safeStorage.remove(k));

    if (this.getActiveUser()?.id === userId) {
      if (users.length > 0) {
        this.setActiveUserId(users[0].id);
      } else {
        this.setActiveUserId(null);
      }
    }
    return true;
  },

  changePassword(userId: string, oldPass: string, newPass: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return { success: false, error: 'Usuário não encontrado.' };

    if (users[idx].password !== oldPass) {
      return { success: false, error: 'Senha atual incorreta.' };
    }
    if (!newPass || newPass.length < 3) {
      return { success: false, error: 'Nova senha deve ter ao menos 3 caracteres.' };
    }

    users[idx].password = newPass;
    safeStorage.set('alex_all_users', users);
    return { success: true };
  },

  createGuestUser(name: string = 'Visitante'): UserProfile {
    const randomSuffix = Math.random().toString(36).slice(2, 6);
    const res = this.register({
      username: `visitante_${randomSuffix}`,
      name,
      password: 'demo',
      weightKg: 75,
      heightM: 1.75,
      gender: 'male',
      level: 'intermediate',
      focus: 'balanced',
      frequency: 4,
      preferredSplit: 'upper_lower',
      exercisesPerMuscle: 1,
      weeklyBudget: 80,
      isVisitor: true,
    });
    return res.user!;
  },

  importBackupFile(parsed: any): { user?: UserProfile; error?: string } {
    if (!parsed || !parsed.user) {
      return { error: 'Arquivo inválido: nenhum perfil de atleta encontrado no backup.' };
    }
    const backupUser: UserProfile = parsed.user;
    const users = this.getUsers();
    const existingIdx = users.findIndex(
      (u) => u.id === backupUser.id || u.username.toLowerCase() === backupUser.username.toLowerCase()
    );
    if (existingIdx >= 0) {
      users[existingIdx] = backupUser;
    } else {
      users.push(backupUser);
    }
    safeStorage.set('alex_all_users', users);
    this.setActiveUserId(backupUser.id);

    const uid = backupUser.id;
    if (parsed.currentLogs) safeStorage.set(`alex_u_${uid}_current_logs`, parsed.currentLogs);
    if (parsed.historyLogs) safeStorage.set(`alex_u_${uid}_history_logs`, parsed.historyLogs);
    if (parsed.sessions) safeStorage.set(`alex_u_${uid}_sessions`, parsed.sessions);
    if (parsed.weeklyVolume) safeStorage.set(`alex_u_${uid}_weekly_volume`, parsed.weeklyVolume);
    if (parsed.workoutItems) safeStorage.set(`alex_u_${uid}_workout`, parsed.workoutItems);
    if (parsed.routines) safeStorage.set(`alex_u_${uid}_routines`, parsed.routines);
    if (parsed.workoutNotes !== undefined) safeStorage.set(`alex_u_${uid}_workout_notes`, parsed.workoutNotes);
    if (parsed.measurements) safeStorage.set(`alex_u_${uid}_measurements`, parsed.measurements);

    return { user: backupUser };
  },

  logout() {
    this.setActiveUserId(null);
  },
};
