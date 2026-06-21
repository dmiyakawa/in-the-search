import { describe, expect, test } from 'vitest';
import {
  UNIT_STATS,
  createEnemy,
  createNest,
  createPlayer,
  createScout,
  isPlayerSide,
} from '../../src/domain/units';

describe('unit factories', () => {
  const coord = { q: 0, r: 0 };

  test('createPlayer applies player stats', () => {
    const u = createPlayer('p0', coord);
    expect(u.kind).toBe('player');
    expect(u.hp).toBe(UNIT_STATS.player.hp);
    expect(u.maxHp).toBe(UNIT_STATS.player.hp);
    expect(u.vision).toBe(UNIT_STATS.player.vision);
    expect(u.movement).toBe(UNIT_STATS.player.movement);
    expect(u.attack).toBe(UNIT_STATS.player.attack);
    expect(u.hp).toBe(u.maxHp);
  });

  test('createEnemy applies enemy stats', () => {
    const u = createEnemy('e0', coord);
    expect(u.kind).toBe('enemy');
    expect(u.hp).toBe(UNIT_STATS.enemy.hp);
    expect(u.maxHp).toBe(UNIT_STATS.enemy.hp);
    expect(u.vision).toBe(UNIT_STATS.enemy.vision);
    expect(u.movement).toBe(UNIT_STATS.enemy.movement);
    expect(u.attack).toBe(UNIT_STATS.enemy.attack);
  });

  test('createScout applies scout stats and robotKind', () => {
    const u = createScout('r0', coord);
    expect(u.kind).toBe('robot');
    expect(u.robotKind).toBe('scout');
    expect(u.hp).toBe(UNIT_STATS.scout.hp);
    expect(u.maxHp).toBe(UNIT_STATS.scout.hp);
    expect(u.vision).toBe(UNIT_STATS.scout.vision);
    expect(u.movement).toBe(UNIT_STATS.scout.movement);
    expect(u.attack).toBe(UNIT_STATS.scout.attack);
  });

  test('createNest has NEST_HP', () => {
    const n = createNest('n0', coord);
    expect(n.hp).toBe(8);
    expect(n.maxHp).toBe(8);
  });

  test('isPlayerSide', () => {
    expect(isPlayerSide(createPlayer('p0', coord))).toBe(true);
    expect(isPlayerSide(createScout('r0', coord))).toBe(true);
    expect(isPlayerSide(createEnemy('e0', coord))).toBe(false);
  });
});
