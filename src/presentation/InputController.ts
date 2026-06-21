import { add, distance, HEX_DIRECTIONS, pixelToHex, type Hex } from '../domain/hex';
import { getTile } from '../domain/map';
import { isPlayerSide } from '../domain/units';
import type { GameService } from '../application/GameService';
import type { AttackIndicator, View } from './CanvasRenderer';
import type { Selection } from './selection';

export type InputController = { destroy(): void };

const canvasPoint = (canvas: HTMLCanvasElement, event: MouseEvent): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};

const findVisibleTargetId = (service: GameService, target: Hex): string | undefined => {
  const state = service.getState();
  const tile = getTile(state.map, target);
  if (tile?.visibility !== 'visible') return undefined;

  const enemy = state.units.find(
    (u) => u.kind === 'enemy' && u.coord.q === target.q && u.coord.r === target.r
  );
  if (enemy) return enemy.id;

  return state.nests.find((n) => n.coord.q === target.q && n.coord.r === target.r)?.id;
};

const findVisibleEnemyId = (service: GameService, target: Hex): string | undefined => {
  const state = service.getState();
  const tile = getTile(state.map, target);
  if (tile?.visibility !== 'visible') return undefined;
  return state.units.find(
    (u) => u.kind === 'enemy' && u.coord.q === target.q && u.coord.r === target.r
  )?.id;
};

const findPlayerSideUnitId = (service: GameService, target: Hex): string | undefined => {
  const state = service.getState();
  return state.units.find(
    (u) => isPlayerSide(u) && u.coord.q === target.q && u.coord.r === target.r
  )?.id;
};

const currentPlayerSideUnitId = (
  service: GameService,
  selection: Selection
): string | undefined => {
  const state = service.getState();
  if (selection.kind === 'own' && state.units.some((u) => u.id === selection.id && isPlayerSide(u)))
    return selection.id;
  return state.units.find(isPlayerSide)?.id;
};

const createPlayerAttackIndicator = (
  state: ReturnType<GameService['getState']>,
  attackerId: string,
  targetId: string,
  to: Hex
): AttackIndicator | undefined => {
  const attacker = state.units.find((unit) => unit.id === attackerId && isPlayerSide(unit));
  const targetUnit = state.units.find((unit) => unit.id === targetId);
  const targetNest = state.nests.find((nest) => nest.id === targetId);
  const target = targetUnit ?? targetNest;
  if (!attacker || !target) return undefined;
  const targetHpAfter = Math.max(0, target.hp - attacker.attack);
  return {
    attackerId,
    targetId,
    targetKind: targetUnit?.kind === 'enemy' ? 'enemy' : targetNest ? 'nest' : undefined,
    targetMaxHp: target.maxHp,
    targetHpBefore: target.hp,
    targetHpAfter,
    targetDestroyed: targetHpAfter === 0,
    from: attacker.coord,
    to,
    damage: attacker.attack,
    side: 'player',
  };
};

const dispatchForTarget = (
  service: GameService,
  selectedUnitId: string,
  target: Hex,
  onPlayerAttack?: (indicator: AttackIndicator) => void
): boolean => {
  const state = service.getState();
  const unit = state.units.find((u) => u.id === selectedUnitId && isPlayerSide(u));
  if (!unit || state.status !== 'playing') return false;

  const targetId = findVisibleTargetId(service, target);
  if (targetId && distance(unit.coord, target) === 1) {
    const indicator = createPlayerAttackIndicator(state, unit.id, targetId, target);
    const result = service.dispatch({ type: 'AttackUnit', attackerId: unit.id, targetId });
    if (result.ok) {
      if (indicator) onPlayerAttack?.(indicator);
    }
    return result.ok;
  }

  const tile = getTile(state.map, target);
  if (tile?.terrain === 'passable' && distance(unit.coord, target) === 1) {
    return service.dispatch({ type: 'MoveUnit', unitId: unit.id, to: target }).ok;
  }
  return false;
};

export const createInputController = (
  canvas: HTMLCanvasElement,
  service: GameService,
  getView: () => View,
  onChanged?: () => void,
  getSelection: () => Selection = () => ({ kind: 'own', id: 'player' }),
  setSelection: (selection: Selection) => void = () => undefined,
  onPlayerAttack?: (indicator: AttackIndicator) => void,
  onUndo?: () => void
): InputController => {
  const onClick = (event: MouseEvent): void => {
    const point = canvasPoint(canvas, event);
    const view = getView();
    const target = pixelToHex(point.x, point.y, view.size, view.origin);
    const selectedOwnUnit = findPlayerSideUnitId(service, target);
    if (selectedOwnUnit) {
      setSelection({ kind: 'own', id: selectedOwnUnit });
      onChanged?.();
      return;
    }

    const selection = getSelection();
    const selectedUnitId =
      selection.kind === 'own' ? currentPlayerSideUnitId(service, selection) : undefined;
    if (selectedUnitId && dispatchForTarget(service, selectedUnitId, target, onPlayerAttack)) {
      onChanged?.();
      return;
    }

    const selectedEnemy = findVisibleEnemyId(service, target);
    if (selectedEnemy) {
      setSelection({ kind: 'enemy', id: selectedEnemy });
      onChanged?.();
      return;
    }

    if (!selectedUnitId) {
      setSelection({ kind: 'none' });
      onChanged?.();
      return;
    }

    setSelection({ kind: 'none' });
    onChanged?.();
  };

  const keyDirections: Record<string, number> = {
    ArrowRight: 0,
    ArrowUp: 2,
    ArrowLeft: 3,
    ArrowDown: 5,
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const state = service.getState();
      const units = state.units.filter(isPlayerSide);
      if (units.length === 0) return;
      const selection = getSelection();
      const currentIndex = units.findIndex(
        (u) => selection.kind === 'own' && u.id === selection.id
      );
      const next = units[(currentIndex + 1) % units.length] ?? units[0]!;
      setSelection({ kind: 'own', id: next.id });
      onChanged?.();
      return;
    }

    if (event.key.toLowerCase() === 'e') {
      service.dispatch({ type: 'EndTurn' });
      return;
    }
    if (event.key.toLowerCase() === 'u') {
      if (service.undo()) {
        onUndo?.();
        onChanged?.();
      }
      return;
    }
    if (event.key.toLowerCase() === 'g') {
      const selectedUnitId = currentPlayerSideUnitId(service, getSelection());
      if (selectedUnitId) service.dispatch({ type: 'GatherResource', unitId: selectedUnitId });
      return;
    }
    if (event.key.toLowerCase() === 'b') {
      service.dispatch({ type: 'BuildRobot', robotKind: 'scout' });
      return;
    }

    const dirIndex = keyDirections[event.key];
    if (dirIndex === undefined) return;
    const state = service.getState();
    const selectedUnitId = currentPlayerSideUnitId(service, getSelection());
    if (!selectedUnitId) return;
    const unit = state.units.find((u) => u.id === selectedUnitId && isPlayerSide(u));
    const direction = HEX_DIRECTIONS[dirIndex];
    if (!unit || !direction) return;
    event.preventDefault();
    dispatchForTarget(service, selectedUnitId, add(unit.coord, direction), onPlayerAttack);
  };

  canvas.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeyDown);

  return {
    destroy: () => {
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
    },
  };
};
