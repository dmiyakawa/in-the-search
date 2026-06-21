import type { Hex } from '../domain/hex';
import type { RobotKind, UnitId } from '../domain/units';

export type Command =
  | { type: 'MoveUnit'; unitId: UnitId; to: Hex }
  | { type: 'AttackUnit'; attackerId: UnitId; targetId: UnitId }
  | { type: 'GatherResource'; unitId: UnitId }
  | { type: 'BuildRobot'; robotKind: RobotKind }
  | { type: 'EndTurn' };

export type RejectReason =
  | 'not-player-phase'
  | 'unit-not-found'
  | 'not-own-unit'
  | 'not-adjacent'
  | 'blocked-terrain'
  | 'occupied'
  | 'out-of-bounds'
  | 'no-movement-left'
  | 'already-acted'
  | 'no-resource-here'
  | 'not-on-pod'
  | 'insufficient-resource'
  | 'target-not-adjacent'
  | 'target-not-enemy'
  | 'game-over';

export type CommandResult = { ok: true } | { ok: false; reason: RejectReason };
