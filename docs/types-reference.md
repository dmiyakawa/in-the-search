# 型・定数リファレンス

`domain`/`application` 横断で共有する**厳密な TypeScript 型定義**と**数値定数**の正典。
実装担当エージェントは本ファイルの型をそのまま使用・配置してよい。設計上の意図・根拠は
`design.md §5/§7`、ルール上の数値は `docs/rule.md §7.1`、決定は `decisions.md` を参照。

> 役割分担: ルール＝`rule.md`、設計意図＝`design.md`、**コードレベルの型＝本ファイル**、hex 式＝`hex-reference.md`。
> 食い違いがあれば「型は本ファイル」「式は hex-reference」「ルール数値は rule.md」を優先し、design.md を直す。

---

## 1. ドメイン基本型（`domain/`）

`Hex` / `CoordKey` / `key` / `parseKey` は `hex-reference.md` で定義済み。ここではそれ以外を定義する。

```ts
// domain/map/types.ts
export type Terrain = 'passable' | 'blocked';
export type Visibility = 'unknown' | 'discovered' | 'visible';
export type Feature = 'pod' | 'goal' | 'nest';

export type Tile = {
  coord: Hex;
  terrain: Terrain;
  visibility: Visibility;
  resourceAmount: number;        // 0 なら資源なし
  feature?: Feature;             // 無indexはundefined
};

// シリアライズ可能にするため Map ではなく Record（プレーンオブジェクト）で持つ（D-08）
export type GameMap = {
  radius: number;                // 六角領域の半径 R
  tiles: Record<CoordKey, Tile>; // キーは hex-reference の key()
};
```

```ts
// domain/units/types.ts
export type UnitId = string;
export type UnitKind = 'player' | 'robot' | 'enemy';
export type RobotKind = 'scout';

export type Unit = {
  id: UnitId;
  kind: UnitKind;
  coord: Hex;
  hp: number;
  maxHp: number;
  vision: number;                // 視界半径（hex距離）
  movement: number;              // 1ターンの移動力
  attack: number;
  robotKind?: RobotKind;         // kind==='robot' のとき設定
};

export type Nest = { id: string; coord: Hex; hp: number; maxHp: number };
```

---

## 2. ゲーム状態（`application/`、シリアライズ可能な純データ）

```ts
// application/state.ts
export type GameStatus = 'playing' | 'won' | 'lost';
export type Phase = 'player' | 'enemy';

export type GameState = {
  map: GameMap;
  units: Unit[];                 // player / robots / enemies を id 一意で混在保持
  nests: Nest[];
  inventory: { resource: number };
  turn: number;                  // 1 始まり
  phase: Phase;
  status: GameStatus;
  turnState: {
    movementLeft: Record<UnitId, number>; // プレイヤー側ユニットの残移動力（ターン開始時に movement で初期化）
    hasActed: Record<UnitId, boolean>;    // 移動以外の行動でそのターンの行動を終えたか
  };
  rngState: number;              // SeededRng の内部状態（uint32）。再現用に毎更新で同期
};
```

- 関数・クラスインスタンス・Map/Set を**持たない**（`JSON.stringify` で往復可能）。
- `turnState.movementLeft`/`hasActed` のキーは**プレイヤー側ユニット（player/robot）のみ**。

---

## 3. コマンド・イベント・結果（`application/commands.ts`, `events.ts`）

```ts
export type Command =
  | { type: 'MoveUnit'; unitId: UnitId; to: Hex }       // 隣接1歩のみ（複数歩は呼び出し側で分割）
  | { type: 'AttackUnit'; attackerId: UnitId; targetId: UnitId }
  | { type: 'GatherResource'; unitId: UnitId }
  | { type: 'BuildRobot'; robotKind: RobotKind }
  | { type: 'EndTurn' };

export type RejectReason =
  | 'not-player-phase' | 'unit-not-found' | 'not-own-unit'
  | 'not-adjacent' | 'blocked-terrain' | 'occupied' | 'out-of-bounds'
  | 'no-movement-left' | 'already-acted'
  | 'no-resource-here' | 'not-on-pod' | 'insufficient-resource'
  | 'target-not-adjacent' | 'target-not-enemy' | 'game-over';

export type CommandResult = { ok: true } | { ok: false; reason: RejectReason };

export type DomainEvent =
  | { type: 'UnitMoved'; unitId: UnitId; from: Hex; to: Hex }
  | { type: 'FogRevealed'; nowVisible: CoordKey[] }     // 今 visible になったタイル
  | { type: 'CombatResolved'; attackerId: UnitId; targetId: string; damage: number; targetHpAfter: number; targetDestroyed: boolean }
  | { type: 'ResourceGathered'; unitId: UnitId; amount: number; inventoryAfter: number }
  | { type: 'RobotBuilt'; robotId: UnitId; robotKind: RobotKind; coord: Hex }
  | { type: 'PhaseChanged'; phase: Phase }
  | { type: 'TurnAdvanced'; turn: number }
  | { type: 'GameWon' }
  | { type: 'GameLost' };
```

`MoveUnit` は**隣接1歩**のみ受け付ける（移動力 N の移動は UI 側が N 回 dispatch する）。これにより
1コマンド＝1移動力消費・1 `UnitMoved` イベントとなり、霧更新と決定性が単純化する。

---

## 4. インフラのポート（`infrastructure/`）

```ts
// infrastructure/rng/SeededRng.ts
export interface SeededRng {
  nextU32(): number;             // 0..2^32-1 の整数
  nextFloat(): number;           // [0,1)
  nextInt(maxExclusive: number): number; // 0..max-1
  getState(): number;            // 現在の内部状態（GameState.rngState へ保存）
}
export function createRng(seedOrState: number): SeededRng; // seed からも復元 state からも生成

// infrastructure/storage/StoragePort.ts
export interface StoragePort {
  save(slot: string, state: GameState): void;
  load(slot: string): GameState | null;
}
```

`createRng` の実装は **mulberry32**（決定的・状態1変数）を用いる。Phase 3 タスクに擬似コードあり。

---

## 5. 数値定数（`rule.md §7.1` 由来・1箇所に集約）

```ts
// domain/units/stats.ts
export const UNIT_STATS = {
  player: { hp: 10, vision: 2, movement: 2, attack: 2 },
  enemy:  { hp:  4, vision: 3, movement: 1, attack: 3 },
  scout:  { hp:  3, vision: 4, movement: 3, attack: 1 },
} as const;

export const GATHER_AMOUNT = 5;       // 1回の採取で在庫 +5
export const SCOUT_COST = 10;         // scout 建造コスト
export const NEST_HP = 8;             // 巣の耐久（任意破壊・暫定）

// infrastructure/mapgen
export const MAP_RADIUS = 7;          // R（rule.md は 6〜8、MVP既定値）
export const BLOCKED_RATE = 0.18;     // blocked タイルの割合（暫定）
export const ENEMY_COUNT = 5;
export const NEST_COUNT = 2;
export const RESOURCE_NODE_COUNT = 6;
export const MIN_POD_GOAL_DISTANCE = 6; // pod-goal の最小 hex 距離
export const MAP_GEN_MAX_RETRY = 20;    // 到達可能性リトライ上限（超過で carveCorridor フォールバック）
```

> これらは**バランス調整対象**（`tbd.md G-04/G-09`）。実装ではマジックナンバーを散らさず本定数を参照する。

---

## 6. 共有ヘルパ・生成結果型

決定性に直結するため、ここで挙動を確定する（実装の擬似コードは各 Phase タスク内）。

```ts
// application/util.ts — 最小値選択（同順位は配列の先頭側を採用＝安定）
export const minBy = <T>(arr: T[], rank: (t: T) => (number | string)[]): T;
//   rank は必ずタプル（配列）を返す。先頭要素優先の辞書順で比較し、数値は数値比較・文字列は文字列比較。
//   例: rank = t => [distance(o, t.coord), t.id]（近い順→id 昇順）。空配列に対しては呼ばない前提。
//   「id 昇順」(rule.md §6.1) は id 文字列の昇順を指す。ユニット id は採番上 `e0,e1,...`/`r0,...` のように
//   桁が揃う範囲（MVP の個数）なので文字列昇順＝数値昇順で一致する。

// application/util.ts — 1タイル1ユニット（rule.md §5）。敵味方を問わず占有者を返す
export const occupantAt = (units: Unit[], h: Hex): Unit | undefined =>
  units.find((u) => u.hp > 0 && u.coord.q === h.q && u.coord.r === h.r);

// infrastructure/mapgen — 決定的な非復元抽出（D-11）。rng.nextInt のみ使用
export const sampleN = <T>(arr: T[], n: number, rng: SeededRng): T[];
//   Fisher-Yates を rng で回し先頭 n 件を返す。Math.random は使わない（擬似コードは MapGenerator タスク）。

// infrastructure/mapgen — generateMap / attempt の戻り値
export type GenResult = {
  map: GameMap;
  podCoord: Hex;
  goalCoord: Hex;
  enemies: Unit[];   // 生成された敵（id は決定的に採番、例: `e0`,`e1`,...）
  nests: Nest[];     // 巣（id 例: `n0`,`n1`,...）
};
```

- **敵死亡時の状態更新の規約**: ユニット除去は `state.units = state.units.filter(u => u.id !== id)`（新配列）で行う。
  ループ中に除去する場合は、**ループ前に対象 id 列を確定**し、各反復で「現在も生存しているか」を都度確認する。
- `turnState` は**プレイヤー側ユニットのみ**を持つ。ターン前進時は現在の player/robot から**作り直す**ため、
  倒れたロボットは自然に消え、敵の id は最初から入らない（個別削除処理は不要）。
