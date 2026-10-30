/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile } from '../types/workout';

export interface MacroResult {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

/**
 * Calcula as metas diárias de calorias e macronutrientes para hipertrofia com base no perfil.
 */
export function calculateTargetMacros(user: UserProfile): MacroResult {
  const weight = user.weightKg || 75;
  const heightCm = (user.heightM || 1.75) * 100;
  const age = 27; // Idade padrão associada ao perfil base

  // TMB (Taxa Metabólica Basal) - Equação de Mifflin-St Jeor
  let bmr = (10 * weight) + (6.25 * heightCm) - (5 * age);
  if (user.gender === 'female') {
    bmr -= 161;
  } else {
    bmr += 5;
  }

  // Fator de atividade moderada/alta (quem treina 4-5x por semana)
  const tdee = bmr * 1.55;

  // Superávit calórico controlado para hipertrofia limpa (+300 kcal)
  const targetCalories = Math.round(tdee + 300);

  // Proteína: 2.2g por kg de peso corporal
  const proteinGrams = Math.round(weight * 2.2);

  // Gorduras: 1.0g por kg de peso corporal
  const fatGrams = Math.round(weight * 1.0);

  // Carboidratos: preenche o restante das calorias (Proteína = 4kcal/g, Gordura = 9kcal/g, Carbo = 4kcal/g)
  const proteinCalories = proteinGrams * 4;
  const fatCalories = fatGrams * 9;
  const remainingCalories = Math.max(500, targetCalories - (proteinCalories + fatCalories));
  const carbsGrams = Math.round(remainingCalories / 4);

  return {
    calories: targetCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
  };
}