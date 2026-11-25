/** Biome prefers dot access; TS noPropertyAccessFromIndexSignature requires brackets for Record. */
// biome-ignore-all lint/complexity/useLiteralKeys: Record<string, unknown> requires bracket access under tsc

import { GameConfig } from '../config/gameConfig';
import {
  CUSTOM_MAP_MIN_WAYPOINTS,
  CUSTOM_MAP_SCHEMA_VERSION,
  CUSTOM_MAP_SPAWN_MAX_X,
  type CustomMapDifficulty,
  type CustomMapDocument,
} from './types';

const VALID_DIFFICULTIES: CustomMapDifficulty[] = ['Easy', 'Normal', 'Hard', 'Nightmare'];
const VALID_ZOMBIE_TYPES = new Set(Object.values(GameConfig.ZOMBIE_TYPES));

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function validateZombieGroup(group: unknown, wave: number, index: number): string[] {
  const errors: string[] = [];
  const label = `wave ${wave} group ${index + 1}`;

  if (!isRecord(group)) {
    return [`${label}: must be an object`];
  }

  const type = asString(group['type']);
  const count = asNumber(group['count']);
  const spawnInterval = asNumber(group['spawnInterval']);

  if (!type || !VALID_ZOMBIE_TYPES.has(type)) {
    errors.push(`${label}: unknown zombie type "${String(group['type'])}"`);
  }
  if (count === undefined || count < 1) {
    errors.push(`${label}: count must be a positive number`);
  }
  if (spawnInterval === undefined || spawnInterval <= 0) {
    errors.push(`${label}: spawnInterval must be a positive number`);
  }

  return errors;
}

function validateMapSection(map: unknown, errors: string[]): void {
  if (!isRecord(map)) {
    errors.push('map is required');
    return;
  }

  const width = asNumber(map['width']);
  const height = asNumber(map['height']);
  const cellSize = asNumber(map['cellSize']);

  if (width === undefined || width <= 0) {
    errors.push('map.width must be a positive number');
  }
  if (height === undefined || height <= 0) {
    errors.push('map.height must be a positive number');
  }
  if (cellSize === undefined || cellSize <= 0) {
    errors.push('map.cellSize must be a positive number');
  }

  if (!Array.isArray(map['waypoints'])) {
    errors.push('map.waypoints must be an array');
    return;
  }

  const waypoints = map['waypoints'] as unknown[];
  if (waypoints.length < CUSTOM_MAP_MIN_WAYPOINTS) {
    errors.push(`Path needs at least ${CUSTOM_MAP_MIN_WAYPOINTS} waypoints`);
  }

  const boundW = width ?? 0;
  const boundH = height ?? 0;
  waypoints.forEach((wp, i) => {
    if (!isRecord(wp)) {
      errors.push(`Waypoint ${i + 1} must have numeric x,y`);
      return;
    }
    const x = asNumber(wp['x']);
    const y = asNumber(wp['y']);
    if (x === undefined || y === undefined) {
      errors.push(`Waypoint ${i + 1} must have numeric x,y`);
      return;
    }
    if (x < 0 || y < 0 || x > boundW || y > boundH) {
      errors.push(`Waypoint ${i + 1} is out of bounds`);
    }
  });

  const first = waypoints[0];
  if (isRecord(first)) {
    const firstX = asNumber(first['x']);
    if (firstX !== undefined && firstX > CUSTOM_MAP_SPAWN_MAX_X) {
      errors.push(
        `First waypoint must be near the left edge (x <= ${CUSTOM_MAP_SPAWN_MAX_X}) for spawn alignment`
      );
    }
  }
}

function validateLevelSection(level: unknown, errors: string[]): void {
  if (!isRecord(level)) {
    errors.push('level is required');
    return;
  }

  const startingMoney = asNumber(level['startingMoney']);
  const startingLives = asNumber(level['startingLives']);
  const difficulty = asString(level['difficulty']);

  if (startingMoney === undefined || startingMoney < 0) {
    errors.push('level.startingMoney must be a non-negative number');
  }
  if (startingLives === undefined || startingLives < 1) {
    errors.push('level.startingLives must be at least 1');
  }
  if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty as CustomMapDifficulty)) {
    errors.push('level.difficulty is invalid');
  }
}

function validateWavesSection(waves: unknown, errors: string[]): void {
  if (!Array.isArray(waves)) {
    errors.push('waves must be an array');
    return;
  }

  const seen = new Set<number>();
  waves.forEach((waveEntry, i) => {
    if (!isRecord(waveEntry)) {
      errors.push(`waves[${i}] must be an object`);
      return;
    }

    const waveNum = asNumber(waveEntry['wave']);
    if (waveNum === undefined || !Number.isInteger(waveNum) || waveNum < 1) {
      errors.push(`waves[${i}].wave must be a positive integer`);
      return;
    }

    if (seen.has(waveNum)) {
      errors.push(`Duplicate wave number ${waveNum}`);
    }
    seen.add(waveNum);

    const groups = waveEntry['groups'];
    if (!Array.isArray(groups) || groups.length === 0) {
      errors.push(`wave ${waveNum} must have at least one group`);
      return;
    }

    groups.forEach((group, gi) => {
      errors.push(...validateZombieGroup(group, waveNum, gi));
    });
  });
}

/**
 * Validate a custom map document. Accepts unknown JSON for import safety.
 */
export function validateCustomMap(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { valid: false, errors: ['Document must be an object'] };
  }

  if (input['version'] !== CUSTOM_MAP_SCHEMA_VERSION) {
    errors.push(`Unsupported schema version (expected ${CUSTOM_MAP_SCHEMA_VERSION})`);
  }

  const id = asString(input['id']);
  const name = asString(input['name']);
  if (!id || id.trim().length === 0) {
    errors.push('id is required');
  }
  if (!name || name.trim().length === 0) {
    errors.push('name is required');
  }
  if (typeof input['description'] !== 'string') {
    errors.push('description must be a string');
  }
  if (typeof input['updatedAt'] !== 'string') {
    errors.push('updatedAt must be a string');
  }

  validateMapSection(input['map'], errors);
  validateLevelSection(input['level'], errors);
  validateWavesSection(input['waves'], errors);

  return { valid: errors.length === 0, errors };
}

export function assertValidCustomMap(input: unknown): asserts input is CustomMapDocument {
  const result = validateCustomMap(input);
  if (!result.valid) {
    throw new Error(`Invalid custom map: ${result.errors.join('; ')}`);
  }
}
