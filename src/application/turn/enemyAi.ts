import { HEX_DIRECTIONS, add, distance, type Hex } from '../../domain/hex';
import { getTile, inBounds } from '../../domain/map';
import { isPlayerSide, type Unit } from '../../domain/units';
import type { GameState } from '../state';
import { idRank, minBy, occupantAt } from '../util';

type EnemyTarget = {
  id: string;
  coord: Hex;
  priority: number;
};

export type EnemyAction =
  | { kind: 'attack'; targetId: string }
  | { kind: 'move'; to: Hex }
  | { kind: 'wait' };

export const decideEnemyAction = (state: GameState, enemy: Unit): EnemyAction => {
  const targets: EnemyTarget[] = state.units
    .filter((u) => isPlayerSide(u) && u.hp > 0)
    .map((u) => ({
      id: u.id,
      coord: u.coord,
      priority: u.kind === 'player' ? 0 : 2,
    }));

  if (state.pod.hp > 0) {
    targets.push({ id: 'pod', coord: state.pod.coord, priority: 1 });
  }

  const adjacent = targets.filter((t) => distance(enemy.coord, t.coord) === 1);
  if (adjacent.length > 0) {
    return { kind: 'attack', targetId: minBy(adjacent, (t) => [t.priority, ...idRank(t.id)]).id };
  }

  const seen = targets.filter((t) => distance(enemy.coord, t.coord) <= enemy.vision);
  if (seen.length === 0) return { kind: 'wait' };

  const target = minBy(seen, (t) => [distance(enemy.coord, t.coord), t.priority, ...idRank(t.id)]);

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
