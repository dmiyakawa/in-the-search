import { HEX_DIRECTIONS, add, distance, type Hex } from '../../domain/hex';
import { getTile, inBounds } from '../../domain/map';
import { isPlayerSide, type Unit, type UnitId } from '../../domain/units';
import type { GameState } from '../state';
import { minBy, occupantAt } from '../util';

export type EnemyAction =
  | { kind: 'attack'; targetId: UnitId }
  | { kind: 'move'; to: Hex }
  | { kind: 'wait' };

export const decideEnemyAction = (state: GameState, enemy: Unit): EnemyAction => {
  const targets = state.units.filter((u) => isPlayerSide(u) && u.hp > 0);

  const adjacent = targets.filter((t) => distance(enemy.coord, t.coord) === 1);
  if (adjacent.length > 0) {
    return { kind: 'attack', targetId: minBy(adjacent, (t) => [t.id]).id };
  }

  const seen = targets.filter((t) => distance(enemy.coord, t.coord) <= enemy.vision);
  if (seen.length === 0) return { kind: 'wait' };

  const target = minBy(seen, (t) => [distance(enemy.coord, t.coord), t.id]);

  let best: Hex | undefined;
  for (const d of HEX_DIRECTIONS) {
    const n = add(enemy.coord, d);
    if (!inBounds(state.map, n)) continue;
    const tile = getTile(state.map, n);
    if (!tile || tile.terrain === 'blocked') continue;
    if (occupantAt(state.units, n)) continue;
    if (best === undefined || distance(n, target.coord) < distance(best, target.coord)) {
      best = n;
    }
  }

  if (best && distance(best, target.coord) < distance(enemy.coord, target.coord)) {
    return { kind: 'move', to: best };
  }
  return { kind: 'wait' };
};
