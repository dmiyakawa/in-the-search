import { describe, expect, test } from 'vitest';
import { GameService } from '../../src/application/GameService';
import type { GameState } from '../../src/application/state';
import { createEmptyMap, getTile, setTile } from '../../src/domain/map';
import { updateVisibility } from '../../src/domain/rules/fog';
import {
  createPlayer,
  GATHER_AMOUNT,
  POD_DEFENSE,
  POD_HP,
  SCOUT_COST,
} from '../../src/domain/units';

const makePhase5State = (): GameState => {
  const player = createPlayer('player', { q: 0, r: 0 });
  let map = createEmptyMap(5);
  const resourceTile = getTile(map, player.coord)!;
  map = setTile(map, { ...resourceTile, resourceAmount: SCOUT_COST });
  const { map: visibleMap } = updateVisibility(map, [player]);

  return {
    map: visibleMap,
    units: [player],
    pod: {
      id: 'pod',
      coord: player.coord,
      hp: POD_HP,
      maxHp: POD_HP,
      defense: POD_DEFENSE,
    },
    nests: [],
    inventory: { resource: SCOUT_COST - GATHER_AMOUNT },
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

describe('Phase 5 resource and robot flow', () => {
  test('gather, build scout, advance turn, then move scout to reveal farther fog', () => {
    const service = new GameService(makePhase5State());

    expect(service.dispatch({ type: 'GatherResource', unitId: 'player' })).toEqual({ ok: true });
    expect(service.getState().inventory.resource).toBe(SCOUT_COST);
    expect(service.undo()).toBe(true);
    expect(service.getState().inventory.resource).toBe(SCOUT_COST - GATHER_AMOUNT);

    expect(service.dispatch({ type: 'GatherResource', unitId: 'player' })).toEqual({ ok: true });
    service.dispatch({ type: 'EndTurn' });
    expect(service.dispatch({ type: 'BuildRobot', robotKind: 'scout' })).toEqual({ ok: true });

    const built = service.getState();
    const scout = built.units.find((u) => u.kind === 'robot');
    expect(scout).toBeDefined();
    expect(scout?.movement).toBe(3);
    expect(scout?.vision).toBe(4);
    expect(built.turnState.movementLeft[scout!.id]).toBe(0);

    service.dispatch({ type: 'EndTurn' });
    const beforeMove = service.getState();
    expect(beforeMove.turnState.movementLeft[scout!.id]).toBe(3);

    const farTile = getTile(beforeMove.map, { q: 5, r: -5 });
    expect(farTile?.visibility).not.toBe('visible');

    expect(service.dispatch({ type: 'MoveUnit', unitId: scout!.id, to: { q: 2, r: -1 } })).toEqual({
      ok: true,
    });

    const afterMove = service.getState();
    expect(afterMove.units.find((u) => u.id === scout!.id)?.coord).toEqual({ q: 2, r: -1 });
    expect(getTile(afterMove.map, { q: 5, r: -5 })?.visibility).toBe('visible');
  });
});
