import { describe, expect, test } from 'vitest';
import { GameService } from '../../src/application/GameService';
import type { Command } from '../../src/application/commands';

const runCommands = (seed: number, commands: Command[]) => {
  const service = new GameService(GameService.newGame(seed));
  const results = commands.map((command) => service.dispatch(command));
  return { results, state: service.getState() };
};

describe('determinism', () => {
  test('same seed and same command sequence produce the same GameState snapshot', () => {
    const commands: Command[] = [
      { type: 'EndTurn' },
      { type: 'EndTurn' },
      { type: 'MoveUnit', unitId: 'player', to: { q: 1, r: 0 } },
    ];

    const first = runCommands(20260621, commands);
    const second = runCommands(20260621, commands);

    expect(second.results).toEqual(first.results);
    expect(second.state).toEqual(first.state);
  });
});
