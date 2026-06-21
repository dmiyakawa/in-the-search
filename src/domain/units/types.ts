import type { Hex } from '../hex';

export type UnitId = string;
export type UnitKind = 'player' | 'robot' | 'enemy';
export type RobotKind = 'scout';

export type Unit = {
  id: UnitId;
  kind: UnitKind;
  coord: Hex;
  hp: number;
  maxHp: number;
  vision: number;
  movement: number;
  attack: number;
  robotKind?: RobotKind;
};

export type Nest = {
  id: string;
  coord: Hex;
  hp: number;
  maxHp: number;
};
