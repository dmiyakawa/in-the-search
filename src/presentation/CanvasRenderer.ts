import { hexToPixel, type Point } from '../domain/hex';
import type { Tile } from '../domain/map';
import type { GameState } from '../application/state';
import type { EnemyPhasePrediction } from '../application/turn/turnEngine';
import type { Selection } from './selection';

export type View = { size: number; origin: Point };

const tileColors: Record<Tile['visibility'], string> = {
  unknown: '#101418',
  discovered: '#334045',
  visible: '#66736c',
};

const terrainStroke: Record<Tile['terrain'], string> = {
  passable: '#1e2728',
  blocked: '#0b0f10',
};

const featureColors: Record<NonNullable<Tile['feature']>, string> = {
  pod: '#7cc7ff',
  goal: '#f4d35e',
  nest: '#d65a5a',
};

const hexPath = (ctx: CanvasRenderingContext2D, center: Point, size: number): void => {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = center.x + size * Math.cos(angle);
    const y = center.y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
};

const drawToken = (
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  fill: string,
  stroke = '#0f1416'
): void => {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1, radius * 0.18);
  ctx.strokeStyle = stroke;
  ctx.stroke();
};

const drawPreview = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  prediction: EnemyPhasePrediction,
  view: View
): void => {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(2, view.size * 0.08);
  ctx.strokeStyle = '#ffb36b';
  ctx.fillStyle = '#ffb36b';
  ctx.font = `${Math.max(10, Math.round(view.size * 0.34))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const action of prediction.actions) {
    if (action.kind === 'move') {
      const from = hexToPixel(action.from, view.size, view.origin);
      const to = hexToPixel(action.to, view.size, view.origin);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      drawToken(ctx, to, view.size * 0.28, '#ffb36b', '#5b2d12');
    } else if (action.kind === 'attack') {
      const target =
        action.targetId === state.pod.id
          ? state.pod
          : state.units.find((unit) => unit.id === action.targetId);
      if (!target) continue;
      const center = hexToPixel(target.coord, view.size, view.origin);
      ctx.beginPath();
      ctx.arc(center.x, center.y, view.size * 0.48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(`-${action.damage}`, center.x, center.y - view.size * 0.62);
    }
  }

  ctx.restore();
};

export const render = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  view: View,
  prediction?: EnemyPhasePrediction,
  selection?: Selection
): void => {
  const { canvas } = ctx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#101418';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const tile of Object.values(state.map.tiles)) {
    if (tile.visibility === 'unknown') continue;

    const center = hexToPixel(tile.coord, view.size, view.origin);
    hexPath(ctx, center, view.size - 1);
    ctx.fillStyle = tile.terrain === 'blocked' ? '#1a2022' : tileColors[tile.visibility];
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = terrainStroke[tile.terrain];
    ctx.stroke();

    if (tile.feature) {
      const alpha = tile.visibility === 'visible' ? 1 : 0.55;
      ctx.save();
      ctx.globalAlpha = alpha;
      drawToken(ctx, center, view.size * 0.28, featureColors[tile.feature]);
      ctx.restore();
    }

    if (tile.resourceAmount > 0) {
      ctx.fillStyle = tile.visibility === 'visible' ? '#75d17b' : '#4b7b52';
      ctx.fillRect(
        center.x - view.size * 0.16,
        center.y - view.size * 0.16,
        view.size * 0.32,
        view.size * 0.32
      );
    }
  }

  for (const nest of state.nests) {
    const tile = state.map.tiles[`${nest.coord.q},${nest.coord.r}`];
    if (tile?.visibility !== 'visible') continue;
    drawToken(ctx, hexToPixel(nest.coord, view.size, view.origin), view.size * 0.34, '#b84545');
  }

  if (prediction && state.status === 'playing') {
    drawPreview(ctx, state, prediction, view);
  }

  for (const unit of state.units) {
    const tile = state.map.tiles[`${unit.coord.q},${unit.coord.r}`];
    if (unit.kind === 'enemy' && tile?.visibility !== 'visible') continue;

    const center = hexToPixel(unit.coord, view.size, view.origin);
    const fill = unit.kind === 'player' ? '#e9f1ff' : unit.kind === 'robot' ? '#63d2ff' : '#e05a47';
    drawToken(ctx, center, view.size * 0.36, fill);
    if (
      (selection?.kind === 'own' && unit.id === selection.id) ||
      (selection?.kind === 'enemy' && unit.kind === 'enemy' && unit.id === selection.id)
    ) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, view.size * 0.52, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2, view.size * 0.08);
      ctx.strokeStyle = '#f4d35e';
      ctx.stroke();
    }

    ctx.fillStyle = '#111';
    ctx.font = `${Math.max(10, Math.round(view.size * 0.42))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      unit.kind === 'player' ? 'P' : unit.kind === 'robot' ? 'R' : 'E',
      center.x,
      center.y
    );
  }
};
