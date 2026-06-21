import { describe, expect, test } from 'vitest';
import {
  HEX_DIRECTIONS,
  add,
  axialRound,
  axialToCube,
  cubeRound,
  cubeToAxial,
  distance,
  hexLine,
  hexToPixel,
  key,
  neighbors,
  parseKey,
  pixelToHex,
} from '../../src/domain/hex';

describe('hex coordinates', () => {
  test('axial/cube roundtrip', () => {
    const cases = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 2 },
      { q: 3, r: -2 },
    ];
    for (const h of cases) {
      const c = axialToCube(h);
      expect(c.x + c.y + c.z).toBe(0);
      expect(cubeToAxial(c)).toEqual(h);
    }
  });

  test('pixel roundtrip for integer hexes', () => {
    const hexes = [
      { q: 0, r: 0 },
      { q: 2, r: -1 },
      { q: -3, r: 2 },
    ];
    const sizes = [20, 37.5];
    const origins = [
      { x: 0, y: 0 },
      { x: 100, y: 200 },
    ];
    for (const h of hexes) {
      for (const size of sizes) {
        for (const origin of origins) {
          const p = hexToPixel(h, size, origin);
          expect(pixelToHex(p.x, p.y, size, origin)).toEqual(h);
        }
      }
    }
  });

  test('cube rounding examples', () => {
    expect(axialRound(0.6, -0.3)).toEqual({ q: 0, r: 0 });
    expect(axialRound(0.4, 0.4)).toEqual({ q: 0, r: 1 });
    expect(axialRound(2, -1)).toEqual({ q: 2, r: -1 });
  });

  test('boundary rounding picks closest hex deterministically', () => {
    expect(axialRound(0.5, 0)).toEqual({ q: 1, r: 0 });
    expect(axialRound(0.49, 0)).toEqual({ q: 0, r: 0 });
    expect(axialRound(0.51, 0)).toEqual({ q: 1, r: 0 });
  });

  test('distance properties', () => {
    const a = { q: 1, r: -2 };
    const b = { q: 4, r: -1 };
    expect(distance(a, a)).toBe(0);
    expect(distance(a, b)).toBe(distance(b, a));
    for (const d of HEX_DIRECTIONS) {
      expect(distance(a, add(a, d))).toBe(1);
    }
    expect(distance({ q: 0, r: 0 }, { q: 2, r: -2 })).toBe(2);
  });

  test('neighbors', () => {
    const h = { q: 0, r: 0 };
    const ns = neighbors(h);
    expect(ns).toHaveLength(6);
    expect(ns).toEqual(HEX_DIRECTIONS.map((d) => add(h, d)));
    for (const n of ns) {
      expect(distance(h, n)).toBe(1);
    }
    const keys = new Set(ns.map(key));
    expect(keys.size).toBe(6);
  });

  test('key roundtrip with negatives', () => {
    const cases = [
      { q: 0, r: 0 },
      { q: -1, r: 2 },
      { q: 5, r: -3 },
    ];
    for (const h of cases) {
      expect(parseKey(key(h))).toEqual(h);
    }
  });

  test('cubeRound enforces x+y+z=0', () => {
    const c = cubeRound(1.1, -0.9, -0.2);
    expect(c.x + c.y + c.z).toBe(0);
  });

  test('hexLine properties', () => {
    const a = { q: 0, r: 0 };
    const b = { q: 3, r: -2 };
    const line = hexLine(a, b);
    expect(line.length).toBe(distance(a, b) + 1);
    expect(line[0]).toEqual(a);
    expect(line[line.length - 1]).toEqual(b);
    for (let i = 1; i < line.length; i++) {
      expect(distance(line[i - 1]!, line[i]!)).toBeLessThanOrEqual(1);
    }
  });
});
