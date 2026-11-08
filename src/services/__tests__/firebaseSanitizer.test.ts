import { describe, it, expect } from 'vitest';
import { deepCleanForFirestore } from '../firebase';
import { extractTimestamp } from '../dataIntegritySync';

describe('Firebase & Firestore Data Integrity Helpers', () => {
  describe('deepCleanForFirestore', () => {
    it('removes undefined values from simple objects', () => {
      const input = {
        name: 'Supino Reto',
        notes: undefined,
        weight: 80,
      };
      const cleaned = deepCleanForFirestore(input);
      expect(cleaned).toEqual({
        name: 'Supino Reto',
        weight: 80,
      });
      expect('notes' in cleaned).toBe(false);
    });

    it('recursively cleans nested objects and arrays', () => {
      const input = {
        id: 'routine_1',
        name: 'Treino A',
        items: [
          {
            exercise: { name: 'Agachamento', cue: undefined },
            notes: undefined,
            sets: 4,
          },
        ],
        extra: {
          fieldA: 'ok',
          fieldB: undefined,
          deep: {
            val: 123,
            bad: undefined,
          },
        },
      };

      const cleaned = deepCleanForFirestore(input);
      expect(cleaned).toEqual({
        id: 'routine_1',
        name: 'Treino A',
        items: [
          {
            exercise: { name: 'Agachamento' },
            sets: 4,
          },
        ],
        extra: {
          fieldA: 'ok',
          deep: {
            val: 123,
          },
        },
      });
    });

    it('preserves Date objects intact', () => {
      const now = new Date();
      const input = {
        date: now,
        missing: undefined,
      };
      const cleaned = deepCleanForFirestore(input);
      expect(cleaned.date).toBe(now);
      expect('missing' in cleaned).toBe(false);
    });
  });

  describe('extractTimestamp', () => {
    it('extracts milliseconds from ISO date string', () => {
      const item = { date: '2026-11-08T10:00:00.000Z' };
      const ts = extractTimestamp(item);
      expect(ts).toBe(new Date('2026-11-08T10:00:00.000Z').getTime());
    });

    it('extracts from updatedAt field', () => {
      const item = { updatedAt: '2026-11-08T12:00:00.000Z' };
      const ts = extractTimestamp(item);
      expect(ts).toBe(new Date('2026-11-08T12:00:00.000Z').getTime());
    });

    it('extracts from Firestore Timestamp object', () => {
      const firestoreTs = {
        toDate: () => new Date('2026-11-08T15:00:00.000Z'),
      };
      const ts = extractTimestamp(firestoreTs);
      expect(ts).toBe(new Date('2026-11-08T15:00:00.000Z').getTime());
    });

    it('returns 0 for null or empty object', () => {
      expect(extractTimestamp(null)).toBe(0);
      expect(extractTimestamp({})).toBe(0);
    });
  });
});
