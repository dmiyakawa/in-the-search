import { GameService } from './application/GameService';
import type { GameState } from './application/state';
import { createPlayer, POD_DEFENSE, POD_HP } from './domain/units';
import { createEmptyMap, setTile } from './domain/map';
import { updateVisibility } from './domain/rules/fog';
import { render, type View } from './presentation/CanvasRenderer';
import { createInputController } from './presentation/InputController';
import { renderHud } from './presentation/Hud';

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

const createInitialState = (): GameState => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('__scenario') === 'win') return createE2eWinState();
  return GameService.newGame(readSeed());
};

const canvas = document.getElementById('game');
const hud = document.getElementById('hud');

if (!(canvas instanceof HTMLCanvasElement) || !(hud instanceof HTMLElement)) {
  throw new Error('Game canvas or HUD root is missing');
}

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Canvas 2D context is unavailable');
}

const service = new GameService(createInitialState());
let view: View = { size: 32, origin: { x: 0, y: 0 } };
let selectedUnitId = 'player';

const normalizeSelectedUnit = (): string => {
  const state = service.getState();
  const selected = state.units.find((unit) => unit.id === selectedUnitId && unit.kind !== 'enemy');
  if (selected) return selectedUnitId;
  selectedUnitId = state.units.find((unit) => unit.kind !== 'enemy')?.id ?? 'player';
  return selectedUnitId;
};

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
  const selected = normalizeSelectedUnit();
  render(ctx, state, view, prediction, selected);
  renderHud(hud, state, prediction, selected);
};

const redraw = (): void => {
  const state = service.getState();
  const prediction = state.status === 'playing' ? service.previewEnemyPhase() : undefined;
  const selected = normalizeSelectedUnit();
  render(ctx, state, view, prediction, selected);
  renderHud(hud, state, prediction, selected);
};

service.subscribe(redraw);
createInputController(
  canvas,
  service,
  () => view,
  redraw,
  () => selectedUnitId,
  (unitId) => {
    selectedUnitId = unitId;
  }
);
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
