import { describe, expect, test } from 'vitest';
import { createRng } from '../../src/infrastructure/rng/SeededRng';

describe('SeededRng', () => {
  test('same seed produces same sequence', () => {
    const a = createRng(123);
    const b = createRng(123);
    expect([a.nextU32(), a.nextU32(), a.nextU32()]).toEqual([
      b.nextU32(),
      b.nextU32(),
      b.nextU32(),
    ]);
  });

  test('state restores sequence from current point', () => {
    const rng = createRng(987);
    rng.nextU32();
    rng.nextU32();
    const restored = createRng(rng.getState());
    expect([rng.nextU32(), rng.nextU32()]).toEqual([restored.nextU32(), restored.nextU32()]);
  });

  test('nextFloat returns values in [0, 1)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) {
      const value = rng.nextFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test('nextInt returns values in range', () => {
    const rng = createRng(2);
    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  test('nextInt rejects invalid max', () => {
    const rng = createRng(3);
    expect(() => rng.nextInt(0)).toThrow(/positive integer/);
    expect(() => rng.nextInt(1.5)).toThrow(/positive integer/);
  });
});
