import { describe, it, expect, beforeEach } from 'vitest';
import {
  safeStorage,
  safeJsonParse,
  decodeLegacyIfEncrypted,
  calculateVolumeLoad,
  calculate1RM,
  calculate6RM,
  estimateNextSetWeight,
} from '../storage';
import { WorkoutLogs } from '../../types/workout';

describe('storage utility', () => {
  describe('safeJsonParse', () => {
    it('parses valid JSON accurately', () => {
      const data = safeJsonParse<{ name: string; age: number }>('{"name":"Alex","age":28}');
      expect(data).toEqual({ name: 'Alex', age: 28 });
    });

    it('strips dangerous prototype pollution properties', () => {
      const raw = '{"__proto__":{"polluted":"yes"},"name":"Secure"}';
      const parsed: any = safeJsonParse(raw);
      expect(parsed.name).toBe('Secure');
      expect(Object.prototype.hasOwnProperty('polluted')).toBe(false);
      expect(({} as any).polluted).toBeUndefined();
    });
  });

  describe('safeStorage', () => {
    beforeEach(() => {
      safeStorage.remove('test_key');
    });

    it('stores and retrieves data in memory and storage', () => {
      const payload = { focus: 'glutes', count: 42 };
      safeStorage.set('test_key', payload);
      const retrieved = safeStorage.get('test_key', null);
      expect(retrieved).toEqual(payload);
    });

    it('returns default value when key does not exist', () => {
      const val = safeStorage.get('non_existent_key', 'default_val');
      expect(val).toBe('default_val');
    });

    it('removes stored items properly', () => {
      safeStorage.set('test_key', 'hello');
      safeStorage.remove('test_key');
      expect(safeStorage.get('test_key', 'fallback')).toBe('fallback');
    });
  });

  describe('decodeLegacyIfEncrypted', () => {
    it('returns normal JSON strings unchanged', () => {
      const plain = JSON.stringify({ id: 123, test: true });
      expect(decodeLegacyIfEncrypted(plain)).toBe(plain);
    });

    it('handles malformed legacy payloads gracefully without throwing', () => {
      const malformedV1 = '__mtp_sec_v1__:not-valid-base64!!!';
      const malformedV2 = '__mtp_sec_v2__:0123456789abcdef:invalid';
      expect(() => decodeLegacyIfEncrypted(malformedV1)).not.toThrow();
      expect(() => decodeLegacyIfEncrypted(malformedV2)).not.toThrow();
    });
  });

  describe('calculateVolumeLoad', () => {
    it('calculates total volume for sets marked done', () => {
      const logs: WorkoutLogs = {
        ex1_1: { weight: '80', reps: '10', done: true },
        ex1_2: { weight: '90', reps: '8', done: true },
        ex1_3: { weight: '100', reps: '6', done: false }, // Not done
      };
      // (80 * 10) + (90 * 8) = 800 + 720 = 1520
      expect(calculateVolumeLoad(logs)).toBe(1520);
    });

    it('ignores non-numeric or zero weights', () => {
      const logs: WorkoutLogs = {
        ex1_1: { weight: 'abc', reps: '10', done: true },
        ex1_2: { weight: '0', reps: '10', done: true },
        ex1_3: { weight: '50', reps: '10', done: true },
      };
      expect(calculateVolumeLoad(logs)).toBe(500);
    });
  });

  describe('calculate1RM and calculate6RM', () => {
    it('returns null for invalid or non-positive weight/reps', () => {
      expect(calculate1RM(0, 10)).toBeNull();
      expect(calculate1RM(100, 0)).toBeNull();
      expect(calculate1RM('invalid', 10)).toBeNull();
    });

    it('calculates 1RM accurately adjusted for reps', () => {
      // 100kg x 1 rep -> 100kg
      expect(calculate1RM(100, 1)).toBe(100);

      // 100kg x 5 reps -> 100 * (1 + 5/30) = 116.7
      expect(calculate1RM(100, 5)).toBe(116.7);
    });

    it('calculates 6RM (~85% of 1RM) accurately', () => {
      // 1RM of 120 -> 120 / (1 + 6/30) = 120 / 1.2 = 100
      const sixRm = calculate6RM(120, 1);
      expect(sixRm).toBe(100);
    });

    it('estimates next set weight based on target reps', () => {
      // current 100kg x 8 reps -> 1RM = 100 * (1 + 8/30) = 126.67
      // target 10 reps -> 126.67 / (1 + 10/30) = 95
      const nextWeight = estimateNextSetWeight(100, 8, 10);
      expect(nextWeight).toBe(95);
    });
  });
});
