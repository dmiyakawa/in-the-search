import { describe, expect, test } from 'vitest';
import { evaluateStatus } from '../../src/domain/rules/victory';

describe('evaluateStatus', () => {
  test('victory takes precedence over defeat', () => {
    expect(evaluateStatus({ goalReached: true, playerAlive: false, podAlive: false })).toBe('won');
  });

  test('defeat when player is dead and goal not reached', () => {
    expect(evaluateStatus({ goalReached: false, playerAlive: false, podAlive: true })).toBe('lost');
  });

  test('defeat when pod is destroyed and goal not reached', () => {
    expect(evaluateStatus({ goalReached: false, playerAlive: true, podAlive: false })).toBe('lost');
  });

  test('victory takes precedence over pod destruction', () => {
    expect(evaluateStatus({ goalReached: true, playerAlive: true, podAlive: false })).toBe('won');
  });

  test('playing when both conditions are false', () => {
    expect(evaluateStatus({ goalReached: false, playerAlive: true, podAlive: true })).toBe(
      'playing'
    );
  });

  test('won when goal reached and player alive', () => {
    expect(evaluateStatus({ goalReached: true, playerAlive: true, podAlive: true })).toBe('won');
  });
});
