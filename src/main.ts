import { GameService } from './application/GameService';
import type { GameState } from './application/state';
import { createEnemy, createPlayer, isPlayerSide, POD_DEFENSE, POD_HP } from './domain/units';
import { createEmptyMap, getTile, setTile } from './domain/map';
import { updateVisibility } from './domain/rules/fog';
import { render, type AttackIndicator, type View } from './presentation/CanvasRenderer';
import { createInputController } from './presentation/InputController';
import { renderHud, type HudActions } from './presentation/Hud';
import { renderUnitList } from './presentation/UnitListPanel';
import { renderEnemyList } from './presentation/EnemyListPanel';
import { renderActionMenu } from './presentation/ActionMenu';
import type { Selection } from './presentation/selection';

const readSeed = (): number => {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('seed');
  if (!raw) return 20260621;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed >>> 0 : 20260621;
};

const createE2eWinState = (): GameState => {
  const player = createPlayer('player', { q: 0, r: 0 });
  let map = createEmptyMap(2);
  const podTile = map.tiles['0,0']!;
  const goalTile = map.tiles['2,0']!;
  map = setTile(map, { ...podTile, feature: 'pod' });
  map = setTile(map, { ...goalTile, feature: 'goal' });
  const { map: visibleMap } = updateVisibility(map, [player]);
  return {
    map: visibleMap,
    units: [player],
    pod: {
      id: 'pod',
      coord: player.coord,
      hp: POD_HP,
      maxHp: POD_HP,
      defense: POD_DEFENSE,
    },
    nests: [],
    inventory: { resource: 0 },
    turn: 1,
    phase: 'player',
    status: 'playing',
    turnState: {
      movementLeft: { player: player.movement },
      hasActed: { player: false },
    },
    rngState: 0,
  };
};

const createE2eUiState = (enemyHp?: number): GameState => {
  const player = createPlayer('player', { q: 0, r: 0 });
  const enemy = createEnemy('e0', { q: 1, r: -1 });
  if (enemyHp !== undefined) enemy.hp = enemyHp;
  let map = createEmptyMap(2);
  const podTile = map.tiles['0,0']!;
  map = setTile(map, { ...podTile, feature: 'pod', resourceAmount: 1 });
  const { map: visibleMap } = updateVisibility(map, [player]);
  return {
    map: visibleMap,
    units: [player, enemy],
    pod: {
      id: 'pod',
      coord: player.coord,
      hp: POD_HP,
      maxHp: POD_HP,
      defense: POD_DEFENSE,
    },
    nests: [],
    inventory: { resource: 0 },
    turn: 1,
    phase: 'player',
    status: 'playing',
    turnState: {
      movementLeft: { player: 0 },
      hasActed: { player: false },
    },
    rngState: 0,
  };
};

const createInitialState = (): GameState => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('__scenario') === 'win') return createE2eWinState();
  if (params.get('__scenario') === 'ui') return createE2eUiState();
  if (params.get('__scenario') === 'ui-kill') return createE2eUiState(2);
  return GameService.newGame(readSeed());
};

const canvas = document.getElementById('game');
const hud = document.getElementById('hud');
const unitPanel = document.getElementById('unit-panel');
const enemyPanel = document.getElementById('enemy-panel');
const actionMenu = document.getElementById('action-menu');

if (
  !(canvas instanceof HTMLCanvasElement) ||
  !(hud instanceof HTMLElement) ||
  !(unitPanel instanceof HTMLElement) ||
  !(enemyPanel instanceof HTMLElement) ||
  !(actionMenu instanceof HTMLElement)
) {
  throw new Error('Game canvas or UI root is missing');
}

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Canvas 2D context is unavailable');
}

const service = new GameService(createInitialState());
let view: View = { size: 32, origin: { x: 0, y: 0 } };
let selection: Selection = { kind: 'own', id: 'player' };
let lastPlayerAttack: AttackIndicator | undefined;

const clearPlayerAttack = (): void => {
  lastPlayerAttack = undefined;
};

const normalizeSelection = (): Selection => {
  const state = service.getState();
  if (selection.kind === 'own') {
    const selected = state.units.find((unit) => unit.id === selection.id && isPlayerSide(unit));
    if (selected) return selection;
    const fallback = state.units.find(isPlayerSide);
    selection = fallback ? { kind: 'own', id: fallback.id } : { kind: 'none' };
    return selection;
  }
  if (selection.kind === 'enemy') {
    const selected = state.units.find((unit) => unit.id === selection.id && unit.kind === 'enemy');
    if (selected && getTile(state.map, selected.coord)?.visibility === 'visible') return selection;
    selection = { kind: 'none' };
  }
  return selection;
};

const computeHudActions = (selected?: string): HudActions => ({
  canMove: selected ? service.canMove(selected) : false,
  canAttack: selected ? service.canAttack(selected) : false,
  canGather: selected ? service.canGather(selected) : false,
  canBuild: service.canBuildRobot(),
  canEndTurn: service.canEndTurn(),
  canUndo: service.canUndo(),
});

const selectedOwnId = (current: Selection): string | undefined =>
  current.kind === 'own' ? current.id : undefined;

const resize = (): void => {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const state = service.getState();
  const size = Math.max(
    22,
    Math.min(38, Math.floor(Math.min(window.innerWidth, window.innerHeight) / 14))
  );
  view = {
    size,
    origin: {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    },
  };
  const prediction = state.status === 'playing' ? service.previewEnemyPhase() : undefined;
  const currentSelection = normalizeSelection();
  const ownId = selectedOwnId(currentSelection);
  render(ctx, state, view, prediction, currentSelection, lastPlayerAttack);
  renderHud(hud, state, prediction, ownId, computeHudActions(ownId));
  renderUnitList(unitPanel, state, prediction, currentSelection, computeHudActions);
  renderEnemyList(enemyPanel, state, currentSelection, lastPlayerAttack);
  renderActionMenu(
    actionMenu,
    service,
    state,
    view,
    currentSelection,
    redraw,
    (indicator) => {
      lastPlayerAttack = indicator;
    },
    clearPlayerAttack
  );
};

const redraw = (): void => {
  const state = service.getState();
  if (state.phase !== 'player' || state.status !== 'playing') clearPlayerAttack();
  const prediction = state.status === 'playing' ? service.previewEnemyPhase() : undefined;
  const currentSelection = normalizeSelection();
  const ownId = selectedOwnId(currentSelection);
  render(ctx, state, view, prediction, currentSelection, lastPlayerAttack);
  renderHud(hud, state, prediction, ownId, computeHudActions(ownId));
  renderUnitList(unitPanel, state, prediction, currentSelection, computeHudActions);
  renderEnemyList(enemyPanel, state, currentSelection, lastPlayerAttack);
  renderActionMenu(
    actionMenu,
    service,
    state,
    view,
    currentSelection,
    redraw,
    (indicator) => {
      lastPlayerAttack = indicator;
    },
    clearPlayerAttack
  );
};

service.subscribe((event) => {
  if (
    event.type === 'TurnAdvanced' ||
    event.type === 'UnitMoved' ||
    event.type === 'ResourceGathered' ||
    event.type === 'RobotBuilt' ||
    event.type === 'GameWon' ||
    event.type === 'GameLost'
  ) {
    lastPlayerAttack = undefined;
  }
  redraw();
});
createInputController(
  canvas,
  service,
  () => view,
  redraw,
  () => selection,
  (nextSelection) => {
    selection = nextSelection;
  },
  (indicator) => {
    lastPlayerAttack = indicator;
  },
  clearPlayerAttack
);
unitPanel.addEventListener('click', (event) => {
  const row = (event.target as HTMLElement).closest<HTMLElement>('[data-unit-id]');
  if (!row?.dataset.unitId) return;
  selection = { kind: 'own', id: row.dataset.unitId };
  redraw();
});
enemyPanel.addEventListener('click', (event) => {
  const row = (event.target as HTMLElement).closest<HTMLElement>('[data-enemy-id]');
  if (!row?.dataset.enemyId) return;
  selection = { kind: 'enemy', id: row.dataset.enemyId };
  redraw();
});
window.addEventListener('resize', resize);
resize();

declare global {
  interface Window {
    __ITS_TEST__?: {
      getState: () => Readonly<GameState>;
      getView: () => View;
    };
  }
}

if (new URLSearchParams(window.location.search).has('__test')) {
  window.__ITS_TEST__ = {
    getState: () => service.getState(),
    getView: () => view,
  };
}
