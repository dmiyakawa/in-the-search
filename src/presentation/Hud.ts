import type { GameState } from '../application/state';
import type { EnemyPhasePrediction } from '../application/turn/turnEngine';

const statusLabel: Record<GameState['status'], string> = {
  playing: 'Exploring',
  won: 'Ship reached',
  lost: 'Mission lost',
};

export type HudActions = {
  canMove: boolean;
  canAttack: boolean;
  canGather: boolean;
  canBuild: boolean;
  canEndTurn: boolean;
  canUndo: boolean;
};

const actionLabels: Array<[keyof HudActions, string]> = [
  ['canMove', 'Move'],
  ['canAttack', 'Attack'],
  ['canGather', 'Gather'],
  ['canBuild', 'Build'],
  ['canEndTurn', 'EndTurn'],
  ['canUndo', 'Undo'],
];

export const renderHud = (
  root: HTMLElement,
  state: GameState,
  prediction?: EnemyPhasePrediction,
  selectedUnitId = 'player',
  actions?: HudActions
): void => {
  const player = state.units.find((u) => u.id === 'player');
  const selected = state.units.find((u) => u.id === selectedUnitId);
  const movementLeft = state.turnState.movementLeft.player ?? 0;
  const selectedMovementLeft = selected ? (state.turnState.movementLeft[selected.id] ?? 0) : 0;
  const acted = state.turnState.hasActed.player ? 'acted' : 'ready';
  const predictedPlayerDamage = prediction?.damage.player ?? 0;
  const predictedPodDamage = prediction?.damage.pod ?? 0;
  const availableActions = actions
    ? actionLabels.filter(([key]) => actions[key]).map(([, label]) => label)
    : [];
  root.textContent = [
    `Actions: ${availableActions.length > 0 ? availableActions.join(', ') : 'None'}`,
    'In the Search MVP',
    `Turn ${state.turn} / ${state.phase}`,
    `HP ${player?.hp ?? 0}/${player?.maxHp ?? 0}`,
    `Pod ${state.pod.hp}/${state.pod.maxHp} (build: ${actions?.canBuild ?? false})`,
    `Incoming HP -${predictedPlayerDamage} / Pod -${predictedPodDamage}`,
    `Selected ${selected?.id ?? selectedUnitId} / Move ${selectedMovementLeft}`,
    `Player Move ${movementLeft} / ${acted}`,
    `Resource ${state.inventory.resource} (gather: ${actions?.canGather ?? false})`,
    statusLabel[state.status],
    'Click adjacent hex or enemy. Tab unit. G gather. B build. U undo. E ends turn.',
  ].join('\n');
};
