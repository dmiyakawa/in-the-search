# Hex 座標アルゴリズム・リファレンス

`domain/hex` の実装で用いる六角座標（**pointy-top / axial(+cube)**）の確定アルゴリズム集。
実装担当エージェントは本ファイルの式・擬似コードをそのまま実装してよい（redblobgames 系の定式に準拠、
前タスクで数値検証済み）。設計上の位置づけは `design.md §5.1`、決定は `decisions.md D-04`。

> 本ファイルは「式の正典」。`design.md §5.1` と本ファイルが食い違う場合は本ファイルを優先し、design.md を直す。

---

## 0. 型と定数

```ts
export type Hex = { q: number; r: number };            // axial 整数座標（分数の中間値にも使う）
export type Cube = { x: number; y: number; z: number }; // x=q, z=r, y=-x-z（不変条件 x+y+z=0）
export type Point = { x: number; y: number };           // ピクセル座標
const SQRT3 = Math.sqrt(3);
```

---

## 1. axial ↔ cube

```ts
export const axialToCube = (h: Hex): Cube => ({ x: h.q, y: -h.q - h.r, z: h.r });
export const cubeToAxial = (c: Cube): Hex => ({ q: c.x, r: c.z });
```

不変条件: 常に `x + y + z === 0`。テストで全変換後に検証する。

---

## 2. 近傍6方向（固定インデックス順）

pointy-top の axial 差分。**この配列順（index 0..5）を全箇所で共有**し、敵AIの方向タイブレーク
（`rule.md §6.1`）にもこの優先順位を使う。

```ts
export const HEX_DIRECTIONS: readonly Hex[] = [
  { q: +1, r:  0 }, // 0
  { q: +1, r: -1 }, // 1
  { q:  0, r: -1 }, // 2
  { q: -1, r:  0 }, // 3
  { q: -1, r: +1 }, // 4
  { q:  0, r: +1 }, // 5
];
export const add = (a: Hex, b: Hex): Hex => ({ q: a.q + b.q, r: a.r + b.r });
export const neighbors = (h: Hex): Hex[] => HEX_DIRECTIONS.map((d) => add(h, d));
export const equals = (a: Hex, b: Hex): boolean => a.q === b.q && a.r === b.r;
```

---

## 3. 距離

```ts
export const distance = (a: Hex, b: Hex): number => {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
};
```

性質（テスト用）: `distance(a,a)===0` / 隣接は常に `1` / 対称 `d(a,b)===d(b,a)`。

---

## 4. cube 丸め（pixel→hex の中核・最重要）

分数 axial を最近接の整数 hex に丸める。**単純な四捨五入では境界付近で誤った隣接 hex を選ぶ**ため、
3成分を丸めた後、丸め誤差が最大の成分を `x+y+z=0` から再計算して補正する。

```ts
export const cubeRound = (xf: number, yf: number, zf: number): Cube => {
  let rx = Math.round(xf), ry = Math.round(yf), rz = Math.round(zf);
  const dx = Math.abs(rx - xf), dy = Math.abs(ry - yf), dz = Math.abs(rz - zf);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz)       ry = -rx - rz;
  else                    rz = -rx - ry;
  return { x: rx, y: ry, z: rz };
};
export const axialRound = (qf: number, rf: number): Hex =>
  cubeToAxial(cubeRound(qf, -qf - rf, rf));
```

**動作確認用の数値例**（テストに含める）:
- `axialRound(0.6, -0.3)` → `{q:0, r:0}`（`(0.6,-0.3,-0.3)` の最近接は原点）
- `axialRound(0.4, 0.4)`  → `{q:0, r:1}`
- 整数入力は恒等: `axialRound(2, -1)` → `{q:2, r:-1}`

---

## 5. hex ↔ pixel（pointy-top, `size` = 中心→頂点の距離）

```ts
export const hexToPixel = (h: Hex, size: number, origin: Point = { x: 0, y: 0 }): Point => ({
  x: size * (SQRT3 * h.q + (SQRT3 / 2) * h.r) + origin.x,
  y: size * ((3 / 2) * h.r) + origin.y,
});
export const pixelToHex = (px: number, py: number, size: number, origin: Point = { x: 0, y: 0 }): Hex => {
  const x = px - origin.x, y = py - origin.y;
  const qf = ((SQRT3 / 3) * x - (1 / 3) * y) / size;
  const rf = ((2 / 3) * y) / size;
  return axialRound(qf, rf);
};
```

幾何メモ（描画で使用）: hex 幅 `= SQRT3*size`、高さ `= 2*size`、行間 `= 1.5*size`、列間 `= SQRT3*size`。

---

## 6. 座標キー（保存・Map のキー・デバッグ表示で統一）

`GameMap` のタイル格納や集合の重複排除に使う文字列キー。**負値も含めこの1関数に集約**して揺れを防ぐ
（`design.md §5.2`）。

```ts
export type CoordKey = string;                                   // 例: "-1,2"
export const key = (h: Hex): CoordKey => `${h.q},${h.r}`;
export const parseKey = (k: CoordKey): Hex => {
  const [q, r] = k.split(',').map(Number);
  return { q, r };
};
```

---

## 7. このモジュールに期待するユニットテスト（`tests/unit/hex.test.ts`）

- **往復変換**: ランダム/代表的な整数 hex 多数で `cubeToAxial(axialToCube(h)) === h`、`x+y+z===0`。
- **pixel 往復**: 整数 hex を `hexToPixel`→`pixelToHex` で元に戻る（複数の `size`、`origin≠0` 含む）。
- **境界丸め**: §4 の数値例 + 真の境界（隣接2 hex の中点）と、そのわずかなずれが近い側に丸まること。
  具体例（テストに含める）: `axialRound(0.5, 0)` → `{q:1,r:0}`（中点は決定的に片側）/
  `axialRound(0.49, 0)` → `{q:0,r:0}` / `axialRound(0.51, 0)` → `{q:1,r:0}`。
- **距離**: §3 の性質（自己0・隣接1・対称）+ 既知の手計算ペア数件。
- **近傍**: `neighbors(h)` が6個・全て距離1・重複なし・`HEX_DIRECTIONS` の順序通り。
- **キー**: `parseKey(key(h)) === h`（負値・0 を含む）。
- **hex 直線**（§8）: `hexLine(a,b)` の長さが `distance(a,b)+1`・両端が a,b・連続する各要素が距離1。

---

## 8. hex 直線（cube lerp）— MapGenerator の `carveCorridor` 用

2点 `a,b` を結ぶ連続したタイル列（両端含む）を返す。マップ生成のフォールバックで pod→goal の通路を
彫るのに使う。**補間は cube 3成分で**行い、各サンプル点を `cubeRound` する。

```ts
export const hexLine = (a: Hex, b: Hex): Hex[] => {
  const n = distance(a, b);
  if (n === 0) return [a];
  const ac = axialToCube(a), bc = axialToCube(b);
  const out: Hex[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;                                  // t = 0, 1/n, ..., 1
    const x = ac.x + (bc.x - ac.x) * t;
    const y = ac.y + (bc.y - ac.y) * t;
    const z = ac.z + (bc.z - ac.z) * t;
    out.push(cubeToAxial(cubeRound(x, y, z)));
  }
  return out;
};
```

- サンプル数は `n+1`（`i=0..n`）で固定。これにより**同入力→同タイル列**で決定的。
- まれに同一 hex が連続し得るので、利用側（`carveCorridor`）は `key()` で重複排除してから passable 化する。

