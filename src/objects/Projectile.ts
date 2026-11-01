import { Container, Graphics } from 'pixi.js';
import { LIGHTING } from '../config/lightingConstants';
import { bulletGlowScale } from '../renderers/lighting/glowMath';
import { ExplosionEffect } from '../renderers/effects/ExplosionEffect';
import { ImpactEffect } from '../renderers/effects/ImpactEffect';
import { SludgePoolEffect } from '../renderers/effects/SludgePoolEffect';
import type { ZombieSpatialQuery } from '../types/zombieSpatialQuery';
import { EventBus, GameEvents } from '../utils/EventBus';
import type { Zombie } from './Zombie';

export class Projectile extends Container {
  private visual: Graphics;
  /** Tight halo hugging the projectile (pooled with it; recoloured per type in createVisual). */
  private glow: Graphics;
  private glowTimeSec = 0;
  private speed: number;
  private damage: number;
  private target: Zombie | null;
  private targetX: number;
  private targetY: number;
  private isActive = true;
  private projectileType: string;
  private towerType = 'unknown';
  private zombies: Zombie[] = [];
  private spatialQuery: ZombieSpatialQuery | null = null;

  // Arc trajectory for grenades
  private startX: number;
  private startY: number;
  private travelProgress = 0;
  private arcHeight = 80; // Height of the arc
  private upgradeLevel = 1; // Tower upgrade level for scaling effects
  private isHitEffectActive = false;
  private knockbackForce = 0; // Knockback force in pixels (0 = no knockback)

  constructor(
    x = 0,
    y = 0,
    targetX = 0,
    targetY = 0,
    damage = 0,
    speed = 0,
    projectileType = 'bullet',
    target: Zombie | null = null
  ) {
    super();
    this.startX = x;
    this.startY = y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.damage = damage;
    this.speed = speed;
    this.projectileType = projectileType;
    this.target = target;

    // Glow sits under the projectile body so the bullet itself stays crisp
    this.glow = new Graphics();
    this.addChild(this.glow);
    this.visual = new Graphics();
    this.addChild(this.visual);

    this.init(x, y, targetX, targetY, damage, speed, projectileType, target);
  }

  public init(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    damage: number,
    speed: number,
    projectileType = 'bullet',
    target: Zombie | null = null
  ): void {
    this.position.set(x, y);
    this.startX = x;
    this.startY = y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.damage = damage;
    this.speed = speed;
    this.projectileType = projectileType;
    this.target = target;
    this.isActive = true;
    this.isHitEffectActive = false;
    this.travelProgress = 0;
    this.rotation = 0;
    this.visual.alpha = 1;
    this.visual.scale.set(1);
    this.knockbackForce = 0; // Reset knockback
    this.createVisual();
  }

  private createVisual(): void {
    this.visual.clear();
    this.drawGlow();

    switch (this.projectileType) {
      case 'bullet':
        // Small yellow circle
        this.visual.circle(0, 0, 3).fill(0xffff00);
        break;
      case 'sniper':
        // Thin red line
        this.visual.circle(0, 0, 2).fill(0xff0000);
        break;
      case 'shotgun':
        // Multiple small pellets
        this.visual.circle(0, 0, 2).fill(0xffa500);
        break;
      case 'flame':
        // Fireball with glow
        this.visual.circle(0, 0, 8).fill({ color: 0xff6600, alpha: 0.4 }); // Outer glow
        this.visual.circle(0, 0, 6).fill({ color: 0xff8800, alpha: 0.6 }); // Middle
        this.visual.circle(0, 0, 4).fill({ color: 0xffaa00, alpha: 0.8 }); // Inner
        this.visual.circle(0, 0, 2).fill({ color: 0xffff00, alpha: 1 }); // Hot core
        break;
      case 'tesla':
        // Blue electric bolt
        this.visual.circle(0, 0, 3).fill(0x00bfff);
        this.visual.circle(0, 0, 5).stroke({ width: 1, color: 0x7fffd4, alpha: 0.5 });
        break;
      case 'grenade':
        // Olive drab grenade with pin
        this.visual.circle(0, 0, 4).fill(0x6b8e23);
        this.visual.circle(0, 0, 3).fill(0x556b2f);
        // Pin/lever
        this.visual.rect(-1, -5, 2, 3).fill(0x8b8b8b);
        this.visual.circle(0, -6, 1.5).fill(0xff0000);
        break;
      case 'sludge':
        // Toxic barrel
        this.visual.rect(-3, -4, 6, 8).fill(0x228b22);
        this.visual.rect(-3, -2, 6, 2).fill(0x1a6b1a); // Band
        // Biohazard symbol
        this.visual.circle(0, 0, 2).fill({ color: 0x00ff00, alpha: 0.8 });
        // Toxic glow
        this.visual.circle(0, 0, 4).fill({ color: 0x32cd32, alpha: 0.4 });
        break;
      default:
        this.visual.circle(0, 0, 3).fill(0xffffff);
    }
  }

  /** Subtle coloured halo (about 6px radius) so projectiles read as hot/active. */
  private drawGlow(): void {
    const g = LIGHTING.BULLET_GLOW;
    this.glow.clear();
    this.glow.scale.set(1);
    this.glowTimeSec = 0;
    if (g.SKIP_TYPES.includes(this.projectileType)) {
      this.glow.visible = false;
      return;
    }
    const color = g.COLORS[this.projectileType] ?? g.DEFAULT_COLOR;
    this.glow.circle(0, 0, g.RADIUS).fill({ color, alpha: g.ALPHA * 0.55 });
    this.glow.circle(0, 0, g.RADIUS * 0.6).fill({ color, alpha: g.ALPHA * 0.7 });
    this.glow.visible = true;
  }

  public setZombies(zombies: Zombie[]): void {
    this.zombies = zombies;
  }

  public setSpatialQuery(query: ZombieSpatialQuery | null): void {
    this.spatialQuery = query;
  }

  /**
   * Get all active zombies within the specified radius.
   * Prefers spatial grid when available.
   */
  private getZombiesInRadius(radius: number): Array<{ zombie: Zombie; distance: number }> {
    if (this.spatialQuery) {
      return this.spatialQuery.queryZombiesInRadiusWithDistance(
        this.position.x,
        this.position.y,
        radius
      );
    }

    const result: Array<{ zombie: Zombie; distance: number }> = [];
    for (const zombie of this.zombies) {
      if (!zombie.parent) {
        continue;
      }

      const dx = zombie.position.x - this.position.x;
      const dy = zombie.position.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radius) {
        result.push({ zombie, distance });
      }
    }
    return result;
  }

  /**
   * Find first zombie within the specified radius of this projectile.
   */
  private findZombieInRadius(radius: number): Zombie | null {
    if (this.spatialQuery) {
      return this.spatialQuery.queryFirstZombieInRadius(this.position.x, this.position.y, radius);
    }

    const zombiesInRadius = this.getZombiesInRadius(radius);
    return zombiesInRadius.length > 0 ? zombiesInRadius[0].zombie : null;
  }

  public update(deltaTime: number): void {
    if (!this.isActive) {
      return;
    }

    if (this.glow.visible) {
      this.glowTimeSec += deltaTime / 1000;
      this.glow.scale.set(
        bulletGlowScale(
          this.glowTimeSec,
          LIGHTING.BULLET_GLOW.PULSE_AMOUNT,
          LIGHTING.BULLET_GLOW.PULSE_SPEED
        )
      );
    }

    // Update target position if tracking a zombie (only if not dying)
    if (this.target?.parent && !this.target.getIsDying()) {
      this.targetX = this.target.position.x;
      this.targetY = this.target.position.y;
    }

    // Check for collision with any zombie if no specific target (for shotgun pellets)
    if (!this.target) {
      const hitZombie = this.checkZombieCollision();
      if (hitZombie) {
        this.target = hitZombie;
        this.onHitTarget();
        return;
      }
    }

    // Grenade and Sludge use arc trajectory
    if (this.projectileType === 'grenade' || this.projectileType === 'sludge') {
      this.updateArcTrajectory(deltaTime);
      return;
    }

    // Calculate direction to target
    const dx = this.targetX - this.position.x;
    const dy = this.targetY - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if reached target
    if (distance < 10) {
      this.onHitTarget();
      return;
    }

    // Move towards target
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;

    const moveDistance = this.speed * (deltaTime / 1000);
    this.position.x += normalizedDx * moveDistance;
    this.position.y += normalizedDy * moveDistance;

    // Rotate projectile to face direction of travel
    this.rotation = Math.atan2(dy, dx);
  }

  private updateArcTrajectory(deltaTime: number): void {
    // Calculate total distance
    const totalDx = this.targetX - this.startX;
    const totalDy = this.targetY - this.startY;
    const totalDistance = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

    // Update progress based on speed
    const progressIncrement = (this.speed * (deltaTime / 1000)) / totalDistance;
    this.travelProgress += progressIncrement;

    // Check if reached target
    if (this.travelProgress >= 1) {
      this.position.x = this.targetX;
      this.position.y = this.targetY;
      this.onHitTarget();
      return;
    }

    // Calculate position along arc
    // Linear interpolation for x and y
    const linearX = this.startX + totalDx * this.travelProgress;
    const linearY = this.startY + totalDy * this.travelProgress;

    // Parabolic arc for height (peaks at 0.5 progress)
    const arcProgress = Math.sin(this.travelProgress * Math.PI);
    const heightOffset = -this.arcHeight * arcProgress;

    this.position.x = linearX;
    this.position.y = linearY + heightOffset;

    // Rotate grenade to tumble through the air
    this.rotation += deltaTime * 0.01;
  }

  private checkZombieCollision(): Zombie | null {
    return this.findZombieInRadius(15); // 15px collision detection radius
  }

  private onHitTarget(): void {
    this.isActive = false;
    this.glow.visible = false;

    // Grenade/sludge deal damage via area effects at impact, not a direct hit
    const isAreaProjectile = this.projectileType === 'grenade' || this.projectileType === 'sludge';
    if (this.target?.parent && !this.target.getIsDying() && !isAreaProjectile) {
      this.applyDamageToZombie(this.target, this.damage);
    }

    // Create hit effect based on projectile type
    this.createHitEffect();
  }

  public setTowerType(type: string): void {
    this.towerType = type;
  }

  public setUpgradeLevel(level: number): void {
    this.upgradeLevel = level;
  }

  /**
   * Set the knockback force for this projectile
   * @param force - Knockback distance in pixels (0 = no knockback)
   */
  public setKnockbackForce(force: number): void {
    this.knockbackForce = force;
  }

  /**
   * Get the current knockback force
   */
  public getKnockbackForce(): number {
    return this.knockbackForce;
  }

  /**
   * Apply damage to a zombie and emit tracking events.
   * @param zombie - Target zombie
   * @param damageAmount - Base damage to apply
   * @param damageMultiplier - Optional multiplier (e.g., for splash damage falloff)
   */
  private applyDamageToZombie(zombie: Zombie, damageAmount: number, damageMultiplier = 1): void {
    // Guard against zombies that have been removed from the scene
    if (!zombie.parent) {
      return;
    }

    // Apply damage modifier based on zombie type
    const modifier = zombie.getDamageModifier(this.towerType);
    const modifiedDamage = damageAmount * damageMultiplier * modifier;

    const healthBefore = zombie.getHealth();

    // Apply knockback if this projectile has knockback force and zombie isn't dying
    if (this.knockbackForce > 0 && !zombie.getIsDying()) {
      zombie.applyKnockback(this.knockbackForce, this.position.x, this.position.y);
    }

    zombie.takeDamage(modifiedDamage, this.towerType, this.position.x, this.position.y);
    const healthAfter = zombie.getHealth();
    const actualDamage = healthBefore - healthAfter;
    const killed = healthAfter <= 0;
    const overkill = killed ? Math.abs(healthAfter) : 0;

    // Emit DAMAGE_DEALT event for tracking and analytics
    EventBus.getInstance().emit(GameEvents.DAMAGE_DEALT, {
      damage: actualDamage,
      towerType: this.towerType,
      killed,
      overkill,
      zombieX: zombie.position.x,
      zombieY: zombie.position.y,
      zombieId: (zombie as { id?: string }).id || 'unknown',
    });
  }

  private createHitEffect(): void {
    // Visual feedback for hit
    this.visual.clear();

    switch (this.projectileType) {
      case 'flame':
        this.createFirePool();
        break;
      case 'grenade':
        this.createExplosion();
        break;
      case 'sludge':
        this.createSludgePool();
        break;
      case 'tesla':
        if (this.parent) {
          this.parent.addChild(new ImpactEffect(this.position.x, this.position.y, 'tesla', 100));
        }
        this.isActive = false;
        this.isHitEffectActive = true;
        break;
      default:
        if (this.parent) {
          this.parent.addChild(new ImpactEffect(this.position.x, this.position.y, 'bullet', 100));
        }
        this.isActive = false;
        this.isHitEffectActive = true;
    }
  }

  private createExplosion(): void {
    if (!this.parent) {
      this.isActive = false;
      return;
    }

    // Create explosion visual effect
    const explosionEffect = new ExplosionEffect(
      this.position.x,
      this.position.y,
      this.upgradeLevel,
      400
    );
    this.parent.addChild(explosionEffect);

    // Apply splash damage to all zombies in radius (gameplay logic stays in Projectile)
    const explosionRadius = explosionEffect.getExplosionRadius();
    const zombiesInRadius = this.getZombiesInRadius(explosionRadius);
    for (const { zombie, distance } of zombiesInRadius) {
      // Damage falls off with distance (100% at center, 30% at edge)
      const damageFalloff = 1 - (distance / explosionRadius) * 0.7;
      this.applyDamageToZombie(zombie, this.damage, damageFalloff);
    }

    // Deactivate the projectile immediately
    this.isActive = false;
  }

  private createFirePool(): void {
    // Emit event to spawn animated burning ground effect
    EventBus.getInstance().emit(GameEvents.FLAME_GROUND_HIT, {
      x: this.position.x,
      y: this.position.y,
      upgradeLevel: this.upgradeLevel,
    });

    // Deactivate the projectile immediately
    this.isActive = false;
  }

  private createSludgePool(): void {
    if (!this.parent) return;

    // Scale pool radius with upgrade level - SMALL pools for path coverage
    // Level 1: 35px, Level 2: 38px, Level 3: 41px, Level 4: 44px, Level 5: 47px
    const baseRadius = 35;
    const radiusPerLevel = 3;
    const poolRadius = baseRadius + (this.upgradeLevel - 1) * radiusPerLevel;

    // Calculate slow percentage based on upgrade level
    // Level 1: 10%, Level 2: 17.5%, Level 3: 25%, Level 4: 32.5%, Level 5: 40%
    const slowPercent = 0.1 + (this.upgradeLevel - 1) * 0.075;

    // Calculate pool duration based on upgrade level
    // Level 1: 4s, Level 2: 5s, Level 3: 5s, Level 4: 6s, Level 5: 7s
    const baseDuration = 4000;
    const durationPerLevel = [0, 1000, 1000, 2000, 3000]; // Cumulative
    const poolDuration = baseDuration + (durationPerLevel[this.upgradeLevel - 1] || 0);

    // Create the animated sludge pool effect
    const sludgePool = new SludgePoolEffect(
      this.position.x,
      this.position.y,
      poolRadius,
      this.upgradeLevel,
      poolDuration,
      slowPercent
    );

    this.parent.addChild(sludgePool);

    // Store pool data reference for external systems
    (sludgePool as unknown as Record<string, unknown>)['_poolData'] = sludgePool.getPoolData();

    // Emit event to register sludge pool with SludgePoolManager
    EventBus.getInstance().emit(GameEvents.SLUDGE_POOL_CREATED, {
      pool: sludgePool,
    });

    // Deactivate the projectile immediately
    this.isActive = false;
  }

  public isDestroyed(): boolean {
    return !this.isActive && !this.isHitEffectActive;
  }

  public getDamage(): number {
    return this.damage;
  }
}
