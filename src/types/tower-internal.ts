/**
 * Internal type definitions for Tower class
 * These interfaces define the structure of dynamically added properties
 */

import type { Graphics } from 'pixi.js';

/**
 * Interface for shell casing effect objects
 */
interface ShellCasing {
  destroyed: boolean;
  parent: unknown;
  destroy(): void;
}

/**
 * Interface for muzzle flash effect objects
 */
interface MuzzleFlash {
  destroyed: boolean;
  parent: unknown;
  destroy(): void;
}

/**
 * Extended Tower interface with dynamic properties
 * These properties are added at runtime for visual effects
 */
export interface TowerEffects {
  selectionHighlight?: Graphics;
  pulseInterval?: NodeJS.Timeout;
  shellCasings?: ShellCasing[];
  muzzleFlashes?: MuzzleFlash[];
}
