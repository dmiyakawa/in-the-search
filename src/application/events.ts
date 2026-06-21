import type { CoordKey, Hex } from '../domain/hex';
import type { RobotKind, UnitId } from '../domain/units';
import type { Phase } from './state';

export type DomainEvent =
  | { type: 'UnitMoved'; unitId: UnitId; from: Hex; to: Hex }
  | { type: 'FogRevealed'; nowVisible: CoordKey[] }
  | {
      type: 'CombatResolved';
      attackerId: UnitId;
      targetId: string;
      damage: number;
      targetHpAfter: number;
      targetDestroyed: boolean;
    }
  | { type: 'ResourceGathered'; unitId: UnitId; amount: number; inventoryAfter: number }
  | { type: 'RobotBuilt'; robotId: UnitId; robotKind: RobotKind; coord: Hex }
  | { type: 'PhaseChanged'; phase: Phase }
  | { type: 'TurnAdvanced'; turn: number }
  | { type: 'GameWon' }
  | { type: 'GameLost' };
