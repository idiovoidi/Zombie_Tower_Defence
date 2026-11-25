import { BalanceConstants } from '../config/balanceConstants';
import type { Tower } from '../objects/Tower';
import type { Zombie } from '../objects/Zombie';
import type { ZombieSpatialQuery } from '../types/zombieSpatialQuery';
import { EventBus, GameEvents } from '../utils/EventBus';
import { OptimizationValidator } from '../utils/OptimizationValidator';
import { SpatialGrid } from '../utils/SpatialGrid';
import type { ProjectileManager } from './ProjectileManager';

export class TowerCombatManager implements ZombieSpatialQuery {
  private towers: Tower[] = [];
  private zombies: Zombie[] = [];
  private projectileManager: ProjectileManager | null = null;
  private zombieGrid: SpatialGrid<Zombie & { [key: string]: unknown }>;
  private eventBus: EventBus;

  /**
   * Apply damage to a zombie, emit DAMAGE_DEALT event, and return whether it was killed.
   * `source` is where the hit came from (the tower, or the previous zombie in an arc chain), so
   * the death animation knows its killer and direction.
   */
  private applyDamageToZombie(
    zombie: Zombie,
    tower: Tower,
    damage: number,
    source: { x: number; y: number } = tower.position
  ): boolean {
    const modifier = zombie.getDamageModifier(tower.getType());
    const modifiedDamage = damage * modifier;
    const healthBefore = zombie.getHealth();
    zombie.takeDamage(modifiedDamage, tower.getType(), source.x, source.y);
    const healthAfter = zombie.getHealth();
    const actualDamage = healthBefore - healthAfter;
    const killed = healthAfter <= 0;
    const overkill = killed ? Math.abs(healthAfter) : 0;

    this.eventBus.emit(GameEvents.DAMAGE_DEALT, {
      damage: actualDamage,
      towerType: tower.getType(),
      killed,
      overkill,
    });

    return killed;
  }

  constructor(worldWidth = 1024, worldHeight = 768, eventBus: EventBus = EventBus.getInstance()) {
    this.zombieGrid = new SpatialGrid<Zombie & { [key: string]: unknown }>(
      worldWidth,
      worldHeight,
      128
    );
    this.eventBus = eventBus;
  }

  /** Resize spatial grid when loading a map with different dimensions. */
  public setWorldSize(worldWidth: number, worldHeight: number): void {
    this.zombieGrid = new SpatialGrid<Zombie & { [key: string]: unknown }>(
      worldWidth,
      worldHeight,
      128
    );
    this.rebuildZombieGrid();
  }

  public setProjectileManager(projectileManager: ProjectileManager): void {
    this.projectileManager = projectileManager;
  }

  public setTowers(towers: Tower[]): void {
    this.towers = towers;
  }

  public setZombies(zombies: Zombie[]): void {
    this.zombies = zombies;
    // Rebuild whenever the zombie array is dirtied — heuristic skips left the grid stale
    this.rebuildZombieGrid();

    if (this.projectileManager) {
      this.projectileManager.setZombies(zombies);
    }
  }

  private rebuildZombieGrid(): void {
    this.zombieGrid.clear();
    for (const zombie of this.zombies) {
      if (zombie.parent && !zombie.getIsDying()) {
        this.zombieGrid.insert(zombie as Zombie & { [key: string]: unknown });
      }
    }
  }

  public queryZombiesInRadius(x: number, y: number, radius: number): Zombie[] {
    const radiusSq = radius * radius;
    const results: Zombie[] = [];
    for (const zombie of this.zombieGrid.queryRange(x, y, radius)) {
      if (!zombie.parent || zombie.getIsDying()) {
        continue;
      }
      const dx = zombie.position.x - x;
      const dy = zombie.position.y - y;
      if (dx * dx + dy * dy <= radiusSq) {
        results.push(zombie);
      }
    }
    return results;
  }

  public queryZombiesInRadiusWithDistance(
    x: number,
    y: number,
    radius: number
  ): Array<{ zombie: Zombie; distance: number }> {
    const radiusSq = radius * radius;
    const results: Array<{ zombie: Zombie; distance: number }> = [];
    for (const zombie of this.zombieGrid.queryRange(x, y, radius)) {
      if (!zombie.parent || zombie.getIsDying()) {
        continue;
      }
      const dx = zombie.position.x - x;
      const dy = zombie.position.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= radiusSq) {
        results.push({ zombie, distance: Math.sqrt(distSq) });
      }
    }
    return results;
  }

  public queryFirstZombieInRadius(x: number, y: number, radius: number): Zombie | null {
    return this.zombieGrid.queryFirst(
      x,
      y,
      radius,
      z => !!(z.parent && !z.getIsDying())
    ) as Zombie | null;
  }

  public getTowers(): Tower[] {
    return this.towers;
  }

  public update(deltaTime: number): void {
    const currentTime = performance.now();

    // OPTIMIZATION: Use batch update for spatial grid (much faster than individual updates)
    // Filter active zombies once instead of checking in loop
    const activeZombies = this.zombies.filter(z => z.parent && !z.getIsDying());
    if (activeZombies.length > 0) {
      // Type assertion: Zombie satisfies SpatialEntity requirements
      this.zombieGrid.batchUpdate(activeZombies as (Zombie & { [key: string]: unknown })[]);
    }

    for (const tower of this.towers) {
      // Update tower
      tower.update(deltaTime);

      // Find target using spatial grid (O(k) instead of O(n))
      const target = this.findTarget(tower);

      if (target) {
        // Rotate tower to face target
        tower.rotateTowards(target.position.x, target.position.y);

        // Shoot if ready
        if (tower.canShoot(currentTime)) {
          this.shootAtTarget(tower, target);
        }
      }
    }

    // Update projectiles
    if (this.projectileManager) {
      this.projectileManager.update(deltaTime);
    }
  }

  private findTarget(tower: Tower): Zombie | null {
    const towerPos = tower.position;
    const range = tower.getRange();

    // Measure target finding performance if validation is enabled
    if (OptimizationValidator.isEnabled() && this.zombies.length > 0) {
      OptimizationValidator.measureTargetFinding(this.zombies, towerPos.x, towerPos.y, range, () =>
        this.zombieGrid.queryClosest(
          towerPos.x,
          towerPos.y,
          range,
          zombie => zombie.parent !== null && !zombie.getIsDying()
        )
      );
    }

    // Use spatial grid to query only nearby zombies (O(k) instead of O(n))
    // This reduces from checking ALL zombies to only zombies in nearby grid cells
    const closest = this.zombieGrid.queryClosest(
      towerPos.x,
      towerPos.y,
      range,
      zombie => zombie.parent !== null && !zombie.getIsDying() // Filter out destroyed and dying zombies
    );

    return closest;
  }

  private createTargetedProjectile(
    tower: Tower,
    spawnPos: { x: number; y: number },
    targetPos: { x: number; y: number },
    damage: number,
    speed: number,
    projectileType: string,
    target: Zombie | null,
    includeUpgradeLevel = false
  ) {
    if (!this.projectileManager) {
      return null;
    }

    const projectile = this.projectileManager.createProjectile(
      spawnPos.x,
      spawnPos.y,
      targetPos.x,
      targetPos.y,
      damage,
      speed,
      projectileType,
      target
    );
    projectile.setTowerType(tower.getType());
    if (includeUpgradeLevel) {
      projectile.setUpgradeLevel(tower.getUpgradeLevel());
    }
    return projectile;
  }

  private shootAtTarget(tower: Tower, target: Zombie): void {
    tower.shoot();
    tower.showShootingEffect();
    this.applyTowerShootingVisuals(tower, target);

    if (!this.projectileManager) {
      return;
    }

    const spawnPos = tower.getProjectileSpawnPosition();
    this.fireProjectileForType(
      tower,
      target,
      spawnPos,
      tower.getDamage(),
      tower.getProjectileType()
    );
  }

  private applyTowerShootingVisuals(tower: Tower, target: Zombie): void {
    if (tower.getType() === 'Sniper' && tower.getUpgradeLevel() >= 3) {
      tower.setTarget(target.position.x, target.position.y);
      tower.setLaserSightEnabled(true);
    }

    if (tower.getType() === 'Sniper') {
      tower.spawnSniperHitEffects(target.position.x, target.position.y, false);
    }
  }

  private fireProjectileForType(
    tower: Tower,
    target: Zombie,
    spawnPos: { x: number; y: number },
    damage: number,
    projectileType: string
  ): void {
    if (projectileType === 'tesla') {
      this.createLightningArc(tower, spawnPos, target, damage);
      return;
    }

    if (projectileType === 'flame') {
      this.createTargetedProjectile(
        tower,
        spawnPos,
        target.position,
        damage,
        400,
        projectileType,
        target
      );
      return;
    }

    if (projectileType === 'grenade') {
      // Land at a random point inside the aim cone (circular scatter) — not dead-on the target
      const impactPos = this.getRandomConeImpact(spawnPos, target.position);
      this.createTargetedProjectile(
        tower,
        spawnPos,
        impactPos,
        damage,
        350,
        projectileType,
        null, // Damage comes only from the explosion at impact
        true
      );
      return;
    }

    if (projectileType === 'sludge') {
      this.createTargetedProjectile(
        tower,
        spawnPos,
        target.position,
        damage,
        300,
        projectileType,
        target,
        true
      );
      return;
    }

    if (projectileType === 'shotgun') {
      this.fireShotgunPellets(tower, target, spawnPos, damage);
      return;
    }

    const speed = projectileType === 'sniper' ? 1000 : 500;
    this.createTargetedProjectile(
      tower,
      spawnPos,
      target.position,
      damage,
      speed,
      projectileType,
      target
    );
  }

  /**
   * Pick a random impact point inside a circular scatter disk around the target,
   * constrained to the aim cone from the tower. Makes grenade blasts less consistent.
   */
  private getRandomConeImpact(
    spawnPos: { x: number; y: number },
    targetPos: { x: number; y: number }
  ): { x: number; y: number } {
    const dx = targetPos.x - spawnPos.x;
    const dy = targetPos.y - spawnPos.y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy) || 1;
    const baseAngle = Math.atan2(dy, dx);

    // ~±25° cone; scatter disk grows with range but stays meaningful vs explosion radius
    const coneHalfAngle = 0.44;
    const scatterRadius = Math.min(60, Math.max(35, distanceToTarget * 0.35));

    // Uniform random point in a disk centered on the target
    const r = Math.sqrt(Math.random()) * scatterRadius;
    const theta = Math.random() * Math.PI * 2;
    let impactX = targetPos.x + Math.cos(theta) * r;
    let impactY = targetPos.y + Math.sin(theta) * r;

    // Pull impacts that land outside the cone back onto the cone edge
    const impactDx = impactX - spawnPos.x;
    const impactDy = impactY - spawnPos.y;
    const impactDist = Math.sqrt(impactDx * impactDx + impactDy * impactDy) || 1;
    let angleDiff = Math.atan2(impactDy, impactDx) - baseAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) > coneHalfAngle) {
      const clampedAngle = baseAngle + Math.sign(angleDiff) * coneHalfAngle;
      impactX = spawnPos.x + Math.cos(clampedAngle) * impactDist;
      impactY = spawnPos.y + Math.sin(clampedAngle) * impactDist;
    }

    return { x: impactX, y: impactY };
  }

  private fireShotgunPellets(
    tower: Tower,
    target: Zombie,
    spawnPos: { x: number; y: number },
    damage: number
  ): void {
    const baseAngle = Math.atan2(target.position.y - spawnPos.y, target.position.x - spawnPos.x);
    const pelletCount = 7;
    const coneSpread = 0.6;
    const shotgunRange = tower.getRange();
    const damagePerPellet = damage / pelletCount;
    const upgradeLevel = tower.getUpgradeLevel();
    const baseKnockbackForce = 10 + (upgradeLevel - 1) * 2;
    const speed = 400;

    for (let i = 0; i < pelletCount; i++) {
      const offset = (i - (pelletCount - 1) / 2) * (coneSpread / (pelletCount - 1));
      const adjustedAngle = baseAngle + offset;
      const targetX = spawnPos.x + Math.cos(adjustedAngle) * shotgunRange;
      const targetY = spawnPos.y + Math.sin(adjustedAngle) * shotgunRange;

      const projectile = this.createTargetedProjectile(
        tower,
        spawnPos,
        { x: targetX, y: targetY },
        damagePerPellet,
        speed,
        'shotgun',
        null
      );

      if (projectile) {
        projectile.setKnockbackForce(baseKnockbackForce);
      }
    }
  }

  private createLightningArc(
    tower: Tower,
    spawnPos: { x: number; y: number },
    target: Zombie,
    damage: number
  ): void {
    // Calculate number of chain jumps based on upgrade level
    // Level 1: 1 target, Level 2: 2 targets, Level 3: 3 targets, etc.
    const maxJumps = tower.getUpgradeLevel();
    const chainRange = BalanceConstants.TESLA.CHAIN_RANGE;
    const damageReduction = BalanceConstants.TESLA.DAMAGE_PER_HOP;

    // Track hit zombies to avoid hitting the same zombie twice
    const hitZombies = new Set<Zombie>();

    // First target
    let currentDamage = damage;
    let currentSource = spawnPos;
    let currentTarget: Zombie | null = target;

    // Chain through multiple targets
    for (let jump = 0; jump < maxJumps && currentTarget; jump++) {
      this.applyDamageToZombie(currentTarget, tower, currentDamage, currentSource);

      // Mark this zombie as hit
      hitZombies.add(currentTarget);

      // Emit lightning arc event for CombatRenderer to handle visuals
      this.eventBus.emit(GameEvents.LIGHTNING_ARC, {
        from: { x: currentSource.x, y: currentSource.y },
        to: { x: currentTarget.position.x, y: currentTarget.position.y },
        isFirstArc: jump === 0,
        damage: currentDamage,
        chainIndex: jump,
      });

      // Find next target for chain
      if (jump < maxJumps - 1) {
        const nextTarget = this.findNearestZombie(
          currentTarget.position.x,
          currentTarget.position.y,
          chainRange,
          hitZombies
        );

        if (nextTarget) {
          currentSource = { x: currentTarget.position.x, y: currentTarget.position.y };
          currentTarget = nextTarget;
          currentDamage *= damageReduction; // Reduce damage for next jump
        } else {
          break; // No more targets in range
        }
      }
    }
  }

  /**
   * Find the nearest zombie within range that hasn't been hit yet
   */
  private findNearestZombie(
    x: number,
    y: number,
    maxRange: number,
    excludeZombies: Set<Zombie>
  ): Zombie | null {
    return this.zombieGrid.queryClosest(
      x,
      y,
      maxRange,
      z => !!(z.parent && !z.getIsDying() && !excludeZombies.has(z as Zombie))
    ) as Zombie | null;
  }
}
