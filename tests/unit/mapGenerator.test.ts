import { describe, expect, test } from 'vitest';
import { key } from '../../src/domain/hex';
import { getTile } from '../../src/domain/map';
import {
  BLOCKED_RATE,
  ENEMY_COUNT,
  GATHER_AMOUNT,
  MAP_RADIUS,
  MIN_POD_GOAL_DISTANCE,
  NEST_COUNT,
  RESOURCE_NODE_COUNT,
} from '../../src/domain/units';
import { bfsReachable, generateMap, sampleN } from '../../src/infrastructure/mapgen/MapGenerator';
import { createRng } from '../../src/infrastructure/rng/SeededRng';
import { distance } from '../../src/domain/hex';

describe('MapGenerator', () => {
  test('generateMap is deterministic for same seed', () => {
    expect(JSON.stringify(generateMap(12345))).toBe(JSON.stringify(generateMap(12345)));
  });

  test('pod, goal, counts, and reachability follow generation rules', () => {
    const result = generateMap(12345);

    expect(result.map.radius).toBe(MAP_RADIUS);
    expect(result.podCoord).toEqual({ q: 0, r: 0 });
    expect(getTile(result.map, result.podCoord)?.feature).toBe('pod');
    expect(getTile(result.map, result.goalCoord)?.feature).toBe('goal');
    expect(distance(result.podCoord, result.goalCoord)).toBeGreaterThanOrEqual(
      MIN_POD_GOAL_DISTANCE
    );
    expect(bfsReachable(result.map, result.podCoord, result.goalCoord)).toBe(true);
    expect(result.enemies).toHaveLength(ENEMY_COUNT);
    expect(result.nests).toHaveLength(NEST_COUNT);
    expect(result.enemies.map((e) => e.id)).toEqual(['e0', 'e1', 'e2', 'e3', 'e4']);
    expect(result.nests.map((n) => n.id)).toEqual(['n0', 'n1']);
  });

  test('placed entities and resources do not overlap reserved coordinates', () => {
    const result = generateMap(20260621);
    const reserved = new Set([key(result.podCoord), key(result.goalCoord)]);
    const occupied = new Set<string>();

    for (const unit of result.enemies) {
      const coordKey = key(unit.coord);
      expect(reserved.has(coordKey)).toBe(false);
      expect(occupied.has(coordKey)).toBe(false);
      expect(getTile(result.map, unit.coord)?.terrain).toBe('passable');
      occupied.add(coordKey);
    }

    for (const nest of result.nests) {
      const coordKey = key(nest.coord);
      expect(reserved.has(coordKey)).toBe(false);
      expect(occupied.has(coordKey)).toBe(false);
      expect(getTile(result.map, nest.coord)?.feature).toBe('nest');
      expect(getTile(result.map, nest.coord)?.terrain).toBe('passable');
      occupied.add(coordKey);
    }

    const resourceTiles = Object.values(result.map.tiles).filter(
      (tile) => tile.resourceAmount === GATHER_AMOUNT
    );
    expect(resourceTiles).toHaveLength(RESOURCE_NODE_COUNT);
    for (const tile of resourceTiles) {
      const coordKey = key(tile.coord);
      expect(reserved.has(coordKey)).toBe(false);
      expect(occupied.has(coordKey)).toBe(false);
      expect(tile.terrain).toBe('passable');
      occupied.add(coordKey);
    }
  });

  test('blocked rate is close to configured rate', () => {
    const result = generateMap(42);
    const tiles = Object.values(result.map.tiles);
    const blockedRate = tiles.filter((tile) => tile.terrain === 'blocked').length / tiles.length;
    expect(blockedRate).toBeGreaterThan(BLOCKED_RATE - 0.12);
    expect(blockedRate).toBeLessThan(BLOCKED_RATE + 0.12);
  });

  test('sampleN uses deterministic non-replacement sampling', () => {
    const first = sampleN([1, 2, 3, 4, 5], 3, createRng(99));
    const second = sampleN([1, 2, 3, 4, 5], 3, createRng(99));
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(3);
  });
});
