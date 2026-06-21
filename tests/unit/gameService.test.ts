import { describe, expect, test } from 'vitest';
import { GameService } from '../../src/application/GameService';
import type { DomainEvent } from '../../src/application/events';
import type { GameState } from '../../src/application/state';
import { createEmptyMap, getTile, setTile } from '../../src/domain/map';
import { updateVisibility } from '../../src/domain/rules/fog';
import {
  createEnemy,
  createPlayer,
  createScout,
  MAP_RADIUS,
  POD_DEFENSE,
  POD_HP,
} from '../../src/domain/units';

const makeState = (units: GameState['units'], mapRadius = 3): GameState => {
  const player = units.find((u) => u.kind === 'player');
  const map = createEmptyMap(mapRadius);
  const { map: visibleMap } = updateVisibilityIfPlayer(map, units);
  return {
    map: visibleMap,
    units,
    pod: { id: 'pod', coord: { q: -99, r: 0 }, hp: POD_HP, maxHp: POD_HP, defense: POD_DEFENSE },
    nests: [],
    inventory: { resource: 0 },
    turn: 1,
    phase: 'player',
    status: 'playing',
    turnState: {
      movementLeft: player ? { [player.id]: player.movement } : {},
      hasActed: player ? { [player.id]: false } : {},
    },
    rngState: 0,
  };
};

const updateVisibilityIfPlayer = (map: GameState['map'], units: GameState['units']) => {
  const playerSide = units.filter((u) => u.kind === 'player' || u.kind === 'robot');
  return updateVisibility(map, playerSide);
};

describe('GameService', () => {
  test('newGame creates playable state', () => {
    const state = GameService.newGame(123);
    expect(state.status).toBe('playing');
    expect(state.phase).toBe('player');
    expect(state.units.some((u) => u.kind === 'player')).toBe(true);
    expect(state.pod).toMatchObject({
      id: 'pod',
      coord: { q: 0, r: 0 },
      hp: POD_HP,
      maxHp: POD_HP,
      defense: POD_DEFENSE,
    });
    expect(state.map.radius).toBe(MAP_RADIUS);
    expect(state.units.filter((u) => u.kind === 'enemy').length).toBeGreaterThan(0);
    expect(Object.values(state.map.tiles).some((tile) => tile.feature === 'goal')).toBe(true);
  });

  test('getState returns immutable snapshot', () => {
    const service = new GameService(GameService.newGame(123));
    const snapshot = service.getState();
    (snapshot as GameState).turn = 99;
    expect(service.getState().turn).toBe(1);
  });

  test('subscribe and unsubscribe', () => {
    const service = new GameService(GameService.newGame(123));
    const events: DomainEvent[] = [];
    const unsubscribe = service.subscribe((e) => events.push(e));
    service.dispatch({ type: 'EndTurn' });
    expect(events.length).toBeGreaterThan(0);
    const countAfterFirst = events.length;
    unsubscribe();
    service.dispatch({ type: 'EndTurn' });
    expect(events.length).toBe(countAfterFirst);
  });

  test('MoveUnit rejects non-player phase', () => {
    const state = GameService.newGame(123);
    state.phase = 'enemy';
    const service = new GameService(state);
    const result = service.dispatch({ type: 'MoveUnit', unitId: 'player', to: { q: 1, r: 0 } });
    expect(result).toEqual({ ok: false, reason: 'not-player-phase' });
  });

  test('MoveUnit rejects unknown unit', () => {
    const service = new GameService(GameService.newGame(123));
    const result = service.dispatch({ type: 'MoveUnit', unitId: 'unknown', to: { q: 1, r: 0 } });
    expect(result).toEqual({ ok: false, reason: 'unit-not-found' });
  });

  test('MoveUnit rejects enemy unit', () => {
    const state = makeState([
      createPlayer('player', { q: 0, r: 0 }),
      createEnemy('e0', { q: 2, r: 0 }),
    ]);
    const service = new GameService(state);
    const result = service.dispatch({ type: 'MoveUnit', unitId: 'e0', to: { q: 1, r: 0 } });
    expect(result).toEqual({ ok: false, reason: 'not-own-unit' });
  });

  test('MoveUnit rejects already acted unit', () => {
    const state = makeState([createPlayer('player', { q: 0, r: 0 })]);
    state.turnState.hasActed['player'] = true;
    const service = new GameService(state);
    const result = service.dispatch({ type: 'MoveUnit', unitId: 'player', to: { q: 1, r: 0 } });
    expect(result).toEqual({ ok: false, reason: 'already-acted' });
  });

  test('MoveUnit rejects no movement left', () => {
    const state = makeState([createPlayer('player', { q: 0, r: 0 })]);
    state.turnState.movementLeft['player'] = 0;
    const service = new GameService(state);
    const result = service.dispatch({ type: 'MoveUnit', unitId: 'player', to: { q: 1, r: 0 } });
    expect(result).toEqual({ ok: false, reason: 'no-movement-left' });
  });

  test('MoveUnit rejects blocked terrain', () => {
    const state = makeState([createPlayer('player', { q: 0, r: 0 })]);
    const blockedCoord = { q: 1, r: 0 };
    const tile = state.map.tiles[`${blockedCoord.q},${blockedCoord.r}`]!;
    state.map = setTile(state.map, { ...tile, terrain: 'blocked' });
    const service = new GameService(state);
    const result = service.dispatch({ type: 'MoveUnit', unitId: 'player', to: blockedCoord });
    expect(result).toEqual({ ok: false, reason: 'blocked-terrain' });
  });

  test('MoveUnit moves and emits events', () => {
    const service = new GameService(makeState([createPlayer('player', { q: 0, r: 0 })]));
    const events: DomainEvent[] = [];
    service.subscribe((e) => events.push(e));
    const result = service.dispatch({ type: 'MoveUnit', unitId: 'player', to: { q: 1, r: 0 } });
    expect(result).toEqual({ ok: true });
    expect(service.getState().units.find((u) => u.id === 'player')?.coord).toEqual({ q: 1, r: 0 });
    expect(events.some((e) => e.type === 'UnitMoved')).toBe(true);
  });

  test('undo restores previous player-phase movement state', () => {
    const service = new GameService(makeState([createPlayer('player', { q: 0, r: 0 })]));

    service.dispatch({ type: 'MoveUnit', unitId: 'player', to: { q: 1, r: 0 } });
    const moved = service.getState();
    expect(moved.units.find((u) => u.id === 'player')?.coord).toEqual({ q: 1, r: 0 });
    expect(moved.turnState.movementLeft.player).toBe(1);

    expect(service.undo()).toBe(true);
    const restored = service.getState();
    expect(restored.units.find((u) => u.id === 'player')?.coord).toEqual({ q: 0, r: 0 });
    expect(restored.turnState.movementLeft.player).toBe(2);
  });

  test('undo stack is cleared by EndTurn', () => {
    const player = createPlayer('player', { q: 0, r: 0 });
    const state = makeState([player]);
    const service = new GameService(state);

    service.dispatch({ type: 'MoveUnit', unitId: 'player', to: { q: 1, r: 0 } });
    service.dispatch({ type: 'EndTurn' });

    expect(service.undo()).toBe(false);
  });

  test('previewEnemyPhase is deterministic and does not mutate state', () => {
    const player = createPlayer('player', { q: 3, r: 0 });
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const state = makeState([enemy, player]);
    const service = new GameService(state);
    const before = service.getState();

    const first = service.previewEnemyPhase();
    const second = service.previewEnemyPhase();

    expect(first).toEqual(second);
    expect(service.getState()).toEqual(before);
  });

  test('MoveUnit to goal triggers immediate win', () => {
    const state = makeState([createPlayer('player', { q: 0, r: 0 })]);
    const goalCoord = { q: 1, r: 0 };
    const goalTile = getTile(state.map, goalCoord)!;
    state.map = setTile(state.map, { ...goalTile, feature: 'goal' });
    const service = new GameService(state);
    const events: DomainEvent[] = [];
    service.subscribe((e) => events.push(e));
    const result = service.dispatch({ type: 'MoveUnit', unitId: 'player', to: goalCoord });
    expect(result).toEqual({ ok: true });
    expect(service.getState().status).toBe('won');
    expect(events.some((e) => e.type === 'GameWon')).toBe(true);
  });

  test('AttackUnit kills adjacent enemy', () => {
    const player = createPlayer('player', { q: 0, r: 0 });
    const enemy = createEnemy('e0', { q: 1, r: 0 });
    const state = makeState([player, enemy]);
    const service = new GameService(state);
    const events: DomainEvent[] = [];
    service.subscribe((e) => events.push(e));

    service.dispatch({ type: 'AttackUnit', attackerId: 'player', targetId: 'e0' });

    expect(service.getState().units.find((u) => u.id === 'e0')?.hp).toBe(2);
    expect(events.some((e) => e.type === 'CombatResolved')).toBe(true);
    expect(service.getState().turnState.hasActed['player']).toBe(true);
  });

  test('AttackUnit rejects non-adjacent target', () => {
    const player = createPlayer('player', { q: 0, r: 0 });
    const enemy = createEnemy('e0', { q: 2, r: 0 });
    const state = makeState([player, enemy]);
    const service = new GameService(state);
    const result = service.dispatch({ type: 'AttackUnit', attackerId: 'player', targetId: 'e0' });
    expect(result).toEqual({ ok: false, reason: 'target-not-adjacent' });
  });

  test('AttackUnit rejects player-side target', () => {
    const player = createPlayer('player', { q: 0, r: 0 });
    const scout = createScout('r0', { q: 1, r: 0 });
    const state = makeState([player, scout]);
    state.turnState.movementLeft['r0'] = scout.movement;
    state.turnState.hasActed['r0'] = false;
    const service = new GameService(state);

    const result = service.dispatch({ type: 'AttackUnit', attackerId: 'player', targetId: 'r0' });

    expect(result).toEqual({ ok: false, reason: 'target-not-enemy' });
    expect(service.getState().units.find((u) => u.id === 'r0')?.hp).toBe(scout.maxHp);
  });

  test('EndTurn runs enemy phase', () => {
    const player = createPlayer('player', { q: 0, r: 0 });
    const enemy = createEnemy('e0', { q: 2, r: 0 });
    const state = makeState([player, enemy]);
    const service = new GameService(state);
    const events: DomainEvent[] = [];
    service.subscribe((e) => events.push(e));

    service.dispatch({ type: 'EndTurn' });

    expect(service.getState().turn).toBe(2);
    expect(service.getState().phase).toBe('player');
    expect(events.some((e) => e.type === 'PhaseChanged')).toBe(true);
    expect(events.some((e) => e.type === 'TurnAdvanced')).toBe(true);
  });

  test('dispatch rejects commands after game over', () => {
    const state = GameService.newGame(123);
    state.status = 'won';
    const service = new GameService(state);
    const result = service.dispatch({ type: 'MoveUnit', unitId: 'player', to: { q: 1, r: 0 } });
    expect(result).toEqual({ ok: false, reason: 'game-over' });
  });
});
