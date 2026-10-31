import type { Zombie } from '@objects/Zombie';
import type { ZombieSpatialQuery } from '../../types/zombieSpatialQuery';
import { ObjectPool } from '@utils/ObjectPool';
import { type Container, type Container as PixiContainer, Rectangle } from 'pixi.js';
import { BulletTrail } from './BulletTrail';
import { BurningGroundEffect } from './BurningGroundEffect';
import { ImpactFlash } from './ImpactFlash';
import { MuzzleFlashLight } from './MuzzleFlashLight';
import { ScopeGlint } from './ScopeGlint';
import { buildEffectStats, type EffectLimits, type EffectStats } from './EffectStats';
import { ShellCasing } from './ShellCasing';
import { TransientEffects } from './TransientEffects';

export type { EffectLimits, EffectStats } from './EffectStats';

/**
 * Effect Manager
 * Manages temporary visual effects like shell casings, muzzle flashes, and sniper effects
 */
export class EffectManager {
  private container: PixiContainer;
  private transient: TransientEffects;
  private shellCasings: ShellCasing[] = [];
  private muzzleFlashes: MuzzleFlashLight[] = [];
  private bulletTrails: BulletTrail[] = [];
  private impactFlashes: ImpactFlash[] = [];
  private scopeGlints: ScopeGlint[] = [];
  private burningGroundEffects: BurningGroundEffect[] = [];

  // Zombie tracking for fire pool damage
  private zombies: Zombie[] = [];
  private spatialQuery: ZombieSpatialQuery | null = null;

  // Configurable limits for each effect type
  private limits: EffectLimits = {
    maxShellCasings: 50,
    maxMuzzleFlashes: 30,
    maxBulletTrails: 20,
    maxImpactFlashes: 30,
    maxScopeGlints: 10,
    maxBurningGroundEffects: 20,
  };

  // Object pools for effect reuse
  private poolingEnabled = true;
  private shellCasingPool: ObjectPool<ShellCasing>;
  private muzzleFlashPool: ObjectPool<MuzzleFlashLight>;
  private bulletTrailPool: ObjectPool<BulletTrail>;
  private impactFlashPool: ObjectPool<ImpactFlash>;
  private scopeGlintPool: ObjectPool<ScopeGlint>;
  private burningGroundPool: ObjectPool<BurningGroundEffect>;

  constructor(container: PixiContainer) {
    this.container = container;
    this.transient = new TransientEffects(container);

    // Initialize zombie tracking for fire effects

    // Enable culling for off-screen effects (per pixijs-performance skill)
    container.cullable = true;
    container.cullArea = new Rectangle(0, 0, 1280, 768);

    // Initialize object pools
    this.shellCasingPool = new ObjectPool(
      () => new ShellCasing(0, 0, 0),
      obj => obj.reset(0, 0, 0),
      this.limits.maxShellCasings
    );

    this.muzzleFlashPool = new ObjectPool(
      () => new MuzzleFlashLight(0, 0, 30),
      obj => obj.reset(0, 0, 30),
      this.limits.maxMuzzleFlashes
    );

    this.bulletTrailPool = new ObjectPool(
      () => new BulletTrail(0, 0, 0, 0),
      obj => obj.reset(0, 0, 0, 0),
      this.limits.maxBulletTrails
    );

    this.impactFlashPool = new ObjectPool(
      () => new ImpactFlash(0, 0, false),
      obj => obj.reset(0, 0, false),
      this.limits.maxImpactFlashes
    );

    this.scopeGlintPool = new ObjectPool(
      () => new ScopeGlint(0, 0),
      obj => obj.reset(0, 0),
      this.limits.maxScopeGlints
    );

    this.burningGroundPool = new ObjectPool(
      () => new BurningGroundEffect(0, 0, 1),
      obj => obj.reset(0, 0, 1),
      this.limits.maxBurningGroundEffects
    );
  }

  /**
   * Get the container for adding external effects
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * Set maximum counts for each effect type
   * @param limits Configuration object with limits for each effect type
   */
  public setLimits(limits: Partial<EffectLimits>): void {
    this.limits = { ...this.limits, ...limits };
  }

  /**
   * Enable or disable object pooling
   * @param enabled Whether pooling should be enabled
   */
  public enablePooling(enabled: boolean): void {
    this.poolingEnabled = enabled;
  }

  /**
   * Spawn a shell casing
   */
  public spawnShellCasing(x: number, y: number, ejectAngle = 0): void {
    // Remove oldest if at limit
    if (this.shellCasings.length >= this.limits.maxShellCasings) {
      const oldest = this.shellCasings.shift();
      if (oldest) {
        this.container.removeChild(oldest);
        if (this.poolingEnabled) {
          this.shellCasingPool.release(oldest);
        } else {
          oldest.destroy({ children: true });
        }
      }
    }

    // Acquire from pool or create new
    const casing = this.poolingEnabled
      ? this.shellCasingPool.acquire()
      : new ShellCasing(x, y, ejectAngle);

    // Reset position and properties if from pool
    if (this.poolingEnabled) {
      casing.reset(x, y, ejectAngle);
    }

    this.shellCasings.push(casing);
    this.container.addChild(casing);
  }

  /**
   * Spawn a muzzle flash light effect
   */
  public spawnMuzzleFlashLight(x: number, y: number, radius = 30): void {
    // Remove oldest if at limit
    if (this.muzzleFlashes.length >= this.limits.maxMuzzleFlashes) {
      const oldest = this.muzzleFlashes.shift();
      if (oldest) {
        this.container.removeChild(oldest);
        if (this.poolingEnabled) {
          this.muzzleFlashPool.release(oldest);
        } else {
          oldest.destroy({ children: true });
        }
      }
    }

    // Acquire from pool or create new
    const flash = this.poolingEnabled
      ? this.muzzleFlashPool.acquire()
      : new MuzzleFlashLight(x, y, radius);

    // Reset position and properties if from pool
    if (this.poolingEnabled) {
      flash.reset(x, y, radius);
    }

    this.muzzleFlashes.push(flash);
    this.container.addChild(flash);

    // Add reflection to nearby shell casings
    this.addReflectionToNearbyCasings(x, y, radius);
  }

  /**
   * Add light reflection to shell casings near the flash
   */
  private addReflectionToNearbyCasings(x: number, y: number, radius: number): void {
    for (const casing of this.shellCasings) {
      const dx = casing.x - x;
      const dy = casing.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius) {
        casing.addReflection();
      }
    }
  }

  /**
   * Spawn a bullet trail (Sniper)
   */
  public spawnBulletTrail(startX: number, startY: number, endX: number, endY: number): void {
    // Remove oldest if at limit
    if (this.bulletTrails.length >= this.limits.maxBulletTrails) {
      const oldest = this.bulletTrails.shift();
      if (oldest) {
        this.container.removeChild(oldest);
        if (this.poolingEnabled) {
          this.bulletTrailPool.release(oldest);
        } else {
          oldest.destroy({ children: true });
        }
      }
    }

    // Acquire from pool or create new
    const trail = this.poolingEnabled
      ? this.bulletTrailPool.acquire()
      : new BulletTrail(startX, startY, endX, endY);

    // Reset position and properties if from pool
    if (this.poolingEnabled) {
      trail.reset(startX, startY, endX, endY);
    }

    this.bulletTrails.push(trail);
    this.container.addChild(trail);
  }

  /**
   * Spawn an impact flash (Sniper)
   */
  public spawnImpactFlash(x: number, y: number, isHeadshot = false): void {
    // Remove oldest if at limit
    if (this.impactFlashes.length >= this.limits.maxImpactFlashes) {
      const oldest = this.impactFlashes.shift();
      if (oldest) {
        this.container.removeChild(oldest);
        if (this.poolingEnabled) {
          this.impactFlashPool.release(oldest);
        } else {
          oldest.destroy({ children: true });
        }
      }
    }

    // Acquire from pool or create new
    const flash = this.poolingEnabled
      ? this.impactFlashPool.acquire()
      : new ImpactFlash(x, y, isHeadshot);

    // Reset position and properties if from pool
    if (this.poolingEnabled) {
      flash.reset(x, y, isHeadshot);
    }

    this.impactFlashes.push(flash);
    this.container.addChild(flash);
  }

  /**
   * Spawn a scope glint (Sniper)
   */
  public spawnScopeGlint(x: number, y: number): void {
    // Remove oldest if at limit
    if (this.scopeGlints.length >= this.limits.maxScopeGlints) {
      const oldest = this.scopeGlints.shift();
      if (oldest) {
        this.container.removeChild(oldest);
        if (this.poolingEnabled) {
          this.scopeGlintPool.release(oldest);
        } else {
          oldest.destroy({ children: true });
        }
      }
    }

    // Acquire from pool or create new
    const glint = this.poolingEnabled ? this.scopeGlintPool.acquire() : new ScopeGlint(x, y);

    // Reset position and properties if from pool
    if (this.poolingEnabled) {
      glint.reset(x, y);
    }

    this.scopeGlints.push(glint);
    this.container.addChild(glint);
  }

  /**
   * Spawn a burning ground effect (Flame tower fire pool)
   */
  public spawnBurningGround(x: number, y: number, upgradeLevel = 1): void {
    // Remove oldest if at limit
    if (this.burningGroundEffects.length >= this.limits.maxBurningGroundEffects) {
      const oldest = this.burningGroundEffects.shift();
      if (oldest) {
        this.container.removeChild(oldest);
        if (this.poolingEnabled) {
          this.burningGroundPool.release(oldest);
        } else {
          oldest.destroy({ children: true });
        }
      }
    }

    // Acquire from pool or create new
    const effect = this.poolingEnabled
      ? this.burningGroundPool.acquire()
      : new BurningGroundEffect(x, y, upgradeLevel);

    // Reset position and properties if from pool
    if (this.poolingEnabled) {
      effect.reset(x, y, upgradeLevel);
    }

    this.burningGroundEffects.push(effect);
    this.container.addChild(effect);
  }

  /** Spawn a lightning arc (Tesla tower) */
  public spawnLightningArc(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    isPrimary = true
  ): void {
    this.transient.spawnLightningArc(startX, startY, endX, endY, isPrimary);
  }

  /** Spawn a flame stream (Flame tower) */
  public spawnFlameStream(startX: number, startY: number, endX: number, endY: number): void {
    this.transient.spawnFlameStream(startX, startY, endX, endY);
  }

  /** Spawn electric particle effects on a zombie */
  public spawnElectricParticles(zombie: Zombie, isPrimary: boolean): void {
    this.transient.spawnElectricParticles(zombie, isPrimary);
  }

  /** Spawn a damage flash on a target container */
  public spawnDamageFlash(target: PixiContainer, radius = 30): void {
    this.transient.spawnDamageFlash(target, radius);
  }

  /**
   * Update a pooled effect collection, removing expired entries.
   */
  private tickEffectCollection<T extends Container & { update(deltaTime: number): boolean }>(
    collection: T[],
    pool: ObjectPool<T>,
    destroyItem: (item: T) => void,
    deltaTime: number
  ): void {
    for (let i = collection.length - 1; i >= 0; i--) {
      const item = collection[i];
      if (item.update(deltaTime)) {
        continue;
      }

      this.container.removeChild(item);
      if (this.poolingEnabled) {
        pool.release(item);
      } else {
        destroyItem(item);
      }
      collection.splice(i, 1);
    }
  }

  /**
   * Remove and release or destroy all items in a pooled effect collection.
   */
  private clearEffectCollection<T extends Container>(
    collection: T[],
    pool: ObjectPool<T>,
    destroyItem: (item: T) => void
  ): void {
    for (const item of collection) {
      this.container.removeChild(item);
      if (this.poolingEnabled) {
        pool.release(item);
      } else {
        destroyItem(item);
      }
    }
    collection.length = 0;
  }

  /**
   * Update all effects
   */
  public update(deltaTime: number): void {
    this.tickEffectCollection(
      this.shellCasings,
      this.shellCasingPool,
      item => item.destroy(),
      deltaTime
    );
    this.tickEffectCollection(
      this.muzzleFlashes,
      this.muzzleFlashPool,
      item => item.destroy(),
      deltaTime
    );
    this.tickEffectCollection(
      this.bulletTrails,
      this.bulletTrailPool,
      item => item.destroy({ children: true }),
      deltaTime
    );
    this.tickEffectCollection(
      this.impactFlashes,
      this.impactFlashPool,
      item => item.destroy({ children: true }),
      deltaTime
    );
    this.tickEffectCollection(
      this.scopeGlints,
      this.scopeGlintPool,
      item => item.destroy({ children: true }),
      deltaTime
    );

    for (let i = this.burningGroundEffects.length - 1; i >= 0; i--) {
      const effect = this.burningGroundEffects[i];
      const isAlive = effect.update(deltaTime);
      this.checkZombiesInFire(effect, deltaTime);

      if (!isAlive) {
        this.container.removeChild(effect);
        if (this.poolingEnabled) {
          this.burningGroundPool.release(effect);
        } else {
          effect.destroy({ children: true });
        }
        this.burningGroundEffects.splice(i, 1);
      }
    }
  }

  /**
   * Set zombie list for fire pool damage detection (fallback when no spatial query)
   */
  public setZombies(zombies: Zombie[]): void {
    this.zombies = zombies;
  }

  /**
   * Prefer spatial queries for fire DoT instead of scanning all zombies
   */
  public setSpatialQuery(query: ZombieSpatialQuery | null): void {
    this.spatialQuery = query;
  }

  /**
   * Check which zombies are in the fire pool and update their fire exposure
   */
  private checkZombiesInFire(effect: BurningGroundEffect, deltaTime: number): void {
    const fireX = effect.position.x;
    const fireY = effect.position.y;
    // Base pool radius is 25, increases with upgrade level
    const poolRadius = 28; // Slightly larger to match visual radius

    const candidates = this.spatialQuery
      ? this.spatialQuery.queryZombiesInRadius(fireX, fireY, poolRadius)
      : this.zombies;

    for (const zombie of candidates) {
      if (!zombie.parent || zombie.getIsDying()) {
        continue;
      }

      if (this.spatialQuery) {
        // Spatial query already distance-filtered
        zombie.updateFireExposure(deltaTime);
        continue;
      }

      const dx = zombie.position.x - fireX;
      const dy = zombie.position.y - fireY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= poolRadius) {
        zombie.updateFireExposure(deltaTime);
      }
    }
  }

  /**
   * Clear all effects
   */
  public clear(): void {
    this.clearEffectCollection(this.shellCasings, this.shellCasingPool, item => item.destroy());
    this.clearEffectCollection(this.muzzleFlashes, this.muzzleFlashPool, item => item.destroy());
    this.clearEffectCollection(this.bulletTrails, this.bulletTrailPool, item => item.destroy());
    this.clearEffectCollection(this.impactFlashes, this.impactFlashPool, item => item.destroy());
    this.clearEffectCollection(this.scopeGlints, this.scopeGlintPool, item => item.destroy());
    this.clearEffectCollection(this.burningGroundEffects, this.burningGroundPool, item =>
      item.destroy()
    );
  }

  /**
   * Get current effect counts (for debugging)
   */
  public getEffectCounts(): {
    casings: number;
    flashes: number;
    trails: number;
    impacts: number;
    glints: number;
    burningGround: number;
  } {
    return {
      casings: this.shellCasings.length,
      flashes: this.muzzleFlashes.length,
      trails: this.bulletTrails.length,
      impacts: this.impactFlashes.length,
      glints: this.scopeGlints.length,
      burningGround: this.burningGroundEffects.length,
    };
  }

  /**
   * Get comprehensive effect statistics including pool usage
   * @returns Statistics about current effect counts, limits, and pool reuse rates
   */
  public getStats(): EffectStats {
    return buildEffectStats(
      {
        shellCasings: this.shellCasings.length,
        muzzleFlashes: this.muzzleFlashes.length,
        bulletTrails: this.bulletTrails.length,
        impactFlashes: this.impactFlashes.length,
        scopeGlints: this.scopeGlints.length,
        burningGroundEffects: this.burningGroundEffects.length,
      },
      this.limits,
      {
        shellCasings: this.shellCasingPool.getStats(),
        muzzleFlashes: this.muzzleFlashPool.getStats(),
        bulletTrails: this.bulletTrailPool.getStats(),
        impactFlashes: this.impactFlashPool.getStats(),
        scopeGlints: this.scopeGlintPool.getStats(),
        burningGroundEffects: this.burningGroundPool.getStats(),
      }
    );
  }

  /**
   * Log warnings if effect counts are high
   * Should be called periodically (e.g., once per second) to avoid spam
   */
  public checkAndLogWarnings(): void {
    const stats = this.getStats();

    if (stats.warnings.length > 0) {
      for (const _warning of stats.warnings) {
        // Warning logged
      }
    }
  }

  /**
   * Clean up
   */
  public destroy(): void {
    this.clear();

    // Clear pools
    if (this.poolingEnabled) {
      this.shellCasingPool.clear();
      this.muzzleFlashPool.clear();
      this.bulletTrailPool.clear();
      this.impactFlashPool.clear();
      this.scopeGlintPool.clear();
      this.burningGroundPool.clear();
    }
  }
}
