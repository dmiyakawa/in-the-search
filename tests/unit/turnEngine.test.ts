import { describe, expect, test } from 'vitest';
import { runEnemyPhaseAndAdvance } from '../../src/application/turn/turnEngine';
import type { GameState } from '../../src/application/state';
import type { DomainEvent } from '../../src/application/events';
import { createEmptyMap } from '../../src/domain/map';
import { createEnemy, createPlayer } from '../../src/domain/units';

const makeState = (units: GameState['units']): GameState => ({
  map: createEmptyMap(3),
  units,
  nests: [],
  inventory: { resource: 0 },
  turn: 1,
  phase: 'player',
  status: 'playing',
  turnState: { movementLeft: {}, hasActed: {} },
  rngState: 0,
});

describe('runEnemyPhaseAndAdvance', () => {
  test('enemy moves toward player', () => {
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 3, r: 0 });
    const state = makeState([enemy, player]);
    const events: DomainEvent[] = [];

    runEnemyPhaseAndAdvance(state, (e) => events.push(e));

    expect(state.units.find((u) => u.id === 'e0')?.coord).toEqual({ q: 1, r: 0 });
    expect(events.some((e) => e.type === 'UnitMoved')).toBe(true);
    expect(events.some((e) => e.type === 'TurnAdvanced')).toBe(true);
    expect(state.phase).toBe('player');
    expect(state.turn).toBe(2);
  });

  test('enemy attacks adjacent player', () => {
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 1, r: 0 });
    const state = makeState([enemy, player]);
    const events: DomainEvent[] = [];

    runEnemyPhaseAndAdvance(state, (e) => events.push(e));

    expect(state.units.find((u) => u.id === 'p0')?.hp).toBe(7);
    expect(events.some((e) => e.type === 'CombatResolved')).toBe(true);
  });

  test('player death sets status to lost and stops further processing', () => {
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 1, r: 0 });
    player.hp = 1;
    const state = makeState([enemy, player]);
    const events: DomainEvent[] = [];

    runEnemyPhaseAndAdvance(state, (e) => events.push(e));

    expect(state.status).toBe('lost');
    expect(events.some((e) => e.type === 'GameLost')).toBe(true);
    expect(events.some((e) => e.type === 'TurnAdvanced')).toBe(false);
  });

  test('turnState is rebuilt for current player-side units', () => {
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 3, r: 0 });
    const state = makeState([enemy, player]);

    runEnemyPhaseAndAdvance(state, () => undefined);

    expect(state.turnState.movementLeft['p0']).toBe(player.movement);
    expect(state.turnState.hasActed['p0']).toBe(false);
  });

  test('enemies process in id order and earlier enemy blocks later one', () => {
    const map = createEmptyMap(4);
    const player = createPlayer('p0', { q: 3, r: 0 });
    const enemyA = createEnemy('e0', { q: 0, r: 0 });
    const enemyB = createEnemy('e1', { q: 2, r: 0 });
    const state = makeState([enemyA, enemyB, player]);
    state.map = map;

    runEnemyPhaseAndAdvance(state, () => undefined);

    // e0 moves to (1,0), blocking e1's preferred step.
    expect(state.units.find((u) => u.id === 'e0')?.coord).toEqual({ q: 1, r: 0 });
    expect(state.units.find((u) => u.id === 'e1')?.coord).not.toEqual({ q: 1, r: 0 });
  });

  test('reveals fog after advancing turn', () => {
    const player = createPlayer('p0', { q: 0, r: 0 });
    const state = makeState([player]);
    const events: DomainEvent[] = [];

    runEnemyPhaseAndAdvance(state, (e) => events.push(e));

    expect(events.some((e) => e.type === 'FogRevealed')).toBe(true);
    expect(state.map.tiles['0,0']?.visibility).toBe('visible');
  });
});
