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

const dispatchForTarget = (service: GameService, target: Hex): void => {
  const state = service.getState();
  const unit = state.units.find((u) => u.id === playerUnitId && isPlayerSide(u));
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
  onChanged?: () => void
): InputController => {
  const onClick = (event: MouseEvent): void => {
    const point = canvasPoint(canvas, event);
    const view = getView();
    dispatchForTarget(service, pixelToHex(point.x, point.y, view.size, view.origin));
  };

  const keyDirections: Record<string, number> = {
    ArrowRight: 0,
    ArrowUp: 2,
    ArrowLeft: 3,
    ArrowDown: 5,
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() === 'e') {
      service.dispatch({ type: 'EndTurn' });
      return;
    }
    if (event.key.toLowerCase() === 'u') {
      if (service.undo()) onChanged?.();
      return;
    }

    const dirIndex = keyDirections[event.key];
    if (dirIndex === undefined) return;
    const state = service.getState();
    const unit = state.units.find((u) => u.id === playerUnitId && isPlayerSide(u));
    const direction = HEX_DIRECTIONS[dirIndex];
    if (!unit || !direction) return;
    event.preventDefault();
    dispatchForTarget(service, add(unit.coord, direction));
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
