import type { GameState } from '../application/state';
import type { EnemyPhasePrediction } from '../application/turn/turnEngine';
import { isPlayerSide } from '../domain/units';
import type { HudActions } from './Hud';
import type { Selection } from './selection';

const hpAfterLabel = (hp: number, damage: number): string => {
  const after = hp - damage;
  return after <= 0 ? 'DOWN' : String(after);
};

const unitLabel = (kind: string, id: string): string => {
  if (kind === 'player') return 'Player';
  if (kind === 'robot') return `Scout ${id}`;
  return id;
};

export const renderUnitList = (
  root: HTMLElement,
  state: GameState,
  prediction: EnemyPhasePrediction | undefined,
  selection: Selection,
  actionsByUnit: (id: string) => HudActions
): void => {
  root.replaceChildren();

  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = 'Units';
  root.append(title);

  for (const unit of state.units.filter(isPlayerSide)) {
    const actions = actionsByUnit(unit.id);
    const movementLeft = state.turnState.movementLeft[unit.id] ?? 0;
    const acted = state.turnState.hasActed[unit.id] ?? false;
    const damage =
      unit.kind === 'player'
        ? (prediction?.damage.player ?? 0)
        : (prediction?.damage.robots[unit.id] ?? 0);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'panel-row unit-row';
    if (selection.kind === 'own' && selection.id === unit.id) row.classList.add('selected');
    if (movementLeft <= 0 && acted) row.classList.add('exhausted');
    row.dataset.unitId = unit.id;
    row.innerHTML = `
      <span class="row-main">${unitLabel(unit.kind, unit.id)}</span>
      <span class="row-stat">HP ${unit.hp}/${unit.maxHp}${
        prediction ? ` -> ${hpAfterLabel(unit.hp, damage)}` : ''
      }</span>
      <span class="row-stat">Move ${movementLeft} / ${acted ? 'acted' : 'ready'}</span>
      <span class="row-stat">${actions.canGather ? 'Gather' : ''}${actions.canAttack ? ' Attack' : ''}</span>
    `;
    root.append(row);
  }

  const podDamage = prediction?.damage.pod ?? 0;
  const podRow = document.createElement('div');
  podRow.className = 'panel-row pod-row';
  podRow.innerHTML = `
    <span class="row-main">Pod</span>
    <span class="row-stat">HP ${state.pod.hp}/${state.pod.maxHp}${
      prediction ? ` -> ${hpAfterLabel(state.pod.hp, podDamage)}` : ''
    }</span>
  `;
  root.append(podRow);
};
