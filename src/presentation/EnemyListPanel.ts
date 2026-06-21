import type { GameState } from '../application/state';
import { getTile } from '../domain/map';
import type { AttackIndicator } from './CanvasRenderer';
import type { Selection } from './selection';

export const renderEnemyList = (
  root: HTMLElement,
  state: GameState,
  selection: Selection,
  playerAttacks: AttackIndicator[] = []
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
  const attacksByEnemy = new Map<
    string,
    { damage: number; targetMaxHp: number; targetHpAfter: number; targetDestroyed: boolean }
  >();
  for (const attack of playerAttacks) {
    if (attack.side !== 'player' || attack.targetKind !== 'enemy') continue;
    const current = attacksByEnemy.get(attack.targetId);
    attacksByEnemy.set(attack.targetId, {
      damage: (current?.damage ?? 0) + attack.damage,
      targetMaxHp: attack.targetMaxHp ?? current?.targetMaxHp ?? 0,
      targetHpAfter: attack.targetHpAfter ?? current?.targetHpAfter ?? 0,
      targetDestroyed: Boolean(current?.targetDestroyed || attack.targetDestroyed),
    });
  }
  const defeatedEnemies = [...attacksByEnemy.entries()].filter(
    ([id, attack]) => attack.targetDestroyed && !enemies.some((enemy) => enemy.id === id)
  );

  if (enemies.length === 0 && defeatedEnemies.length === 0) {
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
    const attack = attacksByEnemy.get(enemy.id);
    const damage = attack?.damage ?? 0;
    const hpBefore = enemy.hp + damage;
    const hpAfter = attack?.targetHpAfter ?? enemy.hp;
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

  for (const [enemyId, attack] of defeatedEnemies) {
    const row = document.createElement('div');
    row.className = 'panel-row enemy-row doomed';
    row.dataset.enemyId = enemyId;
    const hpBefore = attack.targetHpAfter + attack.damage;
    row.innerHTML = `
      <span class="row-main">${enemyId}</span>
      <span class="row-stat">HP ${hpBefore}/${attack.targetMaxHp} -> 0/${attack.targetMaxHp}</span>
      <span class="row-alert">Down this phase</span>
    `;
    root.append(row);
  }
};
