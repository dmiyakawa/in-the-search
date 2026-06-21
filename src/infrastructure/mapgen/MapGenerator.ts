import { distance, equals, hexLine, key, neighbors, type Hex } from '../../domain/hex';
import {
  createEmptyMap,
  coordsInRadius,
  getTile,
  inBounds,
  setTile,
  type GameMap,
} from '../../domain/map';
import {
  BLOCKED_RATE,
  ENEMY_COUNT,
  GATHER_AMOUNT,
  MAP_GEN_MAX_RETRY,
  MAP_RADIUS,
  MIN_POD_GOAL_DISTANCE,
  NEST_COUNT,
  RESOURCE_NODE_COUNT,
  createEnemy,
  createNest,
  type Nest,
  type Unit,
} from '../../domain/units';
import { createRng, type SeededRng } from '../rng/SeededRng';

export type GenResult = {
  map: GameMap;
  podCoord: Hex;
  goalCoord: Hex;
  enemies: Unit[];
  nests: Nest[];
};

export type GenResultWithRngState = GenResult & { rngState: number };

export const sampleN = <T>(arr: readonly T[], n: number, rng: SeededRng): T[] => {
  if (n < 0 || n > arr.length) {
    throw new Error(`Cannot sample ${n} items from ${arr.length} candidates`);
  }
  const copy = arr.slice();
  for (let i = 0; i < copy.length - 1; i++) {
    const j = i + rng.nextInt(copy.length - i);
    const tmp = copy[i];
    copy[i] = copy[j] as T;
    copy[j] = tmp as T;
  }
  return copy.slice(0, n);
};

export const bfsReachable = (map: GameMap, from: Hex, to: Hex): boolean => {
  const queue: Hex[] = [from];
  const seen = new Set<string>([key(from)]);

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head] as Hex;
    if (equals(current, to)) return true;
    for (const next of neighbors(current)) {
      const nextKey = key(next);
      const tile = getTile(map, next);
      if (!tile || tile.terrain !== 'passable' || seen.has(nextKey)) continue;
      seen.add(nextKey);
      queue.push(next);
    }
  }

  return false;
};

export const carveCorridor = (map: GameMap, from: Hex, to: Hex): GameMap => {
  let out = map;
  const carved = new Set<string>();
  for (const coord of hexLine(from, to)) {
    const coordKey = key(coord);
    if (carved.has(coordKey) || !inBounds(out, coord)) continue;
    carved.add(coordKey);
    const tile = getTile(out, coord);
    if (tile) out = setTile(out, { ...tile, terrain: 'passable' });
  }
  return out;
};

const markFeature = (map: GameMap, coord: Hex, feature: 'pod' | 'goal' | 'nest'): GameMap => {
  const tile = getTile(map, coord);
  if (!tile) throw new Error(`Feature coordinate out of bounds: ${key(coord)}`);
  return setTile(map, { ...tile, terrain: 'passable', feature });
};

const placeResources = (map: GameMap, coords: Hex[]): GameMap => {
  let out = map;
  for (const coord of coords) {
    const tile = getTile(out, coord);
    if (!tile) throw new Error(`Resource coordinate out of bounds: ${key(coord)}`);
    out = setTile(out, { ...tile, resourceAmount: GATHER_AMOUNT });
  }
  return out;
};

const withoutCoords = (pool: Hex[], coords: Hex[]): Hex[] => {
  const excluded = new Set(coords.map(key));
  return pool.filter((coord) => !excluded.has(key(coord)));
};

const attempt = (rng: SeededRng): GenResult => {
  let map = createEmptyMap(MAP_RADIUS);
  const podCoord = { q: 0, r: 0 };

  for (const coord of coordsInRadius(MAP_RADIUS)) {
    if (equals(coord, podCoord) || rng.nextFloat() >= BLOCKED_RATE) continue;
    const tile = getTile(map, coord);
    if (tile) map = setTile(map, { ...tile, terrain: 'blocked' });
  }

  map = markFeature(map, podCoord, 'pod');

  const goalCandidates = coordsInRadius(MAP_RADIUS).filter((coord) => {
    const tile = getTile(map, coord);
    return Boolean(
      tile && tile.terrain === 'passable' && distance(coord, podCoord) >= MIN_POD_GOAL_DISTANCE
    );
  });
  if (goalCandidates.length === 0) {
    throw new Error('Map generation failed: no goal candidates');
  }

  const goalCoord = goalCandidates[rng.nextInt(goalCandidates.length)] as Hex;
  map = markFeature(map, goalCoord, 'goal');

  let pool = coordsInRadius(MAP_RADIUS).filter((coord) => {
    const tile = getTile(map, coord);
    return Boolean(
      tile && tile.terrain === 'passable' && !equals(coord, podCoord) && !equals(coord, goalCoord)
    );
  });

  const nestCoords = sampleN(pool, NEST_COUNT, rng);
  pool = withoutCoords(pool, nestCoords);
  const enemyCoords = sampleN(pool, ENEMY_COUNT, rng);
  pool = withoutCoords(pool, enemyCoords);
  const resourceCoords = sampleN(pool, RESOURCE_NODE_COUNT, rng);

  const nests = nestCoords.map((coord, i) => createNest(`n${i}`, coord));
  for (const coord of nestCoords) {
    map = markFeature(map, coord, 'nest');
  }

  const enemies = enemyCoords.map((coord, i) => createEnemy(`e${i}`, coord));
  map = placeResources(map, resourceCoords);

  return { map, podCoord, goalCoord, enemies, nests };
};

export const generateMapWithRngState = (seed: number): GenResultWithRngState => {
  const rng = createRng(seed);
  let result = attempt(rng);

  for (let i = 1; i < MAP_GEN_MAX_RETRY; i++) {
    if (bfsReachable(result.map, result.podCoord, result.goalCoord)) {
      return { ...result, rngState: rng.getState() };
    }
    result = attempt(rng);
  }

  if (!bfsReachable(result.map, result.podCoord, result.goalCoord)) {
    result = { ...result, map: carveCorridor(result.map, result.podCoord, result.goalCoord) };
  }

  return { ...result, rngState: rng.getState() };
};

export const generateMap = (seed: number): GenResult => {
  const result = generateMapWithRngState(seed);
  return {
    map: result.map,
    podCoord: result.podCoord,
    goalCoord: result.goalCoord,
    enemies: result.enemies,
    nests: result.nests,
  };
};
