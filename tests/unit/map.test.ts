import { describe, expect, test } from 'vitest';
import {
  coordsInRadius,
  createEmptyMap,
  getTile,
  inBounds,
  setTile,
  tilesWithin,
} from '../../src/domain/map';

describe('map helpers', () => {
  test('coordsInRadius count', () => {
    expect(coordsInRadius(0).length).toBe(1);
    expect(coordsInRadius(1).length).toBe(7);
    expect(coordsInRadius(2).length).toBe(19);
    expect(coordsInRadius(3).length).toBe(37);
    for (const R of [0, 1, 2, 3, 6]) {
      expect(coordsInRadius(R).length).toBe(3 * R * R + 3 * R + 1);
    }
  });

  test('createEmptyMap initializes all passable unknown tiles', () => {
    const map = createEmptyMap(2);
    expect(Object.keys(map.tiles).length).toBe(19);
    for (const tile of Object.values(map.tiles)) {
      expect(tile.terrain).toBe('passable');
      expect(tile.visibility).toBe('unknown');
      expect(tile.resourceAmount).toBe(0);
      expect(tile.feature).toBeUndefined();
    }
  });

  test('inBounds respects radius', () => {
    const map = createEmptyMap(2);
    expect(inBounds(map, { q: 0, r: 0 })).toBe(true);
    expect(inBounds(map, { q: 2, r: 0 })).toBe(true);
    expect(inBounds(map, { q: 0, r: 2 })).toBe(true);
    expect(inBounds(map, { q: -2, r: 2 })).toBe(true);
    expect(inBounds(map, { q: 3, r: 0 })).toBe(false);
    expect(inBounds(map, { q: 2, r: 1 })).toBe(false);
  });

  test('setTile is pure and getTile roundtrips', () => {
    const map = createEmptyMap(1);
    const coord = { q: 1, r: 0 };
    const original = getTile(map, coord);
    expect(original).toBeDefined();
    const modified = { ...original!, terrain: 'blocked' as const };
    const newMap = setTile(map, modified);
    expect(getTile(map, coord)?.terrain).toBe('passable');
    expect(getTile(newMap, coord)?.terrain).toBe('blocked');
  });

  test('tilesWithin returns tiles within distance radius', () => {
    const map = createEmptyMap(3);
    const center = { q: 0, r: 0 };
    const radius1 = tilesWithin(map, center, 1);
    expect(radius1.length).toBe(7);
    for (const tile of radius1) {
      expect(
        Math.abs(tile.coord.q) + Math.abs(tile.coord.r) + Math.abs(tile.coord.q + tile.coord.r)
      ).toBeLessThanOrEqual(2);
    }
  });
});
