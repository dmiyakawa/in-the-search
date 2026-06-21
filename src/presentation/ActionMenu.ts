import { distance, hexToPixel } from '../domain/hex';
import { getTile } from '../domain/map';
import { isPlayerSide } from '../domain/units';
import type { GameService } from '../application/GameService';
import type { GameState } from '../application/state';
import type { AttackIndicator, View } from './CanvasRenderer';
import type { Selection } from './selection';

type MenuItem = {
  label: string;
  enabled: boolean;
  action: () => void;
};

const firstAdjacentTargetId = (state: GameState, unitId: string): string | undefined => {
  const unit = state.units.find((u) => u.id === unitId && isPlayerSide(u));
  if (!unit) return undefined;
  const enemy = state.units.find((target) => {
    if (target.kind !== 'enemy') return false;
    if (distance(unit.coord, target.coord) !== 1) return false;
    return getTile(state.map, target.coord)?.visibility === 'visible';
  });
  if (enemy) return enemy.id;
  return state.nests.find((nest) => {
    if (distance(unit.coord, nest.coord) !== 1) return false;
    return getTile(state.map, nest.coord)?.visibility === 'visible';
  })?.id;
};

const targetCoord = (state: GameState, targetId: string) =>
  state.units.find((target) => target.id === targetId)?.coord ??
  state.nests.find((target) => target.id === targetId)?.coord;

export const renderActionMenu = (
  root: HTMLElement,
  service: GameService,
  state: GameState,
  view: View,
  selection: Selection,
  onChanged: () => void,
  onPlayerAttack?: (indicator: AttackIndicator) => void,
  onUndo?: () => void
): void => {
  root.replaceChildren();
  root.hidden = true;
  if (selection.kind !== 'own' || !selection.id || state.status !== 'playing') return;

  const unit = state.units.find((u) => u.id === selection.id && isPlayerSide(u));
  if (!unit) return;

  const items: MenuItem[] = [];
  if (service.isOnResourceTile(unit.id)) {
    items.push({
      label: 'Gather (G)',
      enabled: service.canGather(unit.id),
      action: () => {
        service.dispatch({ type: 'GatherResource', unitId: unit.id });
      },
    });
  }
  if (unit.id === 'player' && service.isPlayerOnPod()) {
    items.push({
      label: 'Build scout (B)',
      enabled: service.canBuildRobot(),
      action: () => {
        service.dispatch({ type: 'BuildRobot', robotKind: 'scout' });
      },
    });
  }
  if (service.canAttack(unit.id)) {
    items.push({
      label: 'Attack',
      enabled: true,
      action: () => {
        const targetId = firstAdjacentTargetId(state, unit.id);
        const to = targetId ? targetCoord(state, targetId) : undefined;
        if (!targetId || !to) return;
        const result = service.dispatch({ type: 'AttackUnit', attackerId: unit.id, targetId });
        if (result.ok) {
          onPlayerAttack?.({
            attackerId: unit.id,
            targetId,
            from: unit.coord,
            to,
            damage: unit.attack,
            side: 'player',
          });
        }
      },
    });
  }
  items.push(
    {
      label: 'End Turn (E)',
      enabled: service.canEndTurn(),
      action: () => {
        service.dispatch({ type: 'EndTurn' });
      },
    },
    {
      label: 'Undo (U)',
      enabled: service.canUndo(),
      action: () => {
        if (service.undo()) onUndo?.();
      },
    }
  );

  const center = hexToPixel(unit.coord, view.size, view.origin);
  root.style.left = `${center.x + view.size * 0.7}px`;
  root.style.top = `${Math.max(8, center.y - view.size * 7.5)}px`;
  root.hidden = false;

  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    button.disabled = !item.enabled;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!item.enabled) return;
      item.action();
      onChanged();
    });
    root.append(button);
  }
};
