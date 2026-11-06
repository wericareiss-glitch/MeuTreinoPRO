import { describe, it, expect } from 'vitest';
import {
  getVolumeLandmarks,
  evaluateVolumeZone,
  MUSCLE_VOLUME_LANDMARKS,
} from '../volumeEngine';

describe('volumeEngine', () => {
  describe('getVolumeLandmarks', () => {
    it('returns correct landmarks for beginner chest', () => {
      const landmarks = getVolumeLandmarks('chest', 'beginner');
      expect(landmarks).toEqual({ mv: 6, mev: 8, mavMin: 10, mavMax: 14, mrv: 18 });
    });

    it('returns correct landmarks for advanced quadriceps', () => {
      const landmarks = getVolumeLandmarks('quadriceps', 'advanced');
      expect(landmarks).toEqual({ mv: 10, mev: 12, mavMin: 16, mavMax: 22, mrv: 26 });
    });

    it('falls back to intermediate when level is not specified', () => {
      const landmarks = getVolumeLandmarks('back');
      expect(landmarks).toEqual(MUSCLE_VOLUME_LANDMARKS.back.intermediate);
    });

    it('handles all muscle groups defined in the system', () => {
      const muscles = Object.keys(MUSCLE_VOLUME_LANDMARKS) as (keyof typeof MUSCLE_VOLUME_LANDMARKS)[];
      muscles.forEach((muscle) => {
        const intermediate = getVolumeLandmarks(muscle, 'intermediate');
        expect(intermediate.mev).toBeGreaterThanOrEqual(intermediate.mv);
        expect(intermediate.mavMin).toBeGreaterThanOrEqual(intermediate.mev);
        expect(intermediate.mavMax).toBeGreaterThanOrEqual(intermediate.mavMin);
        expect(intermediate.mrv).toBeGreaterThan(intermediate.mavMax);
      });
    });
  });

  describe('evaluateVolumeZone', () => {
    const landmarks = { mv: 6, mev: 8, mavMin: 10, mavMax: 16, mrv: 20 };

    it('categorizes sets below MEV as sub_mev', () => {
      const result = evaluateVolumeZone(5, landmarks);
      expect(result.zone).toBe('sub_mev');
      expect(result.color).toContain('sky');
      expect(result.percentOfMrv).toBe(25);
      expect(result.recommendation).toContain('Faltam 3 séries');
    });

    it('categorizes sets between MEV and mavMax as mev_mav (optimal)', () => {
      const resultAtMev = evaluateVolumeZone(8, landmarks);
      expect(resultAtMev.zone).toBe('mev_mav');

      const resultAtMid = evaluateVolumeZone(12, landmarks);
      expect(resultAtMid.zone).toBe('mev_mav');
      expect(resultAtMid.color).toContain('emerald');

      const resultAtMax = evaluateVolumeZone(16, landmarks);
      expect(resultAtMax.zone).toBe('mev_mav');
    });

    it('categorizes sets between mavMax and MRV as mav_mrv (near limit)', () => {
      const result = evaluateVolumeZone(18, landmarks);
      expect(result.zone).toBe('mav_mrv');
      expect(result.color).toContain('amber');
      expect(result.percentOfMrv).toBe(90);
    });

    it('categorizes sets above MRV as over_mrv (overtraining)', () => {
      const result = evaluateVolumeZone(22, landmarks);
      expect(result.zone).toBe('over_mrv');
      expect(result.color).toContain('rose');
      expect(result.percentOfMrv).toBe(110);
      expect(result.recommendation).toContain('Excedeu o MRV em 2 séries');
    });
  });
});
