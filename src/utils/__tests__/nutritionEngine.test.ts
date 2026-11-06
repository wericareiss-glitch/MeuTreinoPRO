import { describe, it, expect } from 'vitest';
import {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  getDefaultActivityLevel,
  generateNutritionPlan,
} from '../nutritionEngine';
import { UserProfile } from '../../types/workout';

describe('nutritionEngine', () => {
  describe('calculateBMR', () => {
    it('uses Mifflin-St Jeor formula for male without body fat percentage', () => {
      // (10 * 80) + (6.25 * 180) - (5 * 25) + 5 = 800 + 1125 - 125 + 5 = 1805
      const res = calculateBMR({
        weightKg: 80,
        heightM: 1.8,
        age: 25,
        gender: 'male',
      });
      expect(res.formulaUsed).toBe('Mifflin-St Jeor');
      expect(res.bmr).toBe(1805);
    });

    it('uses Mifflin-St Jeor formula for female', () => {
      // (10 * 60) + (6.25 * 165) - (5 * 30) - 161 = 600 + 1031.25 - 150 - 161 = 1320.25 -> 1320
      const res = calculateBMR({
        weightKg: 60,
        heightM: 1.65,
        age: 30,
        gender: 'female',
      });
      expect(res.formulaUsed).toBe('Mifflin-St Jeor');
      expect(res.bmr).toBe(1320);
    });

    it('uses Katch-McArdle formula when valid body fat percentage is provided', () => {
      // weight = 80kg, bodyFat = 15% -> leanMass = 68kg
      // BMR = 370 + 21.6 * 68 = 370 + 1468.8 = 1838.8 -> 1839
      const res = calculateBMR({
        weightKg: 80,
        heightM: 1.8,
        age: 25,
        gender: 'male',
        bodyFatPercent: 15,
      });
      expect(res.formulaUsed).toBe('Katch-McArdle');
      expect(res.bmr).toBe(1839);
    });
  });

  describe('calculateTDEE', () => {
    it('applies sedentary multiplier (1.2)', () => {
      expect(calculateTDEE(2000, 'sedentary')).toBe(2400);
    });

    it('applies moderate multiplier (1.55)', () => {
      expect(calculateTDEE(2000, 'moderate')).toBe(3100);
    });

    it('applies athlete multiplier (1.9)', () => {
      expect(calculateTDEE(2000, 'athlete')).toBe(3800);
    });
  });

  describe('calculateMacros', () => {
    it('strictly caps fat calories to at most 20% of target calories', () => {
      const targetCalories = 2500;
      const macros = calculateMacros(80, targetCalories, 'maintenance');

      const fatCalories = macros.fatsGrams * 9;
      expect(fatCalories).toBeLessThanOrEqual(targetCalories * 0.20 + 9); // within integer rounding margin
    });

    it('allocates higher protein (2.4g/kg) during aggressive cutting', () => {
      const macros = calculateMacros(80, 2000, 'cutting_aggressive');
      expect(macros.proteinPerKg).toBe(2.4);
      expect(macros.proteinGrams).toBe(192);
    });

    it('allocates remaining calories to carbohydrates', () => {
      const targetCalories = 2500;
      const macros = calculateMacros(80, targetCalories, 'maintenance');

      const totalCalculatedCalories =
        macros.proteinGrams * 4 + macros.fatsGrams * 9 + macros.carbsGrams * 4;

      // Should be very close to 2500 kcal within rounding error
      expect(Math.abs(totalCalculatedCalories - targetCalories)).toBeLessThanOrEqual(15);
    });
  });

  describe('getDefaultActivityLevel', () => {
    it('infers activity level correctly based on workout frequency', () => {
      expect(getDefaultActivityLevel(2)).toBe('light');
      expect(getDefaultActivityLevel(4)).toBe('moderate');
      expect(getDefaultActivityLevel(5)).toBe('heavy');
      expect(getDefaultActivityLevel(7)).toBe('athlete');
    });
  });

  describe('generateNutritionPlan', () => {
    const user: UserProfile = {
      id: 'u-1',
      username: 'teste',
      name: 'Teste',
      password: '',
      level: 'intermediate',
      frequency: 4,
      preferredSplit: 'upper_lower',
      focus: 'strength',
      weeklyBudget: 75,
      muscleBudgets: {
        quadriceps: 10,
        hamstrings: 8,
        glutes: 8,
        calves: 6,
        chest: 10,
        back: 10,
        shoulders: 8,
        rear_delts: 6,
        triceps: 6,
        biceps: 6,
        abs: 4,
      },
      gender: 'male',
      age: 28,
      weightKg: 75,
      heightM: 1.78,
      createdAt: '2026-01-01T00:00:00Z',
    };

    it('produces a complete, balanced nutrition plan', () => {
      const plan = generateNutritionPlan(user);
      expect(plan.tmb).toBeGreaterThan(1000);
      expect(plan.tdee).toBeGreaterThan(plan.tmb);
      expect(plan.proteinGrams).toBeGreaterThan(100);
      expect(plan.waterMl).toBe(75 * 40); // 3000ml
    });
  });
});
