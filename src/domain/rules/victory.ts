export type GameStatus = 'playing' | 'won' | 'lost';

export const evaluateStatus = (input: {
  goalReached: boolean;
  playerAlive: boolean;
}): GameStatus => {
  if (input.goalReached) return 'won';
  if (!input.playerAlive) return 'lost';
  return 'playing';
};
