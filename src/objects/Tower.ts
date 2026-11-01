import { Container, Graphics } from 'pixi.js';
import type { ITowerRenderer } from '@/renderers/towers/ITowerRenderer';
import { TowerRendererFactory } from '@/renderers/towers/TowerRendererFactory';
import { HealthComponent } from '../components/HealthComponent';
import { TransformComponent } from '../components/TransformComponent';
import { TOWER_MAX_LEVEL } from '../config/balanceConstants';
import { DebugConstants } from '../config/debugConstants';
import { GameConfig } from '../config/gameConfig';
import { LIGHTING } from '../config/lightingConstants';
import { getTowerStats, type IdleAnimationType } from '../config/towerConstants';
import { getTowerRuntime } from '../core/towerRuntime';
import type { TowerManager } from '../managers/TowerManager';
import { BarrelHeatGlow } from '../renderers/effects/BarrelHeatGlow';
import { ambientGlowAlpha, shotGlowAlpha } from '../renderers/lighting/glowMath';
import { lightingManager } from '../renderers/lighting/LightingManager';
import { getTowerLightingFilter } from '../renderers/lighting/TowerLightingFilter';
import { drawTowerShadow } from '../renderers/lighting/TowerShadow';
import type { TowerEffects } from '../types/tower-internal';
import { EffectCleanupManager } from '../utils/EffectCleanupManager';
import { type EventBus, GameEvents } from '../utils/EventBus';
import type { TowerRangeVisualizer } from '../utils/TowerRangeVisualizer';
import { GameObject } from './GameObject';
import type { ITower } from './Tower.interface';

export class Tower extends GameObject implements ITower, TowerEffects {
  private type: string;
  private damage = 0;
  private range = 0;
  private fireRate = 0; // shots per second
  private lastShotTime = 0;
  private upgradeLevel = 1;
  private maxUpgradeLevel = TOWER_MAX_LEVEL;
  private upgradeCost = 100;
  private visual: Graphics;
  private shadow: Graphics;
  private shotGlow: Graphics;
  /** Idle light for energy/fire towers (null for the rest); phase is randomised per tower. */
  private ambientGlow: Graphics | null = null;
  private ambientTimeSec = Math.random() * 10;
  /** ms since the last shot, for the brief firing flash (Infinity = no flash). */
  private shotGlowAgeMs = Number.POSITIVE_INFINITY;
  private unsubscribeLight: (() => void) | null = null;
  private barrel: Container; // Separate barrel for rotation
  private renderer: ITowerRenderer; // Renderer for visual representation
  private rangeVisualizer: TowerRangeVisualizer;
  private towerManager: TowerManager;
  private currentRotation = 0;

  // Idle animation properties
  private idleTime = 0;
  private idleScanDirection = 1; // 1 for right, -1 for left
  private idleScanAngle = 0;
  private lastShootTime = 0;

  // Machine gun effects
  private barrelHeatGlow: BarrelHeatGlow | null = null;
  private effectContainer: Container | null = null;

  // Sniper effects
  // biome-ignore lint/suspicious/noExplicitAny: PixiJS Filter API uses complex types
  private laserSight: any = null;
  private currentTarget: { x: number; y: number } | null = null;

  // EventBus for decoupled communication
  private eventBus: EventBus;

  // Dynamic effect properties (from TowerEffects interface)
  public selectionHighlight?: Graphics;
  public pulseInterval?: NodeJS.Timeout;

  // Static animation handler map - Strategy pattern implementation
  // Defined once at class level to avoid recreating on every frame
  private static readonly idleAnimationHandlers: Record<
    IdleAnimationType,
    (tower: Tower, deltaTime: number) => void
  > = {
    none: () => {
      /* no idle animation */
    },
    machineGun: (tower, dt) => tower.idleAnimationMachineGun(dt),
    sniper: (tower, dt) => tower.idleAnimationSniper(dt),
    shotgun: (tower, dt) => tower.idleAnimationShotgun(dt),
    flame: (tower, dt) => tower.idleAnimationFlame(dt),
    tesla: (tower, dt) => tower.idleAnimationTesla(dt),
    grenade: (tower, dt) => tower.idleAnimationGrenade(dt),
    sludge: (tower, dt) => tower.idleAnimationSludge(dt),
  };

  constructor(type: string, x: number, y: number) {
    super();
    const runtime = getTowerRuntime();
    this.type = type;
    this.lastShotTime = 0;
    this.rangeVisualizer = runtime.rangeVisualizer;
    this.eventBus = runtime.eventBus;
    this.towerManager = runtime.towerManager;

    // Set the container position
    this.position.set(x, y);

    // Add transform component
    const transform = new TransformComponent(x, y);
    this.addComponent(transform);

    // Soft ground shadow that follows the scene light. Drawn first so it sits under the tower
    // body and gives the sprite weight against the terrain.
    this.shadow = new Graphics();
    drawTowerShadow(this.shadow, lightingManager);
    this.addChild(this.shadow);
    this.unsubscribeLight = lightingManager.subscribe(() =>
      drawTowerShadow(this.shadow, lightingManager)
    );

    // Soft idle light (Tesla pulse, Flame flicker, Sludge glow) under the body
    this.ambientGlow = this.createAmbientGlow();
    if (this.ambientGlow) {
      this.addChild(this.ambientGlow);
    }

    // Faint coloured flash around the base while firing (hidden until the first shot)
    this.shotGlow = this.createShotGlow();
    this.addChild(this.shotGlow);

    // Create visual representation
    this.visual = new Graphics();
    this.addChild(this.visual);

    // Pseudo-3D bevel shading (null when lighting is off or unsupported)
    const lightingFilter = getTowerLightingFilter();
    if (lightingFilter) {
      this.visual.filters = [lightingFilter];
    }

    // Create barrel as separate container for rotation (holds graphics + effects)
    this.barrel = new Container();
    this.addChild(this.barrel);

    // Assign renderer via factory
    this.renderer = TowerRendererFactory.create(type);

    // Initial render
    this.updateVisual();

    // Initialize tower stats
    this.initializeStats();

    // Initialize machine gun effects if this is a machine gun tower
    if (this.type === GameConfig.TOWER_TYPES.MACHINE_GUN) {
      this.barrelHeatGlow = new BarrelHeatGlow(this.barrel);
    }
  }

  /** Soft stacked discs in the tower's light colour; alpha is animated in updateAmbientGlow. */
  private createAmbientGlow(): Graphics | null {
    const config = LIGHTING.AMBIENT_GLOW.TYPES[this.type];
    if (!config) {
      return null;
    }
    const { RADIUS, CENTER_Y } = LIGHTING.AMBIENT_GLOW;
    const glow = new Graphics();
    glow.circle(0, CENTER_Y, RADIUS).fill({ color: config.color, alpha: 0.4 });
    glow.circle(0, CENTER_Y, RADIUS * 0.66).fill({ color: config.color, alpha: 0.35 });
    glow.circle(0, CENTER_Y, RADIUS * 0.33).fill({ color: config.color, alpha: 0.3 });
    glow.alpha = config.minAlpha;
    return glow;
  }

  private updateAmbientGlow(deltaTime: number): void {
    const config = LIGHTING.AMBIENT_GLOW.TYPES[this.type];
    if (!this.ambientGlow || !config) {
      return;
    }
    this.ambientTimeSec += deltaTime / 1000;
    this.ambientGlow.alpha = ambientGlowAlpha(this.ambientTimeSec, config);
  }

  /** Three soft stacked discs tinted for the tower type; alpha is driven in updateShotGlow. */
  private createShotGlow(): Graphics {
    const { COLORS, DEFAULT_COLOR, RADIUS, CENTER_Y } = LIGHTING.SHOT_GLOW;
    const color = COLORS[this.type] ?? DEFAULT_COLOR;
    const glow = new Graphics();
    glow.circle(0, CENTER_Y, RADIUS).fill({ color, alpha: 0.4 });
    glow.circle(0, CENTER_Y, RADIUS * 0.66).fill({ color, alpha: 0.35 });
    glow.circle(0, CENTER_Y, RADIUS * 0.33).fill({ color, alpha: 0.3 });
    glow.alpha = 0;
    glow.visible = false;
    return glow;
  }

  private updateShotGlow(deltaTime: number): void {
    if (this.shotGlowAgeMs === Number.POSITIVE_INFINITY) {
      return;
    }
    this.shotGlowAgeMs += deltaTime;
    const { PEAK_ALPHA, DURATION_MS } = LIGHTING.SHOT_GLOW;
    const alpha = shotGlowAlpha(this.shotGlowAgeMs, PEAK_ALPHA, DURATION_MS);
    this.shotGlow.alpha = alpha;
    this.shotGlow.visible = alpha > 0;
    if (alpha === 0) {
      this.shotGlowAgeMs = Number.POSITIVE_INFINITY;
    }
  }

  private initializeStats(): void {
    // Use injected TowerManager so debug multipliers apply consistently
    this.damage = this.towerManager.calculateTowerDamage(this.type, this.upgradeLevel);
    this.range = this.towerManager.calculateTowerRange(this.type, this.upgradeLevel);
    this.fireRate = this.towerManager.calculateTowerFireRate(this.type, this.upgradeLevel);

    // Add health component for tower durability - use centralized config
    const stats = getTowerStats(this.type);
    const towerHealth = stats?.health ?? 100;
    const healthComponent = new HealthComponent(towerHealth);
    this.addComponent(healthComponent);
  }

  public override update(deltaTime: number): void {
    super.update(deltaTime);

    // Update idle animation
    this.updateIdleAnimation(deltaTime);

    this.updateShotGlow(deltaTime);
    this.updateAmbientGlow(deltaTime);

    // Update barrel heat glow for machine gun
    if (this.barrelHeatGlow) {
      this.barrelHeatGlow.update(deltaTime);
    }

    // Update laser sight for sniper (level 3+)
    if (this.laserSight && this.currentTarget) {
      this.laserSight.update(deltaTime);
    }
  }

  private updateIdleAnimation(deltaTime: number): void {
    this.idleTime += deltaTime;

    // Check if tower has been idle for more than 2 seconds
    const timeSinceLastShot = performance.now() - this.lastShootTime;
    const isIdle = timeSinceLastShot > 2000;

    if (!isIdle) {
      // Reset idle animation when shooting
      this.idleScanAngle = 0;
      return;
    }

    // Use config-based idle animation lookup to eliminate switch statement
    const stats = getTowerStats(this.type);
    const animationType = stats?.idleAnimation ?? 'none';
    this.executeIdleAnimation(animationType, deltaTime);
  }

  private executeIdleAnimation(type: IdleAnimationType, deltaTime: number): void {
    // Use static handler map for O(1) lookup without allocation
    Tower.idleAnimationHandlers[type]?.(this, deltaTime);
  }

  // Grenade: Subtle loading animation
  private idleAnimationGrenade(_deltaTime: number): void {
    // Subtle bob up and down
    const bobSpeed = 0.002;
    const bobAmount = 0.3;

    const bobOffset = Math.sin(this.idleTime * bobSpeed) * bobAmount;
    this.barrel.y = bobOffset;
  }

  // Machine Gun: Scans left and right slowly
  private idleAnimationMachineGun(deltaTime: number): void {
    const scanSpeed = 0.0005; // Slow scanning
    const maxScanAngle = 0.3; // About 17 degrees each way

    this.idleScanAngle += scanSpeed * deltaTime * this.idleScanDirection;

    // Reverse direction at limits
    if (this.idleScanAngle > maxScanAngle) {
      this.idleScanDirection = -1;
    } else if (this.idleScanAngle < -maxScanAngle) {
      this.idleScanDirection = 1;
    }

    // Apply scan rotation to barrel
    this.barrel.rotation = this.currentRotation + this.idleScanAngle;
  }

  // Sniper: Subtle breathing motion (up and down)
  private idleAnimationSniper(_deltaTime: number): void {
    const breathSpeed = 0.002;
    const breathAmount = 0.5; // pixels

    const breathOffset = Math.sin(this.idleTime * breathSpeed) * breathAmount;
    this.barrel.y = breathOffset;
  }

  // Shotgun: Occasional pump/check animation
  private idleAnimationShotgun(_deltaTime: number): void {
    // Every 5 seconds, do a quick check animation
    const checkInterval = 5000;
    const checkDuration = 300;

    const timeMod = this.idleTime % checkInterval;

    if (timeMod < checkDuration) {
      // Quick tilt animation
      const progress = timeMod / checkDuration;
      const tiltAmount = Math.sin(progress * Math.PI) * 0.1;
      this.barrel.rotation = this.currentRotation + tiltAmount;
    } else {
      this.barrel.rotation = this.currentRotation;
    }
  }

  // Flame: Subtle flickering/pilot light effect
  private idleAnimationFlame(_deltaTime: number): void {
    // Small random movements to simulate pilot light
    const flickerAmount = 0.3;

    const flicker = (Math.random() - 0.5) * flickerAmount;
    this.barrel.x = flicker;
    this.barrel.y = flicker * 0.5;
  }

  // Tesla: Capacitor charging glow (handled in visual, but add subtle rotation)
  private idleAnimationTesla(deltaTime: number): void {
    // Slow rotation back and forth
    const rotateSpeed = 0.0003;
    const maxRotation = 0.2;

    this.idleScanAngle += rotateSpeed * deltaTime * this.idleScanDirection;

    if (this.idleScanAngle > maxRotation) {
      this.idleScanDirection = -1;
    } else if (this.idleScanAngle < -maxRotation) {
      this.idleScanDirection = 1;
    }

    this.barrel.rotation = this.currentRotation + this.idleScanAngle;
  }

  // Sludge: Bubbling/dripping animation
  private idleAnimationSludge(_deltaTime: number): void {
    // Subtle drip animation
    const dripSpeed = 0.003;
    const dripAmount = 0.5;

    const dripOffset = Math.sin(this.idleTime * dripSpeed) * dripAmount;
    this.barrel.y = dripOffset;

    // Add slight wobble to simulate liquid sloshing
    const wobbleAmount = 0.05;
    const wobble = Math.sin(this.idleTime * dripSpeed * 1.5) * wobbleAmount;
    this.barrel.rotation = this.currentRotation + wobble;
  }

  // Check if tower can shoot (based on fire rate)
  public canShoot(currentTime: number): boolean {
    const timeSinceLastShot = currentTime - this.lastShotTime;
    const timeBetweenShots = 1000 / this.fireRate; // Convert fire rate to milliseconds
    return timeSinceLastShot >= timeBetweenShots;
  }

  // Shoot at a target
  public shoot(): void {
    this.lastShotTime = performance.now();
    this.lastShootTime = performance.now(); // Track for idle animation

    // Reset idle animation state
    this.idleScanAngle = 0;
    this.barrel.x = 0;
    this.barrel.y = 0;

    // Add heat to machine gun barrel
    if (this.barrelHeatGlow) {
      this.barrelHeatGlow.addHeat();
    }

    // Shooting logic is handled by showShootingEffect()
  }

  // Show shooting visual effects
  public showShootingEffect(): void {
    this.renderer.renderShootingEffect(this.barrel, this.type, this.upgradeLevel);
    this.shotGlowAgeMs = 0;
  }

  // Show tower range visualization
  public showRange(container: Container): void {
    const transform = this.getComponent<TransformComponent>('Transform');
    if (transform) {
      const pos = transform.position;
      this.rangeVisualizer.showRange(container, pos.x, pos.y, this.range);
    }
  }

  // Hide tower range visualization
  public hideRange(): void {
    this.rangeVisualizer.hideRange();
  }

  /**
   * Get the tower type
   * @returns The tower type
   */
  public getType(): string {
    return this.type;
  }

  /**
   * Get the current upgrade level
   * @returns The current upgrade level
   */
  public getUpgradeLevel(): number {
    return this.upgradeLevel;
  }

  /**
   * Get the maximum upgrade level
   * @returns The maximum upgrade level
   */
  public getMaxUpgradeLevel(): number {
    return this.maxUpgradeLevel;
  }

  /**
   * Base upgrade cost constant stored on the tower (legacy; prefer EconomyState.getUpgradeCost).
   */
  public getUpgradeCost(): number {
    return this.upgradeCost;
  }

  /**
   * Check if the tower can be upgraded
   * @returns True if the tower can be upgraded, false otherwise
   */
  public canUpgrade(): boolean {
    return this.upgradeLevel < this.maxUpgradeLevel;
  }

  /**
   * Upgrade the tower
   */
  public upgrade(): void {
    if (this.canUpgrade()) {
      this.upgradeLevel++;
      this.applyUpgradeEffects();
    }
  }

  /**
   * Apply effects of an upgrade
   */
  private applyUpgradeEffects(): void {
    // Recalculate stats based on upgrade level
    this.damage = this.towerManager.calculateTowerDamage(this.type, this.upgradeLevel);
    this.range = this.towerManager.calculateTowerRange(this.type, this.upgradeLevel);
    this.fireRate = this.towerManager.calculateTowerFireRate(this.type, this.upgradeLevel);

    // When upgrading, also increase health
    const healthComponent = this.getComponent<HealthComponent>('Health');
    if (healthComponent) {
      // Increase max health by 20% per upgrade level
      const newMaxHealth = Math.floor(100 * 1.2 ** this.upgradeLevel);
      // Heal to full when upgraded
      healthComponent.setMaxHealth(newMaxHealth);
      healthComponent.heal(newMaxHealth); // This will set current health to max
    }

    // Update visual to show upgrade
    this.updateVisual();
  }

  // Apply damage to the tower
  public takeDamage(damage: number): number {
    if (DebugConstants.ENABLED && DebugConstants.INVINCIBLE_TOWERS) {
      return 0;
    }

    const healthComponent = this.getComponent<HealthComponent>('Health');
    if (healthComponent) {
      const actualDamage = healthComponent.takeDamage(damage);

      // Emit TOWER_DAMAGED event for CombatRenderer to handle visuals
      this.eventBus.emit(GameEvents.TOWER_DAMAGED, {
        tower: this,
        damage: actualDamage,
      });

      return actualDamage;
    }
    return 0;
  }

  // Check if tower is still alive
  public isAlive(): boolean {
    const healthComponent = this.getComponent<HealthComponent>('Health');
    return healthComponent ? healthComponent.isAlive() : false;
  }

  // Get current health
  public getHealth(): number {
    const healthComponent = this.getComponent<HealthComponent>('Health');
    return healthComponent ? healthComponent.getHealth() : 0;
  }

  // Get maximum health
  public getMaxHealth(): number {
    const healthComponent = this.getComponent<HealthComponent>('Health');
    return healthComponent ? healthComponent.getMaxHealth() : 0;
  }

  // Get health percentage
  public getHealthPercentage(): number {
    const healthComponent = this.getComponent<HealthComponent>('Health');
    return healthComponent ? healthComponent.getHealthPercentage() : 0;
  }

  // Update visual based on tower type
  public updateVisual(): void {
    this.visual.clear();
    this.renderer.render(this.visual, this.barrel, this.type, this.upgradeLevel);
  }

  // Rotate tower to face target
  public rotateTowards(targetX: number, targetY: number): void {
    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
    // Guns now point down (positive Y), so subtract 90 degrees instead of adding
    const angle = Math.atan2(dy, dx) - Math.PI / 2;

    this.currentRotation = angle;
    this.barrel.rotation = angle;

    // Reset idle animation offsets when actively targeting
    this.idleScanAngle = 0;
    this.barrel.x = 0;
    this.barrel.y = 0;
  }

  // Get projectile spawn position (at barrel tip)
  public getProjectileSpawnPosition(): { x: number; y: number } {
    // Use config-based barrel length to eliminate switch statement
    const stats = getTowerStats(this.type);
    const baseLength = stats?.barrelLength ?? 20;
    const upgradeBonus = stats?.barrelLengthUpgradeBonus ?? 0;
    const barrelLength = baseLength + this.upgradeLevel * upgradeBonus;

    // Calculate position at barrel tip based on rotation
    const angle = this.currentRotation - Math.PI / 2; // Subtract 90 degrees
    const spawnX = this.position.x + Math.cos(angle) * barrelLength;
    const spawnY = this.position.y + Math.sin(angle) * barrelLength;

    return { x: spawnX, y: spawnY };
  }

  // Get projectile type for this tower - use config to eliminate switch
  public getProjectileType(): string {
    const stats = getTowerStats(this.type);
    return stats?.projectileType ?? 'bullet';
  }

  // Getters
  public getDamage(): number {
    return this.damage;
  }

  public getRange(): number {
    return this.range;
  }

  public getFireRate(): number {
    return this.fireRate;
  }

  // Show selection visual effects
  public showSelectionEffect(): void {
    // Clean up any existing selection effect first
    this.hideSelectionEffect();

    // Create a highlight effect around the tower
    const highlight = new Graphics();
    highlight.circle(0, 0, 25).fill({ color: 0xffff00, alpha: 0.3 }); // Yellow highlight with transparency
    highlight.stroke({ width: 2, color: 0xffff00 });

    // Add highlight as a child but behind the main visual
    this.addChildAt(highlight, 0);

    // Store reference to remove later
    this.selectionHighlight = highlight;

    // Pulsing animation effect
    let scale = 1;
    let growing = true;
    const pulse = () => {
      // Check if highlight still exists before animating
      if (!highlight || highlight.destroyed) {
        if (this.pulseInterval) {
          clearInterval(this.pulseInterval);
          this.pulseInterval = undefined;
        }
        return;
      }

      if (growing) {
        scale += 0.05;
        if (scale >= 1.2) {
          growing = false;
        }
      } else {
        scale -= 0.05;
        if (scale <= 1) {
          growing = true;
        }
      }
      highlight.scale.set(scale);
    };

    // Store interval ID to clear later (tracked to prevent memory leaks)
    this.pulseInterval = EffectCleanupManager.registerInterval(setInterval(pulse, 50));
  }

  // Hide selection visual effects
  public hideSelectionEffect(): void {
    // Clear pulse animation first (tracked to prevent memory leaks)
    if (this.pulseInterval) {
      EffectCleanupManager.clearInterval(this.pulseInterval);
      this.pulseInterval = undefined;
    }

    // Remove highlight if it exists
    if (this.selectionHighlight) {
      const highlight = this.selectionHighlight;
      if (highlight && !highlight.destroyed && highlight.parent) {
        this.removeChild(highlight);
        highlight.destroy();
      }
      this.selectionHighlight = undefined;
    }
  }

  /** Set the container for tower-local effects (e.g. sniper laser sight). */
  public setEffectContainer(container: Container): void {
    this.effectContainer = container;
  }

  /**
   * Spawn bullet trail and impact flash (Sniper)
   * Emits SNIPER_HIT event for CombatRenderer to handle visuals
   */
  public spawnSniperHitEffects(targetX: number, targetY: number, isHeadshot = false): void {
    const rifleLength = 12 + this.upgradeLevel * 2;
    const rifleTip = -12 + rifleLength;
    const startX = this.x + Math.cos(this.barrel.rotation) * rifleTip;
    const startY = this.y + Math.sin(this.barrel.rotation) * rifleTip;

    // Emit event for CombatRenderer to handle visuals (enables headless simulation)
    this.eventBus.emit(GameEvents.SNIPER_HIT, {
      tower: this,
      startX,
      startY,
      targetX,
      targetY,
      isHeadshot,
      upgradeLevel: this.upgradeLevel,
      barrelRotation: this.barrel.rotation,
    });
  }

  /**
   * Enable/disable laser sight (Sniper, level 3+)
   */
  public setLaserSightEnabled(enabled: boolean): void {
    if (this.type !== GameConfig.TOWER_TYPES.SNIPER || this.upgradeLevel < 3) {
      return;
    }

    if (enabled && !this.laserSight && this.currentTarget) {
      import('../renderers/effects/LaserSight')
        .then(({ LaserSight }) => {
          if (!this.effectContainer || !this.currentTarget) {
            return;
          }

          const rifleLength = 12 + this.upgradeLevel * 2;
          const rifleTip = -12 + rifleLength;
          const startX = this.x + Math.cos(this.barrel.rotation) * rifleTip;
          const startY = this.y + Math.sin(this.barrel.rotation) * rifleTip;

          this.laserSight = new LaserSight(
            startX,
            startY,
            this.currentTarget.x,
            this.currentTarget.y
          );
          this.effectContainer.addChild(this.laserSight);
        })
        .catch(() => {
          // Silently fail
        });
    } else if (!enabled && this.laserSight) {
      if (this.effectContainer && this.laserSight.parent) {
        this.effectContainer.removeChild(this.laserSight);
      }
      this.laserSight.destroy();
      this.laserSight = null;
    }
  }

  /**
   * Update target for laser sight
   */
  public setTarget(targetX: number, targetY: number): void {
    this.currentTarget = { x: targetX, y: targetY };

    if (this.laserSight && this.type === GameConfig.TOWER_TYPES.SNIPER) {
      const rifleLength = 12 + this.upgradeLevel * 2;
      const rifleTip = -12 + rifleLength;
      const startX = this.x + Math.cos(this.barrel.rotation) * rifleTip;
      const startY = this.y + Math.sin(this.barrel.rotation) * rifleTip;

      this.laserSight.updatePosition(startX, startY, targetX, targetY);
    }
  }

  /**
   * Clean up effects when tower is destroyed
   */
  public override destroy(): void {
    this.unsubscribeLight?.();
    this.unsubscribeLight = null;

    // CRITICAL: Clear pulse interval to prevent memory leak
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = undefined;
    }

    // Clean up barrel heat glow
    if (this.barrelHeatGlow) {
      this.barrelHeatGlow.destroy();
      this.barrelHeatGlow = null;
    }

    // Clean up laser sight
    if (this.laserSight) {
      if (this.laserSight.parent) {
        this.laserSight.parent.removeChild(this.laserSight);
      }
      this.laserSight.destroy();
      this.laserSight = null;
    }

    // Clean up renderer
    try {
      this.renderer.destroy();
    } catch (_error) {
      // Renderer already destroyed
    }

    // Note: Shell casings and muzzle flashes are managed by EffectManager
    // and will be cleaned up automatically

    // Call parent destroy which will destroy visual and barrel Graphics
    super.destroy();
  }
}
