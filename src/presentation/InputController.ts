import { add, distance, HEX_DIRECTIONS, pixelToHex, type Hex } from '../domain/hex';
import { getTile } from '../domain/map';
import { isPlayerSide } from '../domain/units';
import type { GameService } from '../application/GameService';
import type { View } from './CanvasRenderer';

export type InputController = { destroy(): void };

const playerUnitId = 'player';

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

const findPlayerSideUnitId = (service: GameService, target: Hex): string | undefined => {
  const state = service.getState();
  return state.units.find(
    (u) => isPlayerSide(u) && u.coord.q === target.q && u.coord.r === target.r
  )?.id;
};

const currentPlayerSideUnitId = (
  service: GameService,
  selectedUnitId: string
): string | undefined => {
  const state = service.getState();
  if (state.units.some((u) => u.id === selectedUnitId && isPlayerSide(u))) return selectedUnitId;
  return state.units.find(isPlayerSide)?.id;
};

const dispatchForTarget = (service: GameService, selectedUnitId: string, target: Hex): void => {
  const state = service.getState();
  const unit = state.units.find((u) => u.id === selectedUnitId && isPlayerSide(u));
  if (!unit || state.status !== 'playing') return;

  const targetId = findVisibleTargetId(service, target);
  if (targetId && distance(unit.coord, target) === 1) {
    service.dispatch({ type: 'AttackUnit', attackerId: unit.id, targetId });
    return;
  }

  const tile = getTile(state.map, target);
  if (tile?.terrain === 'passable' && distance(unit.coord, target) === 1) {
    service.dispatch({ type: 'MoveUnit', unitId: unit.id, to: target });
  }
};

export const createInputController = (
  canvas: HTMLCanvasElement,
  service: GameService,
  getView: () => View,
  onChanged?: () => void,
  getSelectedUnitId: () => string = () => playerUnitId,
  setSelectedUnitId: (unitId: string) => void = () => undefined
): InputController => {
  const onClick = (event: MouseEvent): void => {
    const point = canvasPoint(canvas, event);
    const view = getView();
    const target = pixelToHex(point.x, point.y, view.size, view.origin);
    const selectedOwnUnit = findPlayerSideUnitId(service, target);
    if (selectedOwnUnit) {
      setSelectedUnitId(selectedOwnUnit);
      onChanged?.();
      return;
    }
    const selectedUnitId = currentPlayerSideUnitId(service, getSelectedUnitId());
    if (!selectedUnitId) return;
    dispatchForTarget(service, selectedUnitId, target);
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
      const currentIndex = units.findIndex((u) => u.id === getSelectedUnitId());
      const next = units[(currentIndex + 1) % units.length] ?? units[0]!;
      setSelectedUnitId(next.id);
      onChanged?.();
      return;
    }

    if (event.key.toLowerCase() === 'e') {
      service.dispatch({ type: 'EndTurn' });
      return;
    }
    if (event.key.toLowerCase() === 'u') {
      if (service.undo()) onChanged?.();
      return;
    }
    if (event.key.toLowerCase() === 'g') {
      const selectedUnitId = currentPlayerSideUnitId(service, getSelectedUnitId());
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
    const selectedUnitId = currentPlayerSideUnitId(service, getSelectedUnitId());
    if (!selectedUnitId) return;
    const unit = state.units.find((u) => u.id === selectedUnitId && isPlayerSide(u));
    const direction = HEX_DIRECTIONS[dirIndex];
    if (!unit || !direction) return;
    event.preventDefault();
    dispatchForTarget(service, selectedUnitId, add(unit.coord, direction));
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
