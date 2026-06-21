import { describe, expect, test } from 'vitest';
import { evaluateStatus } from '../../src/domain/rules/victory';

describe('evaluateStatus', () => {
  test('victory takes precedence over defeat', () => {
    expect(evaluateStatus({ goalReached: true, playerAlive: false })).toBe('won');
  });

  test('defeat when player is dead and goal not reached', () => {
    expect(evaluateStatus({ goalReached: false, playerAlive: false })).toBe('lost');
  });

  test('playing when both conditions are false', () => {
    expect(evaluateStatus({ goalReached: false, playerAlive: true })).toBe('playing');
  });

  test('won when goal reached and player alive', () => {
    expect(evaluateStatus({ goalReached: true, playerAlive: true })).toBe('won');
  });
});
