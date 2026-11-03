import { UserProfile, MuscleGroup, GenderOption, LevelOption } from '../types/workout';

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

export function calculateDefaultBudget(level: LevelOption, gender: GenderOption): number {
  if (gender === 'female') {
    if (level === 'beginner') return 60;
    if (level === 'intermediate') return 76;
    return 90;
  }
  if (level === 'beginner') return 64;
  if (level === 'intermediate') return 80;
  return 96;
}

export function getDefaultMuscleBudgets(gender: GenderOption): Record<MuscleGroup, number> {
  const base = gender === 'female' ? 12 : 10;
  return {
    quadriceps: base + 2,
    hamstrings: base + 2,
    glutes: gender === 'female' ? base + 8 : base,
    calves: base,
    chest: base,
    back: base + 2,
    shoulders: base,
    rear_delts: base,
    triceps: base - 2,
    biceps: base - 2,
    abs: base - 2,
  };
}

export const authStorage = {
  getActiveUser(): UserProfile | null {
    try {
      const activeId = localStorage.getItem('alex_active_user_id');
      if (!activeId) {
        // Se não houver, cria um perfil padrão para Alex com dados otimizados
        const defaultUser: UserProfile = {
          id: 'user_alex_default',
          name: 'Alex',
          username: 'alex',
          weightKg: 81,
          heightM: 1.80,
          gender: 'male',
          level: 'intermediate',
          focus: 'strength',
          frequency: 5,
          preferredSplit: 'upper',
          exercisesPerMuscle: 2,
          weeklyBudget: 80,
          muscleBudgets: getDefaultMuscleBudgets('male'),
        };
        localStorage.setItem('alex_active_user_id', defaultUser.id);
        localStorage.setItem(`alex_profile_${defaultUser.id}`, JSON.stringify(defaultUser));
        return defaultUser;
      }
      const data = localStorage.getItem(`alex_profile_${activeId}`);
      if (!data) return null;
      return JSON.parse(data) as UserProfile;
    } catch {
      return null;
    }
  },

  login(username: string, _pass: string): { user?: UserProfile; error?: string } {
    try {
      const clean = username.trim().toLowerCase();
      const allKeys = Object.keys(localStorage);
      for (const k of allKeys) {
        if (k.startsWith('alex_profile_')) {
          const profile = JSON.parse(localStorage.getItem(k) || '{}') as UserProfile;
          if (profile.username === clean) {
            localStorage.setItem('alex_active_user_id', profile.id);
            return { user: profile };
          }
        }
      }
      return { error: 'Utilizador não encontrado. Verifique o nome ou crie um novo perfil.' };
    } catch {
      return { error: 'Erro ao autenticar.' };
    }
  },

  register(payload: Omit<UserProfile, 'id' | 'muscleBudgets'> & { password?: string }): { user?: UserProfile; error?: string } {
    try {
      const clean = payload.username.trim().toLowerCase();
      const allKeys = Object.keys(localStorage);
      for (const k of allKeys) {
        if (k.startsWith('alex_profile_')) {
          const profile = JSON.parse(localStorage.getItem(k) || '{}') as UserProfile;
          if (profile.username === clean) {
            return { error: 'Este nome de utilizador já está em uso.' };
          }
        }
      }
      const newUser: UserProfile = {
        id: `user_${Date.now()}`,
        name: payload.name.trim(),
        username: clean,
        weightKg: payload.weightKg,
        heightM: payload.heightM,
        gender: payload.gender,
        level: payload.level,
        focus: payload.focus,
        frequency: payload.frequency,
        preferredSplit: payload.preferredSplit,
        exercisesPerMuscle: payload.exercisesPerMuscle,
        weeklyBudget: payload.weeklyBudget,
        muscleBudgets: getDefaultMuscleBudgets(payload.gender),
      };
      localStorage.setItem('alex_active_user_id', newUser.id);
      localStorage.setItem(`alex_profile_${newUser.id}`, JSON.stringify(newUser));
      return { user: newUser };
    } catch {
      return { error: 'Erro ao criar perfil.' };
    }
  },

  updateProfile(userId: string, updates: Partial<UserProfile>): UserProfile | null {
    try {
      const data = localStorage.getItem(`alex_profile_${userId}`);
      if (!data) return null;
      const current = JSON.parse(data) as UserProfile;
      const updated = { ...current, ...updates };
      localStorage.setItem(`alex_profile_${userId}`, JSON.stringify(updated));
      return updated;
    } catch {
      return null;
    }
  },

  logout(): void {
    try {
      localStorage.removeItem('alex_active_user_id');
    } catch {
      // Ignore
    }
  }
};
