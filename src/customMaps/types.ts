import type { Waypoint } from '../managers/PathfindingManager';
import type { ZombieGroup } from '../managers/WaveManager';

export const CUSTOM_MAP_SCHEMA_VERSION = 1;
export const CUSTOM_MAP_DEFAULT_CELL_SIZE = 32;
export const CUSTOM_MAP_DEFAULT_WIDTH = 1024;
export const CUSTOM_MAP_DEFAULT_HEIGHT = 768;
export const CUSTOM_MAP_MIN_WAYPOINTS = 3;
/** First waypoint must be within this X to align with the fixed graveyard spawn. */
export const CUSTOM_MAP_SPAWN_MAX_X = 96;

export type CustomMapDifficulty = 'Easy' | 'Normal' | 'Hard' | 'Nightmare';

export interface CustomMapPayload {
  width: number;
  height: number;
  cellSize: number;
  waypoints: Waypoint[];
}

export interface CustomLevelPayload {
  startingMoney: number;
  startingLives: number;
  difficulty: CustomMapDifficulty;
}

export interface CustomWaveOverride {
  wave: number;
  groups: ZombieGroup[];
}

/**
 * Versioned custom map document — used for save, export, import, and play.
 * Future community APIs can accept the same JSON shape.
 */
export interface CustomMapDocument {
  version: typeof CUSTOM_MAP_SCHEMA_VERSION;
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  map: CustomMapPayload;
  level: CustomLevelPayload;
  waves: CustomWaveOverride[];
}

export function createEmptyCustomMapDocument(
  partial?: Partial<CustomMapDocument>
): CustomMapDocument {
  const id = partial?.id ?? `custom_${Date.now().toString(36)}`;
  return {
    version: CUSTOM_MAP_SCHEMA_VERSION,
    id,
    name: partial?.name ?? 'Untitled Map',
    description: partial?.description ?? '',
    updatedAt: partial?.updatedAt ?? new Date().toISOString(),
    map: partial?.map ?? {
      width: CUSTOM_MAP_DEFAULT_WIDTH,
      height: CUSTOM_MAP_DEFAULT_HEIGHT,
      cellSize: CUSTOM_MAP_DEFAULT_CELL_SIZE,
      waypoints: [],
    },
    level: partial?.level ?? {
      startingMoney: 1000,
      startingLives: 100,
      difficulty: 'Normal',
    },
    waves: partial?.waves ?? [],
  };
}

export function customMapKey(id: string): string {
  return `custom_${id}`;
}

export function customLevelId(id: string): string {
  return `custom_${id}`;
}
