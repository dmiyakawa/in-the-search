import { describe, expect, test } from 'vitest';
import { runEnemyPhaseAndAdvance, simulateEnemyPhase } from '../../src/application/turn/turnEngine';
import type { GameState } from '../../src/application/state';
import type { DomainEvent } from '../../src/application/events';
import { createEmptyMap } from '../../src/domain/map';
import { createEnemy, createPlayer, POD_DEFENSE, POD_HP } from '../../src/domain/units';

const makeState = (units: GameState['units']): GameState => ({
  map: createEmptyMap(3),
  units,
  pod: { id: 'pod', coord: { q: -99, r: 0 }, hp: POD_HP, maxHp: POD_HP, defense: POD_DEFENSE },
  nests: [],
  inventory: { resource: 0 },
  turn: 1,
  phase: 'player',
  status: 'playing',
  turnState: { movementLeft: {}, hasActed: {} },
  rngState: 0,
});

describe('runEnemyPhaseAndAdvance', () => {
  test('simulateEnemyPhase is pure and matches applied enemy phase prediction', () => {
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const player = createPlayer('p0', { q: 3, r: 0 });
    const state = makeState([enemy, player]);
    const before = structuredClone(state);

    const prediction = simulateEnemyPhase(state);
    expect(state).toEqual(before);

    const events: DomainEvent[] = [];
    const appliedPrediction = runEnemyPhaseAndAdvance(state, (e) => events.push(e));

    expect(state.units.find((u) => u.id === 'e0')?.coord).toEqual({ q: 1, r: 0 });
    expect(prediction).toEqual(appliedPrediction);
  });

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

  test('enemy damages pod instead of player when player overlaps pod', () => {
    const enemy = createEnemy('e0', { q: 1, r: 0 });
    const player = createPlayer('p0', { q: 0, r: 0 });
    const state = makeState([enemy, player]);
    state.pod.coord = player.coord;
    const events: DomainEvent[] = [];

    runEnemyPhaseAndAdvance(state, (e) => events.push(e));

    expect(state.pod.hp).toBe(POD_HP - enemy.attack);
    expect(state.units.find((u) => u.id === 'p0')?.hp).toBe(player.maxHp);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'CombatResolved', targetId: 'pod' })
    );
  });

  test('destroyed pod sets status to lost', () => {
    const enemy = createEnemy('e0', { q: 1, r: 0 });
    const player = createPlayer('p0', { q: 0, r: 0 });
    const state = makeState([enemy, player]);
    state.pod.coord = player.coord;
    state.pod.hp = 1;
    const events: DomainEvent[] = [];

    runEnemyPhaseAndAdvance(state, (e) => events.push(e));

    expect(state.status).toBe('lost');
    expect(state.pod.hp).toBe(0);
    expect(events.some((e) => e.type === 'GameLost')).toBe(true);
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

  test('enemy id order uses numeric suffix order for two digit ids', () => {
    const map = createEmptyMap(4);
    const player = createPlayer('p0', { q: 3, r: 0 });
    const enemy10 = createEnemy('e10', { q: 0, r: 0 });
    const enemy2 = createEnemy('e2', { q: 2, r: 0 });
    const state = makeState([enemy10, enemy2, player]);
    state.map = map;
    const events: DomainEvent[] = [];

    runEnemyPhaseAndAdvance(state, (event) => events.push(event));

    expect(events.filter((event) => event.type === 'CombatResolved')[0]).toMatchObject({
      attackerId: 'e2',
    });
    expect(state.units.find((u) => u.id === 'e10')?.coord).toEqual({ q: 1, r: 0 });
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
