export type Hex = { q: number; r: number };
export type Cube = { x: number; y: number; z: number };
export type Point = { x: number; y: number };
export type CoordKey = string;

const SQRT3 = Math.sqrt(3);

export const axialToCube = (h: Hex): Cube => ({ x: h.q, y: -h.q - h.r, z: h.r });

export const cubeToAxial = (c: Cube): Hex => ({ q: c.x, r: c.z });

export const HEX_DIRECTIONS: readonly Hex[] = [
  { q: +1, r: 0 },
  { q: +1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: +1 },
  { q: 0, r: +1 },
];

export const add = (a: Hex, b: Hex): Hex => ({ q: a.q + b.q, r: a.r + b.r });

export const neighbors = (h: Hex): Hex[] => HEX_DIRECTIONS.map((d) => add(h, d));

export const equals = (a: Hex, b: Hex): boolean => a.q === b.q && a.r === b.r;

export const distance = (a: Hex, b: Hex): number => {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
};

const normalizeZero = (n: number): number => (n === 0 ? 0 : n);

export const cubeRound = (xf: number, yf: number, zf: number): Cube => {
  let rx = Math.round(xf);
  let ry = Math.round(yf);
  let rz = Math.round(zf);
  const dx = Math.abs(rx - xf);
  const dy = Math.abs(ry - yf);
  const dz = Math.abs(rz - zf);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { x: normalizeZero(rx), y: normalizeZero(ry), z: normalizeZero(rz) };
};

export const axialRound = (qf: number, rf: number): Hex => cubeToAxial(cubeRound(qf, -qf - rf, rf));

export const hexToPixel = (h: Hex, size: number, origin: Point = { x: 0, y: 0 }): Point => ({
  x: size * (SQRT3 * h.q + (SQRT3 / 2) * h.r) + origin.x,
  y: size * ((3 / 2) * h.r) + origin.y,
});

export const pixelToHex = (
  px: number,
  py: number,
  size: number,
  origin: Point = { x: 0, y: 0 }
): Hex => {
  const x = px - origin.x;
  const y = py - origin.y;
  const qf = ((SQRT3 / 3) * x - (1 / 3) * y) / size;
  const rf = ((2 / 3) * y) / size;
  return axialRound(qf, rf);
};

export const key = (h: Hex): CoordKey => `${h.q},${h.r}`;

export const parseKey = (k: CoordKey): Hex => {
  const parts = k.split(',');
  if (parts.length !== 2) throw new Error(`Invalid coord key: ${k}`);
  const q = Number(parts[0]);
  const r = Number(parts[1]);
  return { q, r };
};

export const hexLine = (a: Hex, b: Hex): Hex[] => {
  const n = distance(a, b);
  if (n === 0) return [a];
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  const out: Hex[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = ac.x + (bc.x - ac.x) * t;
    const y = ac.y + (bc.y - ac.y) * t;
    const z = ac.z + (bc.z - ac.z) * t;
    out.push(cubeToAxial(cubeRound(x, y, z)));
  }
  return out;
};
