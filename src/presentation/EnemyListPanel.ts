import type { GameState } from '../application/state';
import { getTile } from '../domain/map';
import type { AttackIndicator } from './CanvasRenderer';
import type { Selection } from './selection';

export const renderEnemyList = (
  root: HTMLElement,
  state: GameState,
  selection: Selection,
  playerAttack?: AttackIndicator
): void => {
  root.replaceChildren();

  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = 'Enemies';
  root.append(title);

  const enemies = state.units.filter((unit) => {
    if (unit.kind !== 'enemy') return false;
    return getTile(state.map, unit.coord)?.visibility === 'visible';
  });

  if (enemies.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'panel-empty';
    empty.textContent = 'None visible';
    root.append(empty);
    return;
  }

  for (const enemy of enemies) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'panel-row enemy-row';
    if (selection.kind === 'enemy' && selection.id === enemy.id) row.classList.add('selected');
    row.dataset.enemyId = enemy.id;
    const damage =
      playerAttack?.side === 'player' && playerAttack.targetId === enemy.id
        ? playerAttack.damage
        : 0;
    const hpBefore = enemy.hp + damage;
    const hpLabel =
      damage > 0
        ? `HP ${hpBefore}/${enemy.maxHp} -> ${enemy.hp}/${enemy.maxHp}`
        : `HP ${enemy.hp}/${enemy.maxHp}`;
    row.innerHTML = `
      <span class="row-main">${enemy.id}</span>
      <span class="row-stat">${hpLabel}</span>
    `;
    root.append(row);
  }
};
