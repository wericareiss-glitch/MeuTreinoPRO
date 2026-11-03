import { Exercise, WorkoutLogs, WorkoutSessionSummary } from '../types/workout';

export interface ProgressionRecommendation {
  status: 'progress' | 'maintain' | 'deload';
  suggestedWeight: number;
  currentWeight: number | null;
  reason: string;
}

export function getOptimalProgressionSuggestion(
  ex: Exercise,
  repRangeStr: string,
  history: WorkoutLogs,
  currentLogs: WorkoutLogs,
  sessions: WorkoutSessionSummary[]
): ProgressionRecommendation {
  // Parse rep range (ex: "8 a 10" -> max 10)
  const matches = (repRangeStr || '').match(/\d+/g);
  const maxTargetReps = matches && matches.length >= 2 ? parseInt(matches[1], 10) : 10;

  let lastWeight = 0;
  let lastReps = 0;

  // Search in sessions first
  for (const sess of sessions) {
    const match = sess.completedExercises.find((ce) => ce.name.toLowerCase() === ex.name.toLowerCase());
    if (match && match.sets.length > 0) {
      const lastSet = match.sets[match.sets.length - 1];
      lastWeight = lastSet.weight || 0;
      lastReps = lastSet.reps || 0;
      break;
    }
  }

  if (lastWeight === 0) {
    const hist = history[`${ex.id}_1`];
    if (hist && hist.weight) {
      lastWeight = parseFloat(hist.weight) || 0;
      lastReps = parseInt(hist.reps || '0', 10) || 0;
    }
  }

  // If achieved target reps in previous session, recommend +2.5kg to +5kg increase
  if (lastWeight > 0 && lastReps >= maxTargetReps) {
    const increment = lastWeight >= 40 ? 2.5 : 2;
    return {
      status: 'progress',
      suggestedWeight: lastWeight + increment,
      currentWeight: lastWeight,
      reason: `Meta de repetições atingida na sessão anterior (${lastReps} reps >= ${maxTargetReps}). Suba a carga!`,
    };
  }

  return {
    status: 'maintain',
    suggestedWeight: lastWeight > 0 ? lastWeight : 10,
    currentWeight: lastWeight > 0 ? lastWeight : null,
    reason: 'Consolide a carga atual mantendo a execução perfeita e a cadência.',
  };
}
