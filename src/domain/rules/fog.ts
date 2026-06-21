import { key, type CoordKey } from '../hex';
import { getTile, tilesWithin, type GameMap } from '../map';
import type { Unit } from '../units';

export const updateVisibility = (
  map: GameMap,
  playerUnits: Unit[]
): { map: GameMap; nowVisible: CoordKey[] } => {
  const tiles: Record<CoordKey, ReturnType<typeof getTile>> = {};
  for (const k of Object.keys(map.tiles)) {
    const tile = map.tiles[k];
    if (!tile) continue;
    tiles[k] = tile.visibility === 'visible' ? { ...tile, visibility: 'discovered' } : { ...tile };
  }
  const out: GameMap = { ...map, tiles: tiles as GameMap['tiles'] };
  const nowVisible: CoordKey[] = [];

  for (const unit of playerUnits) {
    for (const tile of tilesWithin(out, unit.coord, unit.vision)) {
      const k = key(tile.coord);
      if (tile.visibility !== 'visible') {
        nowVisible.push(k);
      }
      out.tiles[k] = { ...tile, visibility: 'visible' };
    }
  }

  return { map: out, nowVisible };
};
