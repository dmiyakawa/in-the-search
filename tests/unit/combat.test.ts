import { describe, expect, test } from 'vitest';
import { resolveAttack } from '../../src/domain/rules/combat';

describe('resolveAttack', () => {
  test('deals fixed damage', () => {
    const result = resolveAttack({ attack: 3 }, 10);
    expect(result.damage).toBe(3);
    expect(result.targetHpAfter).toBe(7);
    expect(result.destroyed).toBe(false);
  });

  test('clamps hp at zero on overkill', () => {
    const result = resolveAttack({ attack: 5 }, 3);
    expect(result.damage).toBe(5);
    expect(result.targetHpAfter).toBe(0);
    expect(result.destroyed).toBe(true);
  });

  test('reports destroyed when hp reaches exactly zero', () => {
    const result = resolveAttack({ attack: 4 }, 4);
    expect(result.targetHpAfter).toBe(0);
    expect(result.destroyed).toBe(true);
  });
});
