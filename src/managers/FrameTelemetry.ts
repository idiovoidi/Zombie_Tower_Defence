import type { EffectManager } from '../renderers/effects/EffectManager';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { ResourceCleanupManager } from '../utils/ResourceCleanupManager';
import type { ProjectileManager } from './ProjectileManager';
import type { TowerPlacementManager } from './TowerPlacementManager';
import type { ZombieManager } from './ZombieManager';

export interface FrameTelemetrySources {
  zombieManager: ZombieManager;
  towerPlacementManager: TowerPlacementManager;
  projectileManager: ProjectileManager;
  effectManager: EffectManager;
}

/** Report per-frame entity counts and memory to PerformanceMonitor (only while playing). */
export function trackFrameTelemetry(sources: FrameTelemetrySources): void {
  const { zombieManager, towerPlacementManager, projectileManager, effectManager } = sources;

  PerformanceMonitor.trackEntityCount('zombies', zombieManager.getZombies().length);
  PerformanceMonitor.trackEntityCount('towers', towerPlacementManager.getPlacedTowers().length);
  PerformanceMonitor.trackEntityCount('projectiles', projectileManager.getProjectiles().length);

  const effectCounts = effectManager.getEffectCounts();
  PerformanceMonitor.trackEntityCount(
    'effects',
    effectCounts.casings +
      effectCounts.flashes +
      effectCounts.trails +
      effectCounts.impacts +
      effectCounts.glints
  );

  const particleStats = zombieManager.getBloodParticleSystem().getStats();
  PerformanceMonitor.trackEntityCount('particles', particleStats.activeParticles);

  PerformanceMonitor.trackEntityCount('corpses', zombieManager.getCorpseManager().getCorpseCount());

  const resourceState = ResourceCleanupManager.getState();
  PerformanceMonitor.trackEntityCount('persistentEffects', resourceState.persistentEffects);

  PerformanceMonitor.checkEntityThresholds();
  PerformanceMonitor.trackMemoryUsage();
}
