import { updateVisibility } from '../../domain/rules/fog';
import { resolveAttack } from '../../domain/rules/combat';
import { isPlayerSide, type Unit } from '../../domain/units';
import type { DomainEvent } from '../events';
import type { GameState } from '../state';
import { decideEnemyAction } from './enemyAi';

const unitById = (state: GameState, id: string): Unit | undefined =>
  state.units.find((u) => u.id === id);

const removeUnit = (units: Unit[], id: string): Unit[] => units.filter((u) => u.id !== id);

export const runEnemyPhaseAndAdvance = (state: GameState, emit: (e: DomainEvent) => void): void => {
  state.phase = 'enemy';
  emit({ type: 'PhaseChanged', phase: 'enemy' });

  const enemyIds = state.units
    .filter((u) => u.kind === 'enemy')
    .map((u) => u.id)
    .sort();

  for (const id of enemyIds) {
    const enemy = unitById(state, id);
    if (!enemy || enemy.hp <= 0) continue;

    const action = decideEnemyAction(state, enemy);
    if (action.kind === 'move') {
      const from = enemy.coord;
      enemy.coord = action.to;
      emit({ type: 'UnitMoved', unitId: enemy.id, from, to: action.to });
    } else if (action.kind === 'attack') {
      const target = unitById(state, action.targetId);
      if (!target) continue;
      const result = resolveAttack(enemy, target.hp);
      target.hp = result.targetHpAfter;
      emit({
        type: 'CombatResolved',
        attackerId: enemy.id,
        targetId: target.id,
        damage: result.damage,
        targetHpAfter: result.targetHpAfter,
        targetDestroyed: result.destroyed,
      });
      if (result.destroyed) {
        state.units = removeUnit(state.units, target.id);
      }
    }
  }

  if (!state.units.some((u) => u.kind === 'player' && u.hp > 0)) {
    state.status = 'lost';
    emit({ type: 'GameLost' });
    return;
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
    emit({ type: 'FogRevealed', nowVisible });
  }

  state.phase = 'player';
  emit({ type: 'PhaseChanged', phase: 'player' });
  emit({ type: 'TurnAdvanced', turn: state.turn });
};
