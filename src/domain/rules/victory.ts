export type GameStatus = 'playing' | 'won' | 'lost';

export const evaluateStatus = (input: {
  goalReached: boolean;
  playerAlive: boolean;
  podAlive: boolean;
}): GameStatus => {
  if (input.goalReached) return 'won';
  if (!input.playerAlive || !input.podAlive) return 'lost';
  return 'playing';
};
