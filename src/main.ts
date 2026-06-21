import { GameService } from './application/GameService';
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

const canvas = document.getElementById('game');
const hud = document.getElementById('hud');

if (!(canvas instanceof HTMLCanvasElement) || !(hud instanceof HTMLElement)) {
  throw new Error('Game canvas or HUD root is missing');
}

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Canvas 2D context is unavailable');
}

const service = new GameService(GameService.newGame(readSeed()));
let view: View = { size: 32, origin: { x: 0, y: 0 } };

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
  render(ctx, state, view, prediction);
  renderHud(hud, state, prediction);
};

const redraw = (): void => {
  const state = service.getState();
  const prediction = state.status === 'playing' ? service.previewEnemyPhase() : undefined;
  render(ctx, state, view, prediction);
  renderHud(hud, state, prediction);
};

service.subscribe(redraw);
createInputController(canvas, service, () => view, redraw);
window.addEventListener('resize', resize);
resize();
