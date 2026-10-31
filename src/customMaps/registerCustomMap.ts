import type { LevelData, LevelManager } from '../managers/LevelManager';
import type { MapData, MapManager } from '../managers/MapManager';
import type { WaveManager, ZombieGroup } from '../managers/WaveManager';
import { pathGraphFromWaypoints } from '../path/pathGraph';
import { type CustomMapDocument, customLevelId, customMapKey } from './types';
import { assertValidCustomMap } from './validateCustomMap';

export interface CustomMapManagers {
  mapManager: MapManager;
  levelManager: LevelManager;
  waveManager: WaveManager;
}

export interface RegisterCustomMapOptions {
  /** When false, only map + level are registered (for level-select listing). Default true. */
  applyWaves?: boolean;
}

function buildMapData(doc: CustomMapDocument, mapName: string): MapData {
  const waypoints = doc.map.waypoints.map(wp => ({ x: wp.x, y: wp.y }));
  return {
    name: mapName,
    width: doc.map.width,
    height: doc.map.height,
    waypoints,
    pathGraph: pathGraphFromWaypoints(waypoints),
  };
}

function buildLevelData(doc: CustomMapDocument, levelId: string, mapName: string): LevelData {
  return {
    id: levelId,
    name: doc.name,
    description: doc.description || 'Custom map',
    map: mapName,
    difficulty: doc.level.difficulty,
    startingMoney: doc.level.startingMoney,
    startingLives: doc.level.startingLives,
    resourceModifiers: { wood: 1, metal: 1, energy: 1 },
  };
}

/**
 * Register a custom map document into gameplay managers.
 * Returns the level id used by LevelManager / startGameWithLevel.
 */
export function registerCustomMap(
  doc: CustomMapDocument,
  managers: CustomMapManagers,
  options?: RegisterCustomMapOptions
): { mapName: string; levelId: string } {
  assertValidCustomMap(doc);

  const mapName = customMapKey(doc.id);
  const levelId = customLevelId(doc.id);
  const applyWaves = options?.applyWaves !== false;

  managers.mapManager.registerMap(buildMapData(doc, mapName));
  managers.levelManager.registerLevel(buildLevelData(doc, levelId, mapName), { unlock: true });

  if (applyWaves) {
    const overrides = new Map<number, ZombieGroup[]>();
    for (const entry of doc.waves) {
      overrides.set(
        entry.wave,
        entry.groups.map(g => ({
          type: g.type,
          count: g.count,
          spawnInterval: g.spawnInterval,
        }))
      );
    }
    managers.waveManager.setWaveOverrides(overrides.size > 0 ? overrides : null);
  }

  return { mapName, levelId };
}

/** Register all saved custom maps for level-select listing (does not touch wave overrides). */
export function syncCustomMapsToManagers(
  docs: CustomMapDocument[],
  managers: Pick<CustomMapManagers, 'mapManager' | 'levelManager'>
): void {
  for (const doc of docs) {
    const mapName = customMapKey(doc.id);
    const levelId = customLevelId(doc.id);

    managers.mapManager.registerMap(buildMapData(doc, mapName));
    managers.levelManager.registerLevel(buildLevelData(doc, levelId, mapName), { unlock: true });
  }
}

export function clearCustomMapRegistration(docId: string, managers: CustomMapManagers): void {
  managers.mapManager.unregisterMap(customMapKey(docId));
  managers.levelManager.unregisterLevel(customLevelId(docId));
  managers.waveManager.setWaveOverrides(null);
}
