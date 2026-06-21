import type { Hex } from '../hex';

export type Terrain = 'passable' | 'blocked';
export type Visibility = 'unknown' | 'discovered' | 'visible';
export type Feature = 'pod' | 'goal' | 'nest';

export type Tile = {
  coord: Hex;
  terrain: Terrain;
  visibility: Visibility;
  resourceAmount: number;
  feature?: Feature;
};

export type GameMap = {
  radius: number;
  tiles: Record<string, Tile>;
};
