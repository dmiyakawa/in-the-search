import { describe, expect, test } from 'vitest';
import { GameService } from '../../src/application/GameService';
import type { DomainEvent } from '../../src/application/events';
import type { GameState } from '../../src/application/state';
import { createEmptyMap, setTile } from '../../src/domain/map';
import { updateVisibility } from '../../src/domain/rules/fog';
import { createEnemy, createPlayer, POD_DEFENSE, POD_HP } from '../../src/domain/units';

const makeBaseState = (): GameState => {
  const player = createPlayer('player', { q: 0, r: 0 });
  const { map } = updateVisibility(createEmptyMap(3), [player]);
  return {
    map,
    units: [player],
    pod: {
      id: 'pod',
      coord: player.coord,
      hp: POD_HP,
      maxHp: POD_HP,
      defense: POD_DEFENSE,
    },
    nests: [],
    inventory: { resource: 0 },
    turn: 1,
    phase: 'player',
    status: 'playing',
    turnState: {
      movementLeft: { player: player.movement },
      hasActed: { player: false },
    },
    rngState: 0,
  };
};

describe('playthrough integration', () => {
  test('wins by moving a player-side unit onto the goal', () => {
    const state = makeBaseState();
    const goalTile = state.map.tiles['2,0']!;
    state.map = setTile(state.map, { ...goalTile, feature: 'goal' });
    const service = new GameService(state);
    const events: DomainEvent[] = [];
    service.subscribe((event) => events.push(event));

    expect(service.dispatch({ type: 'MoveUnit', unitId: 'player', to: { q: 1, r: 0 } })).toEqual({
      ok: true,
    });
    expect(service.dispatch({ type: 'MoveUnit', unitId: 'player', to: { q: 2, r: 0 } })).toEqual({
      ok: true,
    });

    expect(service.getState().status).toBe('won');
    expect(events.map((event) => event.type)).toContain('GameWon');
  });

  test('loses when the player body is killed during enemy phase', () => {
    const player = createPlayer('player', { q: 1, r: 0 });
    player.hp = 1;
    const enemy = createEnemy('e0', { q: 0, r: 0 });
    const { map } = updateVisibility(createEmptyMap(3), [player]);
    const state = makeBaseState();
    state.map = map;
    state.units = [player, enemy];
    state.pod.coord = { q: -3, r: 0 };
    state.turnState = { movementLeft: { player: player.movement }, hasActed: { player: false } };
    const service = new GameService(state);
    const events: DomainEvent[] = [];
    service.subscribe((event) => events.push(event));

    expect(service.dispatch({ type: 'EndTurn' })).toEqual({ ok: true });

    expect(service.getState().status).toBe('lost');
    expect(events.map((event) => event.type)).toContain('CombatResolved');
    expect(events.map((event) => event.type)).toContain('GameLost');
  });
});
