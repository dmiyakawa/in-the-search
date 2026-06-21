import { describe, expect, test } from 'vitest';
import { createEmptyMap, setTile, type GameMap } from '../../src/domain/map';
import { checkMove } from '../../src/domain/rules/movement';
import type { Unit } from '../../src/domain/units';

describe('checkMove', () => {
  const emptyOccupant = (_h: { q: number; r: number }): Unit | undefined => undefined;

  const blockAt = (map: GameMap, q: number, r: number): GameMap => {
    const tile = { ...map.tiles[`${q},${r}`]!, terrain: 'blocked' as const };
    return setTile(map, tile);
  };

  test('allows adjacent passable empty tile', () => {
    const map = createEmptyMap(2);
    expect(checkMove(map, { q: 0, r: 0 }, { q: 1, r: 0 }, emptyOccupant)).toBeNull();
  });

  test('rejects non-adjacent move', () => {
    const map = createEmptyMap(2);
    expect(checkMove(map, { q: 0, r: 0 }, { q: 2, r: 0 }, emptyOccupant)).toBe('not-adjacent');
  });

  test('rejects out-of-bounds move', () => {
    const map = createEmptyMap(0);
    expect(checkMove(map, { q: 0, r: 0 }, { q: 1, r: 0 }, emptyOccupant)).toBe('out-of-bounds');
  });

  test('rejects blocked terrain', () => {
    const map = blockAt(createEmptyMap(2), 1, 0);
    expect(checkMove(map, { q: 0, r: 0 }, { q: 1, r: 0 }, emptyOccupant)).toBe('blocked-terrain');
  });

  test('rejects occupied tile', () => {
    const map = createEmptyMap(2);
    const occupant = (h: { q: number; r: number }): Unit | undefined =>
      h.q === 1 && h.r === 0
        ? { id: 'x', kind: 'enemy', coord: h, hp: 1, maxHp: 1, vision: 1, movement: 1, attack: 1 }
        : undefined;
    expect(checkMove(map, { q: 0, r: 0 }, { q: 1, r: 0 }, occupant)).toBe('occupied');
  });
});
