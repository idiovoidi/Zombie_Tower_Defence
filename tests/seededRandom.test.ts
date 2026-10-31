import { describe, expect, test } from 'vitest';
import { createSeededRandom, hashString } from '../src/utils/seededRandom';

describe('seededRandom', () => {
  test('same seed yields the same sequence', () => {
    const a = createSeededRandom(1234);
    const b = createSeededRandom(1234);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  test('values stay within [0, 1)', () => {
    const r = createSeededRandom(-99);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('hashString is stable and never zero', () => {
    expect(hashString('Highway')).toBe(hashString('Highway'));
    expect(hashString('')).toBe(1);
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
