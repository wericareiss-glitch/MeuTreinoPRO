import { describe, it, expect } from 'vitest';
import {
  getSmartExerciseRest,
  getOptimalProgressionSuggestion,
} from '../progressiveOverload';
import { Exercise, WorkoutSessionSummary } from '../../types/workout';

describe('progressiveOverload', () => {
  describe('getSmartExerciseRest', () => {
    it('allocates 150 seconds for heavy lower body compounds', () => {
      const hackSquat: Exercise = {
        id: 'hack_squat_machine',
        name: 'Agachamento Hack',
        category: 'Quadríceps',
        muscleKey: 'quadriceps',
        equip: ['full_gym'],
        profile: 'curto',
        stability: 'Máxima',
        target: 'Quadríceps',
        bio: '',
        cue: '',
      };
      const rest = getSmartExerciseRest(hackSquat);
      expect(rest.restSeconds).toBe(150);
      expect(rest.isCompound).toBe(true);
    });

    it('allocates 120 seconds for upper body compounds', () => {
      const benchPress: Exercise = {
        id: 'smith_bench_press',
        name: 'Supino no Smith',
        category: 'Peito',
        muscleKey: 'chest',
        equip: ['full_gym'],
        profile: 'médio',
        stability: 'Alta',
        target: 'Peitoral Maior',
        bio: '',
        cue: '',
      };
      const rest = getSmartExerciseRest(benchPress);
      expect(rest.restSeconds).toBe(120);
      expect(rest.isCompound).toBe(true);
    });

    it('allocates 90 seconds for cables and supported machines', () => {
      const cableFly: Exercise = {
        id: 'cable_crossover',
        name: 'Crucifixo na Polia',
        category: 'Peito',
        muscleKey: 'chest',
        equip: ['cables_free'],
        profile: 'longo',
        stability: 'Média',
        target: 'Peitoral',
        bio: '',
        cue: '',
      };
      const rest = getSmartExerciseRest(cableFly);
      expect(rest.restSeconds).toBe(90);
      expect(rest.isCompound).toBe(false);
    });

    it('allocates 60 seconds for isolated smaller muscles', () => {
      const bicepCurl: Exercise = {
        id: 'biceps_curl_dumbbell',
        name: 'Rosca Direta com Halteres',
        category: 'Bíceps',
        muscleKey: 'biceps',
        equip: ['dumbbells_only'],
        profile: 'curto',
        stability: 'Livre',
        target: 'Bíceps Braquial',
        bio: '',
        cue: '',
      };
      const rest = getSmartExerciseRest(bicepCurl);
      expect(rest.restSeconds).toBe(60);
      expect(rest.isCompound).toBe(false);
    });
  });

  describe('getOptimalProgressionSuggestion', () => {
    const exercise: Exercise = {
      id: 'smith_bench_press',
      name: 'Supino no Smith',
      category: 'Peito',
      muscleKey: 'chest',
      equip: ['full_gym'],
      profile: 'médio',
      stability: 'Alta',
      target: 'Peitoral Maior',
      bio: '',
      cue: '',
    };

    it('recommends baseline calibration when no previous logs exist', () => {
      const suggestion = getOptimalProgressionSuggestion(
        exercise,
        '8 a 10',
        {},
        {},
        []
      );
      expect(suggestion.status).toBe('baseline');
      expect(suggestion.currentWeight).toBe(0);
    });

    it('suggests load increase (+2.5kg for upper compound) when reps hit ceiling', () => {
      const previousSession: WorkoutSessionSummary = {
        id: 's-1',
        splitName: 'Treino A',
        date: '2026-03-01T10:00:00Z',
        totalVolumeLoadKg: 3000,
        totalSets: 2,
        completedExercises: [
          {
            name: 'Supino no Smith',
            muscleGroup: 'Peito',
            muscleKey: 'chest',
            sets: [
              { weight: 80, reps: 10 },
              { weight: 80, reps: 10 },
            ],
          },
        ],
      };

      const suggestion = getOptimalProgressionSuggestion(
        exercise,
        '8 a 10',
        {},
        {},
        [previousSession]
      );

      expect(suggestion.status).toBe('progress');
      expect(suggestion.currentWeight).toBe(80);
      expect(suggestion.suggestedWeight).toBe(82.5); // +2.5kg
      expect(suggestion.reason).toContain('Meta batida com folga');
    });

    it('suggests maintaining weight to consolidate reps when below ceiling', () => {
      const previousSession: WorkoutSessionSummary = {
        id: 's-1',
        splitName: 'Treino A',
        date: '2026-03-01T10:00:00Z',
        totalVolumeLoadKg: 3000,
        totalSets: 2,
        completedExercises: [
          {
            name: 'Supino no Smith',
            muscleGroup: 'Peito',
            muscleKey: 'chest',
            sets: [
              { weight: 80, reps: 8 },
              { weight: 80, reps: 9 },
            ],
          },
        ],
      };

      const suggestion = getOptimalProgressionSuggestion(
        exercise,
        '8 a 10',
        {},
        {},
        [previousSession]
      );

      expect(suggestion.status).toBe('maintain');
      expect(suggestion.suggestedWeight).toBe(80);
      expect(suggestion.reason).toContain('mesma carga antes de subir');
    });
  });
});
