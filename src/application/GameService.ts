import type { Hex } from '../domain/hex';
import { getTile } from '../domain/map';
import { checkMove } from '../domain/rules/movement';
import { resolveAttack } from '../domain/rules/combat';
import { updateVisibility } from '../domain/rules/fog';
import { distance } from '../domain/hex';
import { createPlayer, isPlayerSide, POD_DEFENSE, POD_HP } from '../domain/units';
import { generateMapWithRngState } from '../infrastructure/mapgen/MapGenerator';
import type { Command, CommandResult } from './commands';
import type { DomainEvent } from './events';
import type { GameState } from './state';
import {
  runEnemyPhaseAndAdvance,
  simulateEnemyPhase,
  type EnemyPhasePrediction,
} from './turn/turnEngine';
import { occupantAt } from './util';

export type Unsubscribe = () => void;

export class GameService {
  private state: GameState;
  private undoStack: GameState[] = [];
  private listeners: Set<(e: DomainEvent) => void> = new Set();

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  static newGame(seed: number): GameState {
    const generated = generateMapWithRngState(seed);
    const player = createPlayer('player', generated.podCoord);
    const { map: visibleMap } = updateVisibility(generated.map, [player]);

    return {
      map: visibleMap,
      units: [player, ...generated.enemies],
      pod: {
        id: 'pod',
        coord: generated.podCoord,
        hp: POD_HP,
        maxHp: POD_HP,
        defense: POD_DEFENSE,
      },
      nests: generated.nests,
      inventory: { resource: 0 },
      turn: 1,
      phase: 'player',
      status: 'playing',
      turnState: {
        movementLeft: { [player.id]: player.movement },
        hasActed: { [player.id]: false },
      },
      rngState: generated.rngState,
    };
  }

  getState(): Readonly<GameState> {
    return structuredClone(this.state);
  }

  undo(): boolean {
    const previous = this.undoStack.pop();
    if (!previous) return false;
    this.state = previous;
    return true;
  }

  previewEnemyPhase(): EnemyPhasePrediction {
    return simulateEnemyPhase(this.state);
  }

  subscribe(listener: (e: DomainEvent) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: DomainEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  dispatch(cmd: Command): CommandResult {
    const state = this.state;

    if (state.status !== 'playing') {
      return { ok: false, reason: 'game-over' };
    }

    switch (cmd.type) {
      case 'MoveUnit':
        return this.handleMoveUnit(cmd.unitId, cmd.to);
      case 'AttackUnit':
        return this.handleAttackUnit(cmd.attackerId, cmd.targetId);
      case 'EndTurn':
        return this.handleEndTurn();
      case 'GatherResource':
        // Reserved for Phase 5.
        return { ok: true };
      case 'BuildRobot':
        // Reserved for Phase 5.
        return { ok: true };
      default:
        return cmd;
    }
  }

  private handleMoveUnit(unitId: string, to: Hex): CommandResult {
    const state = this.state;
    if (state.phase !== 'player') return { ok: false, reason: 'not-player-phase' };

    const unit = state.units.find((u) => u.id === unitId);
    if (!unit) return { ok: false, reason: 'unit-not-found' };
    if (!isPlayerSide(unit)) return { ok: false, reason: 'not-own-unit' };
    if (state.turnState.hasActed[unitId]) return { ok: false, reason: 'already-acted' };
    const movementLeft = state.turnState.movementLeft[unitId];
    if (movementLeft === undefined || movementLeft <= 0)
      return { ok: false, reason: 'no-movement-left' };

    const rejection = checkMove(state.map, unit.coord, to, (h) => occupantAt(state.units, h));
    if (rejection) return { ok: false, reason: rejection };

    this.undoStack.push(structuredClone(state));
    const from = unit.coord;
    unit.coord = to;
    state.turnState.movementLeft[unitId] = movementLeft - 1;
    this.emit({ type: 'UnitMoved', unitId, from, to });

    const playerSideUnits = state.units.filter(isPlayerSide);
    const { map, nowVisible } = updateVisibility(state.map, playerSideUnits);
    state.map = map;
    if (nowVisible.length > 0) {
      this.emit({ type: 'FogRevealed', nowVisible });
    }

    const tile = getTile(state.map, to);
    if (tile?.feature === 'goal') {
      state.status = 'won';
      this.emit({ type: 'GameWon' });
    }

    return { ok: true };
  }

  private handleAttackUnit(attackerId: string, targetId: string): CommandResult {
    const state = this.state;
    if (state.phase !== 'player') return { ok: false, reason: 'not-player-phase' };

    const attacker = state.units.find((u) => u.id === attackerId);
    if (!attacker) return { ok: false, reason: 'unit-not-found' };
    if (!isPlayerSide(attacker)) return { ok: false, reason: 'not-own-unit' };
    if (state.turnState.hasActed[attackerId]) return { ok: false, reason: 'already-acted' };

    const unitTarget = state.units.find((u) => u.id === targetId);
    const nestTarget = state.nests.find((n) => n.id === targetId);
    if (!unitTarget && !nestTarget) return { ok: false, reason: 'target-not-enemy' };
    if (unitTarget && isPlayerSide(unitTarget)) return { ok: false, reason: 'target-not-enemy' };

    const targetCoord = unitTarget?.coord ?? nestTarget?.coord;
    if (!targetCoord) return { ok: false, reason: 'target-not-enemy' };
    if (distance(attacker.coord, targetCoord) !== 1)
      return { ok: false, reason: 'target-not-adjacent' };

    this.undoStack.push(structuredClone(state));
    const targetHp = unitTarget?.hp ?? nestTarget?.hp ?? 0;
    const result = resolveAttack(attacker, targetHp);
    state.turnState.hasActed[attackerId] = true;

    if (unitTarget) {
      unitTarget.hp = result.targetHpAfter;
      if (result.destroyed) state.units = state.units.filter((u) => u.id !== targetId);
    } else if (nestTarget) {
      nestTarget.hp = result.targetHpAfter;
      if (result.destroyed) state.nests = state.nests.filter((n) => n.id !== targetId);
    }

    this.emit({
      type: 'CombatResolved',
      attackerId: attacker.id,
      targetId,
      damage: result.damage,
      targetHpAfter: result.targetHpAfter,
      targetDestroyed: result.destroyed,
    });

    return { ok: true };
  }

  private handleEndTurn(): CommandResult {
    const state = this.state;
    if (state.phase !== 'player') return { ok: false, reason: 'not-player-phase' };
    this.undoStack = [];
    runEnemyPhaseAndAdvance(state, (e) => this.emit(e));
    return { ok: true };
  }
}
