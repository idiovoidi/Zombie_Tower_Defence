/**
 * Tower runtime dependencies configured once at the composition root.
 * Towers read these instead of calling process-wide getInstance() in constructors.
 */

import type { TowerManager } from '../managers/TowerManager';
import type { EventBus } from '../utils/EventBus';
import type { TowerRangeVisualizer } from '../utils/TowerRangeVisualizer';

export interface TowerRuntimeDeps {
  towerManager: TowerManager;
  eventBus: EventBus;
  rangeVisualizer: TowerRangeVisualizer;
}

let runtime: TowerRuntimeDeps | null = null;

export function configureTowerRuntime(deps: TowerRuntimeDeps): void {
  runtime = deps;
}

export function getTowerRuntime(): TowerRuntimeDeps {
  if (!runtime) {
    throw new Error(
      'Tower runtime not configured. Call configureTowerRuntime() from the composition root before creating towers.'
    );
  }
  return runtime;
}
