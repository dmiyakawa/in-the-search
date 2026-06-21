import { updateVisibility } from '../../domain/rules/fog';
import { evaluateStatus } from '../../domain/rules/victory';
import { resolveAttack } from '../../domain/rules/combat';
import { isPlayerSide, type Unit } from '../../domain/units';
import type { DomainEvent } from '../events';
import type { GameState } from '../state';
import { compareRank, idRank } from '../util';
import { decideEnemyAction } from './enemyAi';

const unitById = (state: GameState, id: string): Unit | undefined =>
  state.units.find((u) => u.id === id);

const removeUnit = (units: Unit[], id: string): Unit[] => units.filter((u) => u.id !== id);

export type EnemyPhasePrediction = {
  actions: EnemyPhaseActionPrediction[];
  damage: {
    player: number;
    pod: number;
    robots: Record<string, number>;
  };
  statusAfter: GameState['status'];
  turnAfter: number;
  phaseAfter: GameState['phase'];
};

export type EnemyPhaseActionPrediction =
  | { enemyId: string; kind: 'move'; from: Unit['coord']; to: Unit['coord'] }
  | {
      enemyId: string;
      kind: 'attack';
      targetId: string;
      damage: number;
      targetHpAfter: number;
      targetDestroyed: boolean;
    }
  | { enemyId: string; kind: 'wait' };

const sameCoord = (a: { q: number; r: number }, b: { q: number; r: number }): boolean =>
  a.q === b.q && a.r === b.r;

const resolveEnemyTarget = (
  state: GameState,
  targetId: string
): { id: string; hp: number; apply: (hp: number) => void } | undefined => {
  if (targetId === 'pod') {
    return {
      id: state.pod.id,
      hp: state.pod.hp,
      apply: (hp) => {
        state.pod.hp = hp;
      },
    };
  }

  const target = unitById(state, targetId);
  if (!target) return undefined;

  if (target.kind === 'player' && sameCoord(target.coord, state.pod.coord) && state.pod.hp > 0) {
    return {
      id: state.pod.id,
      hp: state.pod.hp,
      apply: (hp) => {
        state.pod.hp = hp;
      },
    };
  }

  return {
    id: target.id,
    hp: target.hp,
    apply: (hp) => {
      target.hp = hp;
    },
  };
};

const addDamage = (
  prediction: EnemyPhasePrediction,
  state: GameState,
  targetId: string,
  damage: number
): void => {
  if (targetId === state.pod.id) {
    prediction.damage.pod += damage;
    return;
  }
  const target = unitById(state, targetId);
  if (target?.kind === 'player') prediction.damage.player += damage;
  else if (target?.kind === 'robot')
    prediction.damage.robots[target.id] = (prediction.damage.robots[target.id] ?? 0) + damage;
};

const processEnemyPhase = (
  state: GameState,
  emit?: (e: DomainEvent) => void
): EnemyPhasePrediction => {
  const prediction: EnemyPhasePrediction = {
    actions: [],
    damage: { player: 0, pod: 0, robots: {} },
    statusAfter: state.status,
    turnAfter: state.turn,
    phaseAfter: state.phase,
  };

  state.phase = 'enemy';
  emit?.({ type: 'PhaseChanged', phase: 'enemy' });

  const enemyIds = state.units
    .filter((u) => u.kind === 'enemy')
    .map((u) => u.id)
    .sort((a, b) => compareRank(idRank(a), idRank(b)));

  for (const id of enemyIds) {
    const enemy = unitById(state, id);
    if (!enemy || enemy.hp <= 0) continue;

    const action = decideEnemyAction(state, enemy);
    if (action.kind === 'move') {
      const from = enemy.coord;
      enemy.coord = action.to;
      prediction.actions.push({ enemyId: enemy.id, kind: 'move', from, to: action.to });
      emit?.({ type: 'UnitMoved', unitId: enemy.id, from, to: action.to });
    } else if (action.kind === 'attack') {
      const target = resolveEnemyTarget(state, action.targetId);
      if (!target) {
        prediction.actions.push({ enemyId: enemy.id, kind: 'wait' });
        continue;
      }
      const result = resolveAttack(enemy, target.hp);
      target.apply(result.targetHpAfter);
      addDamage(prediction, state, target.id, result.damage);
      prediction.actions.push({
        enemyId: enemy.id,
        kind: 'attack',
        targetId: target.id,
        damage: result.damage,
        targetHpAfter: result.targetHpAfter,
        targetDestroyed: result.destroyed,
      });
      emit?.({
        type: 'CombatResolved',
        attackerId: enemy.id,
        targetId: target.id,
        damage: result.damage,
        targetHpAfter: result.targetHpAfter,
        targetDestroyed: result.destroyed,
      });
      if (result.destroyed && target.id !== state.pod.id) {
        state.units = removeUnit(state.units, target.id);
      }
    } else {
      prediction.actions.push({ enemyId: enemy.id, kind: 'wait' });
    }
  }

  const status = evaluateStatus({
    goalReached: state.status === 'won',
    playerAlive: state.units.some((u) => u.kind === 'player' && u.hp > 0),
    podAlive: state.pod.hp > 0,
  });
  if (status === 'lost') {
    state.status = 'lost';
    prediction.statusAfter = state.status;
    prediction.turnAfter = state.turn;
    prediction.phaseAfter = state.phase;
    emit?.({ type: 'GameLost' });
    return prediction;
  }

  state.turn++;
  state.turnState = { movementLeft: {}, hasActed: {} };
  for (const u of state.units.filter(isPlayerSide)) {
    state.turnState.movementLeft[u.id] = u.movement;
    state.turnState.hasActed[u.id] = false;
  }

  const playerSideUnits = state.units.filter(isPlayerSide);
  const { map, nowVisible } = updateVisibility(state.map, playerSideUnits);
  state.map = map;
  if (nowVisible.length > 0) {
    emit?.({ type: 'FogRevealed', nowVisible });
  }

  state.phase = 'player';
  emit?.({ type: 'PhaseChanged', phase: 'player' });
  emit?.({ type: 'TurnAdvanced', turn: state.turn });
  prediction.statusAfter = state.status;
  prediction.turnAfter = state.turn;
  prediction.phaseAfter = state.phase;
  return prediction;
};

export const simulateEnemyPhase = (state: GameState): EnemyPhasePrediction => {
  const clone = structuredClone(state);
  return processEnemyPhase(clone);
};

export const runEnemyPhaseAndAdvance = (
  state: GameState,
  emit: (e: DomainEvent) => void
): EnemyPhasePrediction => {
  return processEnemyPhase(state, emit);
};
