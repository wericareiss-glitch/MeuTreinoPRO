/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkoutSessionSummary, UserProfile } from '../types/workout';

export interface DeloadAnalysis {
  shouldDeload: boolean;
  reason: string;
  recommendedVolumeReductionPct: number;
}

/**
 * Analisa o histórico de treinos recentes para detectar fadiga acumulada e recomendar um Deload.
 */
export function checkDeloadRecommendation(sessions: WorkoutSessionSummary[], user: UserProfile): DeloadAnalysis {
  if (!sessions || sessions.length < 4) {
    return { 
      shouldDeload: false, 
      reason: 'Histórico insuficiente para análise de fadiga acumulada.', 
      recommendedVolumeReductionPct: 0 
    };
  }

  // Analisa as últimas 4 sessões registadas
  const recent = sessions.slice(0, 4);
  let decreasingTonnage = true;
  
  for (let i = 0; i < recent.length - 1; i++) {
    if (recent[i].totalVolumeLoadKg >= recent[i + 1].totalVolumeLoadKg * 0.98) {
      decreasingTonnage = false;
      break;
    }
  }

  if (decreasingTonnage) {
    return {
      shouldDeload: true,
      reason: 'Queda progressiva de tonelagem nas últimas 4 sessões detetada. Sugere-se uma semana de deload para recuperação articular e do sistema nervoso central.',
      recommendedVolumeReductionPct: 40,
    };
  }

  return {
    shouldDeload: false,
    reason: 'Capacidade recuperativa e desempenho estáveis. Nenhuma necessidade de deload no microciclo atual.',
    recommendedVolumeReductionPct: 0,
  };
}