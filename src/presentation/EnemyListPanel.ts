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
  const defeatedEnemy =
    playerAttack?.side === 'player' &&
    playerAttack.targetKind === 'enemy' &&
    playerAttack.targetDestroyed &&
    !enemies.some((enemy) => enemy.id === playerAttack.targetId)
      ? playerAttack
      : undefined;

  if (enemies.length === 0 && !defeatedEnemy) {
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
    const hpBefore = playerAttack?.targetHpBefore ?? enemy.hp + damage;
    const hpAfter = playerAttack?.targetHpAfter ?? enemy.hp;
    if (damage > 0 && hpAfter <= 0) row.classList.add('doomed');
    const hpLabel =
      damage > 0
        ? `HP ${hpBefore}/${enemy.maxHp} -> ${hpAfter}/${enemy.maxHp}`
        : `HP ${enemy.hp}/${enemy.maxHp}`;
    row.innerHTML = `
      <span class="row-main">${enemy.id}</span>
      <span class="row-stat">${hpLabel}</span>
      ${damage > 0 && hpAfter <= 0 ? '<span class="row-alert">Down this phase</span>' : ''}
    `;
    root.append(row);
  }

  if (defeatedEnemy) {
    const row = document.createElement('div');
    row.className = 'panel-row enemy-row doomed';
    row.dataset.enemyId = defeatedEnemy.targetId;
    row.innerHTML = `
      <span class="row-main">${defeatedEnemy.targetId}</span>
      <span class="row-stat">HP ${defeatedEnemy.targetHpBefore}/${defeatedEnemy.targetMaxHp} -> 0/${defeatedEnemy.targetMaxHp}</span>
      <span class="row-alert">Down this phase</span>
    `;
    root.append(row);
  }
};
