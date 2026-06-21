import type { Hex } from '../domain/hex';
import type { Unit } from '../domain/units';

export const minBy = <T>(arr: T[], rank: (t: T) => (number | string)[]): T => {
  if (arr.length === 0) throw new Error('minBy called on empty array');
  let best = arr[0]!;
  const isLess = (a: (number | string)[], b: (number | string)[]): boolean => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i]! < b[i]!) return true;
      if (a[i]! > b[i]!) return false;
    }
    return a.length < b.length;
  };
  for (let i = 1; i < arr.length; i++) {
    const current = arr[i]!;
    if (isLess(rank(current), rank(best))) best = current;
  }
  return best;
};

export const occupantAt = (units: Unit[], h: Hex): Unit | undefined =>
  units.find((u) => u.hp > 0 && u.coord.q === h.q && u.coord.r === h.r);
