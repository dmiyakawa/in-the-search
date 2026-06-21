import { describe, expect, test } from 'vitest';
import { compareRank, idRank, minBy, occupantAt } from '../../src/application/util';

describe('application util', () => {
  test('minBy picks smallest by tuple rank', () => {
    const arr = [
      { id: 'b', dist: 2 },
      { id: 'a', dist: 2 },
      { id: 'c', dist: 1 },
    ];
    expect(minBy(arr, (t) => [t.dist, t.id]).id).toBe('c');
    expect(minBy(arr, (t) => [t.dist]).id).toBe('c');
  });

  test('minBy breaks ties by id ascending', () => {
    const arr = [
      { id: 'b', dist: 1 },
      { id: 'a', dist: 1 },
    ];
    expect(minBy(arr, (t) => [t.dist, t.id]).id).toBe('a');
  });

  test('idRank sorts numeric suffixes naturally', () => {
    const ids = ['e10', 'e2', 'e1'];
    expect(ids.sort((a, b) => compareRank(idRank(a), idRank(b)))).toEqual(['e1', 'e2', 'e10']);
  });

  test('minBy throws on empty array', () => {
    expect(() => minBy([], () => [])).toThrow();
  });

  test('occupantAt returns unit at hex', () => {
    const u = {
      id: 'u',
      kind: 'player' as const,
      coord: { q: 1, r: 0 },
      hp: 10,
      maxHp: 10,
      vision: 2,
      movement: 2,
      attack: 2,
    };
    expect(occupantAt([u], { q: 1, r: 0 })?.id).toBe('u');
    expect(occupantAt([u], { q: 2, r: 0 })).toBeUndefined();
  });

  test('occupantAt ignores dead units', () => {
    const u = {
      id: 'u',
      kind: 'player' as const,
      coord: { q: 1, r: 0 },
      hp: 0,
      maxHp: 10,
      vision: 2,
      movement: 2,
      attack: 2,
    };
    expect(occupantAt([u], { q: 1, r: 0 })).toBeUndefined();
  });
});
