import type { GameState } from '../application/state';
import type { EnemyPhasePrediction } from '../application/turn/turnEngine';

const statusLabel: Record<GameState['status'], string> = {
  playing: 'Exploring',
  won: 'Ship reached',
  lost: 'Mission lost',
};

export const renderHud = (
  root: HTMLElement,
  state: GameState,
  prediction?: EnemyPhasePrediction
): void => {
  const player = state.units.find((u) => u.id === 'player');
  const movementLeft = state.turnState.movementLeft.player ?? 0;
  const acted = state.turnState.hasActed.player ? 'acted' : 'ready';
  const predictedPlayerDamage = prediction?.damage.player ?? 0;
  const predictedPodDamage = prediction?.damage.pod ?? 0;
  root.textContent = [
    'In the Search MVP',
    `Turn ${state.turn} / ${state.phase}`,
    `HP ${player?.hp ?? 0}/${player?.maxHp ?? 0}`,
    `Pod ${state.pod.hp}/${state.pod.maxHp}`,
    `Incoming HP -${predictedPlayerDamage} / Pod -${predictedPodDamage}`,
    `Move ${movementLeft} / ${acted}`,
    `Resource ${state.inventory.resource}`,
    statusLabel[state.status],
    'Click adjacent hex or enemy. U undo. E ends turn.',
  ].join('\n');
};
