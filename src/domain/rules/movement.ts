import { distance, type Hex } from '../hex';
import { getTile, inBounds, type GameMap } from '../map';
import type { Unit } from '../units';

export type MoveRejection = 'not-adjacent' | 'out-of-bounds' | 'blocked-terrain' | 'occupied';

export const checkMove = (
  map: GameMap,
  from: Hex,
  to: Hex,
  occupantAt: (h: Hex) => Unit | undefined
): null | MoveRejection => {
  if (distance(from, to) !== 1) return 'not-adjacent';
  if (!inBounds(map, to)) return 'out-of-bounds';
  const tile = getTile(map, to);
  if (!tile) return 'out-of-bounds';
  if (tile.terrain === 'blocked') return 'blocked-terrain';
  if (occupantAt(to)) return 'occupied';
  return null;
};
