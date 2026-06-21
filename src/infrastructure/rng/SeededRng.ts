export interface SeededRng {
  nextU32(): number;
  nextFloat(): number;
  nextInt(maxExclusive: number): number;
  getState(): number;
}

export const createRng = (seedOrState: number): SeededRng => {
  let a = seedOrState >>> 0;

  const step = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };

  return {
    nextU32: () => step(),
    nextFloat: () => step() / 4294967296,
    nextInt: (maxExclusive: number) => {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new Error(`maxExclusive must be a positive integer: ${maxExclusive}`);
      }
      return step() % maxExclusive;
    },
    getState: () => a >>> 0,
  };
};
