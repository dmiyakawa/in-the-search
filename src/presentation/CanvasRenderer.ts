import { hexToPixel, type Point } from '../domain/hex';
import type { Tile } from '../domain/map';
import type { GameState } from '../application/state';
import type { EnemyPhasePrediction } from '../application/turn/turnEngine';
import type { Hex } from '../domain/hex';
import type { Selection } from './selection';

export type View = { size: number; origin: Point };
export type AttackIndicator = {
  attackerId: string;
  targetId: string;
  from: Hex;
  to: Hex;
  damage: number;
  side: 'player' | 'enemy';
};

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

const drawDamageText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string
): void => {
  const metrics = ctx.measureText(text);
  const paddingX = 4;
  const paddingY = 2;
  const height = 14;
  ctx.fillStyle = 'rgba(8, 10, 10, 0.78)';
  ctx.fillRect(
    x - metrics.width / 2 - paddingX,
    y - height / 2,
    metrics.width + paddingX * 2,
    height
  );
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y + paddingY);
};

const drawArrowHead = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number
): void => {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
};

const drawAttackIndicator = (
  ctx: CanvasRenderingContext2D,
  indicator: AttackIndicator,
  view: View,
  lane: number
): void => {
  const from = hexToPixel(indicator.from, view.size, view.origin);
  const to = hexToPixel(indicator.to, view.size, view.origin);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0) return;

  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;
  const offset = lane * view.size * 0.2;
  const verticalLift = indicator.side === 'player' ? -view.size * 0.42 : 0;
  const start = {
    x: from.x + ux * view.size * 0.42 + nx * offset,
    y: from.y + uy * view.size * 0.42 + ny * offset + verticalLift,
  };
  const end = {
    x: to.x - ux * view.size * 0.42 + nx * offset,
    y: to.y - uy * view.size * 0.42 + ny * offset + verticalLift,
  };
  const color = indicator.side === 'player' ? '#8ce99a' : '#ffb36b';

  ctx.save();
  ctx.globalAlpha = indicator.side === 'player' ? 0.9 : 0.7;
  ctx.lineWidth = Math.max(2, view.size * 0.08);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  drawArrowHead(ctx, end.x, end.y, Math.atan2(dy, dx), Math.max(7, view.size * 0.28));

  ctx.font = `${Math.max(10, Math.round(view.size * 0.34))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawDamageText(
    ctx,
    `-${indicator.damage}`,
    (start.x + end.x) / 2 + nx * view.size * 0.18,
    (start.y + end.y) / 2 + ny * view.size * 0.18,
    color
  );
  ctx.restore();
};

const targetCoord = (state: GameState, targetId: string): Hex | undefined => {
  if (targetId === state.pod.id) return state.pod.coord;
  return (
    state.units.find((unit) => unit.id === targetId)?.coord ??
    state.nests.find((nest) => nest.id === targetId)?.coord
  );
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

  const enemyPositions = new Map(
    state.units.filter((unit) => unit.kind === 'enemy').map((unit) => [unit.id, unit.coord])
  );
  const attackCounts = new Map<string, { count: number; damage: number }>();

  for (const action of prediction.actions) {
    if (action.kind === 'attack') {
      const current = attackCounts.get(action.targetId) ?? { count: 0, damage: 0 };
      attackCounts.set(action.targetId, {
        count: current.count + 1,
        damage: current.damage + action.damage,
      });
    }
  }

  for (const action of prediction.actions) {
    if (action.kind === 'move') {
      const from = hexToPixel(action.from, view.size, view.origin);
      const to = hexToPixel(action.to, view.size, view.origin);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      drawToken(ctx, to, view.size * 0.28, '#ffb36b', '#5b2d12');
      enemyPositions.set(action.enemyId, action.to);
    } else if (action.kind === 'attack') {
      const from = enemyPositions.get(action.enemyId);
      const to = targetCoord(state, action.targetId);
      if (!from || !to) continue;
      drawAttackIndicator(
        ctx,
        {
          attackerId: action.enemyId,
          targetId: action.targetId,
          from,
          to,
          damage: action.damage,
          side: 'enemy',
        },
        view,
        1
      );
    }
  }

  for (const [targetId, attack] of attackCounts) {
    if (attack.count <= 1) continue;
    const coord = targetCoord(state, targetId);
    if (!coord) continue;
    const center = hexToPixel(coord, view.size, view.origin);
    drawDamageText(ctx, `-${attack.damage}`, center.x, center.y - view.size * 0.72, '#ffb36b');
  }

  ctx.restore();
};

export const render = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  view: View,
  prediction?: EnemyPhasePrediction,
  selection?: Selection,
  playerAttack?: AttackIndicator
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

  if (playerAttack && state.status === 'playing') {
    drawAttackIndicator(ctx, playerAttack, view, -1);
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
