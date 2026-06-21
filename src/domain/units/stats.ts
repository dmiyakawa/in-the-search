export const UNIT_STATS = {
  player: { hp: 10, vision: 2, movement: 2, attack: 2 },
  enemy: { hp: 4, vision: 3, movement: 1, attack: 3 },
  scout: { hp: 3, vision: 4, movement: 3, attack: 1 },
} as const;

export const GATHER_AMOUNT = 5;
export const SCOUT_COST = 10;
export const NEST_HP = 8;
export const POD_HP = 20;
export const POD_DEFENSE = 0;

// Map generation constants are placed here to keep numeric constants centralized.
export const MAP_RADIUS = 7;
export const BLOCKED_RATE = 0.18;
export const ENEMY_COUNT = 5;
export const NEST_COUNT = 2;
export const RESOURCE_NODE_COUNT = 6;
export const MIN_POD_GOAL_DISTANCE = 6;
export const MAP_GEN_MAX_RETRY = 20;
