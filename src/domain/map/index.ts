import { distance, key, type Hex } from '../hex';
import type { GameMap, Tile } from './types';

export * from './types';

export const coordsInRadius = (R: number): Hex[] => {
  const out: Hex[] = [];
  for (let q = -R; q <= R; q++) {
    const rMin = Math.max(-R, -q - R);
    const rMax = Math.min(R, -q + R);
    for (let r = rMin; r <= rMax; r++) {
      out.push({ q, r });
    }
  }
  return out;
};

export const createEmptyMap = (R: number): GameMap => {
  const tiles: Record<string, Tile> = {};
  for (const coord of coordsInRadius(R)) {
    tiles[key(coord)] = {
      coord,
      terrain: 'passable',
      visibility: 'unknown',
      resourceAmount: 0,
    };
  }
  return { radius: R, tiles };
};

export const inBounds = (map: GameMap, h: Hex): boolean => {
  const R = map.radius;
  return Math.abs(h.q) <= R && Math.abs(h.r) <= R && Math.abs(h.q + h.r) <= R;
};

export const getTile = (map: GameMap, h: Hex): Tile | undefined => map.tiles[key(h)];

export const setTile = (map: GameMap, tile: Tile): GameMap => ({
  ...map,
  tiles: { ...map.tiles, [key(tile.coord)]: tile },
});

export const tilesWithin = (map: GameMap, center: Hex, radius: number): Tile[] => {
  const out: Tile[] = [];
  for (const coord of coordsInRadius(map.radius)) {
    if (distance(center, coord) <= radius) {
      const tile = getTile(map, coord);
      if (tile) out.push(tile);
    }
  }
  return out;
};
