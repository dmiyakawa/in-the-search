import { describe, expect, test } from 'vitest';
import { decideEnemyAction } from '../../src/application/turn/enemyAi';
import { createEmptyMap, type GameMap } from '../../src/domain/map';
import {
  createEnemy,
  createPlayer,
  createScout,
  POD_DEFENSE,
  POD_HP,
} from '../../src/domain/units';
import type { GameState } from '../../src/application/state';

const makeState = (map: GameMap, units: GameState['units']): GameState => ({
  map,
  units,
  pod: { id: 'pod', coord: { q: -99, r: 0 }, hp: POD_HP, maxHp: POD_HP, defense: POD_DEFENSE },
  nests: [],
  inventory: { resource: 0 },
  turn: 1,
  phase: 'enemy',
  status: 'playing',
  turnState: { movementLeft: {}, hasActed: {} },
  rngState: 0,
});

describe('decideEnemyAction', () => {
  test('attacks adjacent player-side unit with lowest id', () => {
    const map = createEmptyMap(3);
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 1, r: 0 });
    const scout = createScout('r0', { q: 0, r: 1 });
    const state = makeState(map, [enemy, player, scout]);

    const action = decideEnemyAction(state, enemy);
    expect(action).toEqual({ kind: 'attack', targetId: 'p0' });
  });

  test('prefers player over pod at the same distance', () => {
    const map = createEmptyMap(3);
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 1, r: 0 });
    const state = makeState(map, [enemy, player]);
    state.pod.coord = { q: 0, r: 1 };

    const action = decideEnemyAction(state, enemy);
    expect(action).toEqual({ kind: 'attack', targetId: 'p0' });
  });

  test('attacks pod when no player-side unit is adjacent', () => {
    const map = createEmptyMap(3);
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 3, r: 0 });
    const state = makeState(map, [enemy, player]);
    state.pod.coord = { q: 1, r: 0 };

    const action = decideEnemyAction(state, enemy);
    expect(action).toEqual({ kind: 'attack', targetId: 'pod' });
  });

  test('moves toward visible pod when player is not visible', () => {
    const map = createEmptyMap(4);
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 4, r: 0 });
    const state = makeState(map, [enemy, player]);
    state.pod.coord = { q: 2, r: 0 };

    const action = decideEnemyAction(state, enemy);
    expect(action).toEqual({ kind: 'move', to: { q: 1, r: 0 } });
  });

  test('moves toward nearest target', () => {
    const map = createEmptyMap(3);
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 3, r: 0 });
    const state = makeState(map, [enemy, player]);

    const action = decideEnemyAction(state, enemy);
    expect(action).toEqual({ kind: 'move', to: { q: 1, r: 0 } });
  });

  test('direction tie-breaker picks the closer step', () => {
    const map = createEmptyMap(3);
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 2, r: -2 });
    const state = makeState(map, [enemy, player]);

    const action = decideEnemyAction(state, enemy);
    expect(action).toEqual({ kind: 'move', to: { q: 1, r: -1 } });
  });

  test('waits when no target is visible', () => {
    const map = createEmptyMap(3);
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 5, r: 0 });
    const state = makeState(map, [enemy, player]);

    const action = decideEnemyAction(state, enemy);
    expect(action).toEqual({ kind: 'wait' });
  });

  test('waits when surrounded by blocked tiles', () => {
    const map = createEmptyMap(1);
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 0, r: 0 });
    const state = makeState(map, [enemy, player]);

    const action = decideEnemyAction(state, enemy);
    expect(action).toEqual({ kind: 'wait' });
  });
});
