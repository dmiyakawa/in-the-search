import { describe, expect, test } from 'vitest';
import { key } from '../../src/domain/hex';
import { createEmptyMap, setTile } from '../../src/domain/map';
import { updateVisibility } from '../../src/domain/rules/fog';
import type { Unit } from '../../src/domain/units';

describe('updateVisibility', () => {
  const unitAt = (coord: { q: number; r: number }, vision: number): Unit => ({
    id: 'u',
    kind: 'player',
    coord,
    hp: 10,
    maxHp: 10,
    vision,
    movement: 2,
    attack: 2,
  });

  test('reveals tiles within vision and keeps unknown outside', () => {
    const map = createEmptyMap(3);
    const { map: out, nowVisible } = updateVisibility(map, [unitAt({ q: 0, r: 0 }, 1)]);

    expect(out.tiles[key({ q: 0, r: 0 })]?.visibility).toBe('visible');
    expect(out.tiles[key({ q: 1, r: 0 })]?.visibility).toBe('visible');
    expect(out.tiles[key({ q: 0, r: 2 })]?.visibility).toBe('unknown');
    expect(nowVisible.length).toBe(7);
  });

  test('demotes previously visible tiles to discovered when out of range', () => {
    const map = createEmptyMap(3);
    const visible = setTile(map, { ...map.tiles[key({ q: 2, r: 0 })]!, visibility: 'visible' });
    const { map: out, nowVisible } = updateVisibility(visible, [unitAt({ q: 0, r: 0 }, 1)]);

    expect(out.tiles[key({ q: 2, r: 0 })]?.visibility).toBe('discovered');
    expect(out.tiles[key({ q: 1, r: 0 })]?.visibility).toBe('visible');
    expect(nowVisible).not.toContain(key({ q: 2, r: 0 }));
  });

  test('combines vision from multiple units', () => {
    const map = createEmptyMap(3);
    const { map: out } = updateVisibility(map, [
      unitAt({ q: -2, r: 0 }, 1),
      unitAt({ q: 2, r: 0 }, 1),
    ]);

    expect(out.tiles[key({ q: -2, r: 0 })]?.visibility).toBe('visible');
    expect(out.tiles[key({ q: 2, r: 0 })]?.visibility).toBe('visible');
  });

  test('nowVisible contains newly visible tiles including discovered-to-visible', () => {
    const map = createEmptyMap(3);
    const discovered = setTile(map, {
      ...map.tiles[key({ q: 1, r: 0 })]!,
      visibility: 'discovered',
    });
    const { nowVisible } = updateVisibility(discovered, [unitAt({ q: 0, r: 0 }, 1)]);

    expect(nowVisible).toContain(key({ q: 0, r: 0 }));
    expect(nowVisible).toContain(key({ q: 1, r: 0 }));
  });
});
