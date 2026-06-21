import type { GameMap } from '../domain/map';
import type { GameStatus } from '../domain/rules/victory';
import type { Nest, Unit, UnitId } from '../domain/units';

export type Phase = 'player' | 'enemy';

export type GameState = {
  map: GameMap;
  units: Unit[];
  nests: Nest[];
  inventory: { resource: number };
  turn: number;
  phase: Phase;
  status: GameStatus;
  turnState: {
    movementLeft: Record<UnitId, number>;
    hasActed: Record<UnitId, boolean>;
  };
  rngState: number;
};
