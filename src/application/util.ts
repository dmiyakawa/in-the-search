import type { Hex } from '../domain/hex';
import type { Unit } from '../domain/units';

export const compareRank = (
  a: readonly (number | string)[],
  b: readonly (number | string)[]
): number => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i]! < b[i]!) return -1;
    if (a[i]! > b[i]!) return 1;
  }
  return a.length - b.length;
};

export const minBy = <T>(arr: T[], rank: (t: T) => (number | string)[]): T => {
  if (arr.length === 0) throw new Error('minBy called on empty array');
  let best = arr[0]!;
  for (let i = 1; i < arr.length; i++) {
    const current = arr[i]!;
    if (compareRank(rank(current), rank(best)) < 0) best = current;
  }
  return best;
};

export const idRank = (id: string): (number | string)[] => {
  const match = /^([A-Za-z_ -]*?)(\d+)$/.exec(id);
  if (!match) return [id];
  return [match[1] ?? '', Number(match[2])];
};

export const occupantAt = (units: Unit[], h: Hex): Unit | undefined =>
  units.find((u) => u.hp > 0 && u.coord.q === h.q && u.coord.r === h.r);
