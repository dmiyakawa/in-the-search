import type { Hex } from '../hex';
import { NEST_HP, UNIT_STATS } from './stats';
import type { Nest, Unit } from './types';

export * from './types';
export * from './stats';

export const createPlayer = (id: string, coord: Hex): Unit => {
  const s = UNIT_STATS.player;
  return {
    id,
    kind: 'player',
    coord,
    hp: s.hp,
    maxHp: s.hp,
    vision: s.vision,
    movement: s.movement,
    attack: s.attack,
  };
};

export const createEnemy = (id: string, coord: Hex): Unit => {
  const s = UNIT_STATS.enemy;
  return {
    id,
    kind: 'enemy',
    coord,
    hp: s.hp,
    maxHp: s.hp,
    vision: s.vision,
    movement: s.movement,
    attack: s.attack,
  };
};

export const createScout = (id: string, coord: Hex): Unit => {
  const s = UNIT_STATS.scout;
  return {
    id,
    kind: 'robot',
    coord,
    hp: s.hp,
    maxHp: s.hp,
    vision: s.vision,
    movement: s.movement,
    attack: s.attack,
    robotKind: 'scout',
  };
};

export const createNest = (id: string, coord: Hex): Nest => ({
  id,
  coord,
  hp: NEST_HP,
  maxHp: NEST_HP,
});

export const isPlayerSide = (u: Unit): boolean => u.kind === 'player' || u.kind === 'robot';
