import { Container, Graphics } from 'pixi.js';
import { HealthComponent } from '../components/HealthComponent';
import { LimbState } from '../components/LimbState';
import { TransformComponent } from '../components/TransformComponent';
import { DebugConstants } from '../config/debugConstants';
import { GameConfig } from '../config/gameConfig';
import {
  convertToTowerType,
  convertToZombieType,
  getDamageModifier,
  type TowerType,
} from '../config/zombieResistances';
import { ZombieRendererFactory } from '../renderers/zombies';
import type { BaseZombieRenderer } from '../renderers/zombies/BaseZombieRenderer';
import type { IZombieRenderer, ZombieRenderState } from '../renderers/zombies/ZombieRenderer';
import { LateralStagger } from '../utils/WalkStagger';
import { ZombieStats } from '../utils/ZombieStats';
import { GameObject } from './GameObject';
import { BurnState } from './zombies/BurnState';
import {
  DEFAULT_HEALTH_BAR,
  getThreatBarSpec,
  type HealthBarSpec,
  healthBarColor,
  shouldShowHealthBar,
} from './zombies/HealthBarSpec';
import { KnockbackState } from './zombies/KnockbackState';
import { LaneOffset } from './zombies/LaneOffset';
import {
  getKnockbackResistance,
  getLaneSpread,
  getSwayAmplitude,
} from './zombies/ZombieTypeTraits';

export class Zombie extends GameObject {
  private type: string;
  private speed = 0;
  private baseSpeed = 0; // Base speed before variation
  private reward = 0;
  private damage = 1; // Damage dealt to survivor camp
  private currentWaypointIndex = 0;
  private waypoints: { x: number; y: number }[] = [];
  private healthBar: Container | null = null;
  private healthBarFg!: Graphics;
  private healthBarSpec: HealthBarSpec = DEFAULT_HEALTH_BAR;
  /** True when this type shows a bar by default (threat types); others need the debug flag. */
  private healthBarByDefault = false;
  private lastBarPercent = -1;
  private healthComponent!: HealthComponent;
  private transformComponent!: TransformComponent;
  private limbState!: LimbState;
  private lateralStagger = new LateralStagger();
  private speedVariation = 1.0; // Random speed multiplier for variation
  /** Additive bonus (e.g. NecroTank rage) preserved across recalc */
  protected speedBonus = 0;
  private isSlowed = false; // Track if zombie is currently slowed
  private currentSlowPercent = 0; // Current slow percentage applied
  private renderer: IZombieRenderer | null = null; // Modular renderer
  private lastDamageSource = 'unknown'; // Track tower type that dealt damage
  private lastDamageSourcePosition: { x: number; y: number } | null = null; // Position of last damage source
  private isDying = false; // Track if death animation is in progress
  private deathAnimationComplete = false; // Track if animation finished

  private knockback = new KnockbackState();
  private lane = new LaneOffset();
  private burn = new BurnState();

  constructor(type: string, x: number, y: number, wave: number) {
    super();
    this.type = type;
    this.currentWaypointIndex = 0;

    // Set the container position
    this.position.set(x, y);

    // Initialize components
    this.transformComponent = new TransformComponent(x, y);
    this.addComponent(this.transformComponent);

    // Initialize waypoints (simplified for now)
    this.waypoints = [
      { x, y },
      { x: x + 100, y: y },
    ]; // Placeholder

    // Initialize health component based on zombie type
    this.initializeHealth(wave);

    // Initialize visual representation
    this.initializeVisual();
  }

  public init(x: number, y: number, wave: number): void {
    this.position.set(x, y);
    this.transformComponent.setPosition(x, y);

    this.currentWaypointIndex = 0;
    this.isDying = false;
    this.deathAnimationComplete = false;
    this.lastDamageSourcePosition = null;
    this.isSlowed = false;
    this.currentSlowPercent = 0;
    this.knockback.reset();
    this.lane.reset(getLaneSpread(this.type));
    this.pivot.set(0, 0);
    this.visible = true;
    this.alpha = 1;
    this.scale.set(1);
    this.lateralStagger.reset();
    this.speedBonus = 0;
    this.limbState?.reset();

    // Reset Health
    const health = ZombieStats.calculateZombieHealth(this.type, wave);
    if (this.healthComponent) {
      this.healthComponent.reset(health);
    }

    // Restore base speed (limb mult included via recalc)
    this.speedVariation = 0.85 + Math.random() * 0.3;
    this.recalculateSpeed();

    if (this.healthBar) {
      this.healthBar.visible = false;
    }
    this.lastBarPercent = -1;

    // Reset renderer
    if (this.renderer) {
      this.renderer.reset?.();
    }

    // Reset burn state
    this.burn.reset();
  }

  private initializeHealth(wave: number): void {
    const health = ZombieStats.calculateZombieHealth(this.type, wave);

    // Add health component
    this.healthComponent = new HealthComponent(health);
    this.addComponent(this.healthComponent);

    this.limbState = new LimbState(this.type);
    this.addComponent(this.limbState);

    // Set base speed, reward, and damage based on type
    switch (this.type) {
      case GameConfig.ZOMBIE_TYPES.BASIC:
        this.baseSpeed = 25; // pixels per second
        this.reward = 5;
        this.damage = 1; // 1 survivor killed
        break;
      case GameConfig.ZOMBIE_TYPES.FAST:
        this.baseSpeed = 50;
        this.reward = 8;
        this.damage = 1; // Fast but weak
        break;
      case GameConfig.ZOMBIE_TYPES.TANK:
        this.baseSpeed = 12.5;
        this.reward = 25;
        this.damage = 5; // Massive damage
        break;
      case GameConfig.ZOMBIE_TYPES.ARMORED:
        this.baseSpeed = 20;
        this.reward = 15;
        this.damage = 3; // Heavy damage
        break;
      case GameConfig.ZOMBIE_TYPES.SWARM:
        this.baseSpeed = 30;
        this.reward = 3;
        this.damage = 1; // Small but numerous
        break;
      case GameConfig.ZOMBIE_TYPES.STEALTH:
        this.baseSpeed = 35;
        this.reward = 12;
        this.damage = 2; // Moderate damage
        break;
      case GameConfig.ZOMBIE_TYPES.MECHANICAL:
        this.baseSpeed = 27.5;
        this.reward = 20;
        this.damage = 4; // High-tech threat
        break;
      case GameConfig.ZOMBIE_TYPES.BOSS:
        this.baseSpeed = 9;
        this.reward = 75;
        this.damage = 10; // Devastating camp damage
        break;
      case GameConfig.ZOMBIE_TYPES.NECRO_TANK:
        this.baseSpeed = 10;
        this.reward = 200;
        this.damage = 8; // Heavy camp damage; slightly less than Boss
        break;
      default:
        this.baseSpeed = 25;
        this.reward = 5;
        this.damage = 1;
    }

    // Apply debug speed multiplier, then random variation (±15%)
    if (DebugConstants.ENABLED) {
      this.baseSpeed *= DebugConstants.ZOMBIE_SPEED_MULTIPLIER;
    }
    this.speedVariation = 0.85 + Math.random() * 0.3;
    this.recalculateSpeed();
  }

  /** Recompute speed from base, variation, sludge slow, limb penalties, and bonuses. */
  protected recalculateSpeed(): void {
    const slowFactor = this.isSlowed ? 1 - this.currentSlowPercent : 1;
    const limbMult = this.limbState
      ? this.limbState.getSpeedMultiplier(this.getHealthRatio())
      : 1;
    this.speed = this.baseSpeed * this.speedVariation * slowFactor * limbMult + this.speedBonus;
  }

  private getHealthRatio(): number {
    const max = this.healthComponent?.getMaxHealth() ?? 0;
    if (max <= 0) {
      return 1;
    }
    return this.healthComponent.getHealth() / max;
  }

  // Initialize modular renderer based on zombie type
  private initializeVisual(): void {
    this.renderer = ZombieRendererFactory.create(this.type);

    // Set zombie type name for ragdoll configuration
    if (this.renderer) {
      (this.renderer as BaseZombieRenderer).setZombieType(this.type);
    }

    // Health bar: shown only once damaged, and by default only on high-HP threat types
    const threatSpec = getThreatBarSpec(this.type);
    this.healthBarByDefault = threatSpec !== null;
    this.healthBarSpec = threatSpec ?? DEFAULT_HEALTH_BAR;
    const { width, height, offsetY } = this.healthBarSpec;

    const barBg = new Graphics();
    barBg
      .rect(-width / 2 - 1, offsetY - 1, width + 2, height + 2)
      .fill({ color: 0x000000, alpha: 0.75 });

    this.healthBarFg = new Graphics();

    this.healthBar = new Container();
    this.healthBar.addChild(barBg);
    this.healthBar.addChild(this.healthBarFg);
    this.healthBar.visible = false; // Hidden until damaged
    this.addChild(this.healthBar);
  }

  public override update(deltaTime: number): void {
    super.update(deltaTime);

    // If dying, only update renderer (for death animation), skip movement/AI
    if (this.isDying) {
      if (this.renderer) {
        this.renderer.update(deltaTime, this.getRenderState());
        // Continue rendering even while dying
        this.renderer.render(this, this.getRenderState());

        // Add ragdoll graphics to the zombie container if active
        const baseRenderer = this.renderer as BaseZombieRenderer;
        if (baseRenderer.isRagdolling?.()) {
          const ragdollGfx = baseRenderer.getRagdollGraphics?.();
          if (ragdollGfx && !ragdollGfx.parent) {
            this.addChild(ragdollGfx);
          }
        }
      }
      return;
    }

    // Update new renderer if using it
    if (this.renderer) {
      const state = this.getRenderState();
      this.renderer.update(deltaTime, state);
      this.renderer.render(this, state);
    }

    // Update health bar (threat types by default; debug flag shows it on every type)
    const healthComponent = this.getComponent<HealthComponent>('Health');
    if (healthComponent && this.healthBar) {
      const percent = healthComponent.getHealthPercentage();
      const enabled = this.healthBarByDefault || DebugConstants.SHOW_ZOMBIE_HEALTH_BARS;
      const show = shouldShowHealthBar(percent, enabled);
      this.healthBar.visible = show;
      if (show) {
        this.redrawHealthBar(percent);
      }
    }

    // Move towards next waypoint
    this.moveTowardsWaypoint(deltaTime);

    // Update burn state (apply damage if burning)
    this.updateBurn(deltaTime);

    // Reset fire exposure tracking if not in fire this frame
    // (This will be set to true by the fire pool system if zombie is in fire)
    this.burn.endFrame();
  }

  private getRenderState(): ZombieRenderState {
    const target = this.waypoints[this.currentWaypointIndex] || this.waypoints[0];
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const healthRatio = this.getHealthRatio();

    return {
      position: { x: this.position.x, y: this.position.y },
      health: this.healthComponent.getHealth(),
      maxHealth: this.healthComponent.getMaxHealth(),
      speed: this.speed,
      direction: distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 },
      isMoving: this.currentWaypointIndex < this.waypoints.length,
      isDamaged: false,
      statusEffects: [],
      limbs: this.limbState.getLimbs(),
      isCrawling: this.limbState.isCrawling(healthRatio),
    };
  }

  private moveTowardsWaypoint(deltaTime: number): void {
    if (this.currentWaypointIndex >= this.waypoints.length) {
      return;
    }

    // Handle knockback movement first (takes priority over normal movement)
    if (this.knockback.active) {
      this.updateKnockback(deltaTime);
      return;
    }

    const target = this.waypoints[this.currentWaypointIndex];

    // Calculate direction vector
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If we've reached the waypoint, move to the next one
    if (distance < 5) {
      this.currentWaypointIndex++;
      return;
    }

    // Normalize direction and apply speed
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;

    // Calculate movement for this frame (speed is in pixels per second)
    const moveX = normalizedDx * this.speed * (deltaTime / 1000);
    const moveY = normalizedDy * this.speed * (deltaTime / 1000);

    // Irregular limp lean (eased random targets) instead of a sine weave
    const dt = deltaTime / 1000;
    const staggerLean = this.lateralStagger.update(dt, getSwayAmplitude(this.type));

    // Lateral offset perpendicular to movement direction
    const perpX = -normalizedDy;
    const perpY = normalizedDx;

    this.position.x += moveX + perpX * staggerLean * dt;
    this.position.y += moveY + perpY * staggerLean * dt;

    // Render-only lane offset (pivot shifts the sprite, not the logical position)
    const lane = this.lane.update(normalizedDx, normalizedDy, dt);
    this.pivot.set(-lane.x, -lane.y);

    // Update transform component to stay in sync
    this.transformComponent.setPosition(this.position.x, this.position.y);
  }

  /**
   * Apply knockback to the zombie, pushing it back along the path
   * @param force - The knockback force (distance in pixels)
   * @param sourceX - X position of the knockback source (for direction)
   * @param sourceY - Y position of the knockback source (for direction)
   * @returns True if knockback was applied, false if zombie resists knockback
   */
  public applyKnockback(force: number, sourceX: number, sourceY: number): boolean {
    const actualForce = force * (1 - getKnockbackResistance(this.type));

    // If resistance completely nullifies knockback, don't apply
    if (actualForce <= 0) {
      return false;
    }

    // Direction: away from source
    const dx = this.position.x - sourceX;
    const dy = this.position.y - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return false;
    }

    this.knockback.start(dx / distance, dy / distance, actualForce);
    return true;
  }

  /**
   * Update knockback movement
   */
  private updateKnockback(deltaTime: number): void {
    const move = this.knockback.step(deltaTime);
    this.position.x += move.x;
    this.position.y += move.y;
    this.transformComponent.setPosition(this.position.x, this.position.y);
  }

  /**
   * Check if zombie is currently being knocked back
   */
  public getIsBeingKnockedBack(): boolean {
    return this.knockback.active;
  }

  // Show damage indicator when taking damage
  public getHealth(): number {
    return this.healthComponent.getHealth();
  }

  public getMaxHealth(): number {
    return this.healthComponent.getMaxHealth();
  }

  public takeDamage(
    damage: number,
    towerType?: string,
    sourceX?: number,
    sourceY?: number
  ): number {
    // Track damage source for death animation selection
    if (towerType && damage > 0) {
      this.lastDamageSource = towerType;
    }

    // Track source position for directional death effects
    if (sourceX !== undefined && sourceY !== undefined) {
      this.lastDamageSourcePosition = { x: sourceX, y: sourceY };
    }

    const appliedDamage =
      DebugConstants.ENABLED && DebugConstants.ONE_HIT_KILL
        ? this.healthComponent.getHealth()
        : damage;

    const prevRatio = this.getHealthRatio();

    // Apply damage to health component
    const actualDamage = this.healthComponent.takeDamage(appliedDamage);
    const nextRatio = this.getHealthRatio();

    // Visual feedback for damage via renderer
    if (this.renderer) {
      this.renderer.showDamageEffect(towerType || 'unknown', actualDamage);
    }

    // Check if zombie is dead
    if (!this.healthComponent.isAlive()) {
      this.onDeath();
      return actualDamage;
    }

    // Threshold-based limb loss while alive
    const lostLimb = this.limbState.tryThresholdDismember(prevRatio, nextRatio);
    if (lostLimb) {
      this.renderer?.onLimbLost?.(lostLimb);
    }

    // Recalc for crawl / one-leg / critical HP floor
    this.recalculateSpeed();

    return actualDamage;
  }

  // Method to show damage effect (for testing)
  public showDamageEffect(_damage: number): void {
    // Visual damage effects are handled by the renderer
    // This method is kept for potential future enhancements
  }

  // Method to show death effect (for testing)
  public showDeathEffect(): void {
    // Trigger death effects
    this.onDeath();
  }

  // Method called when zombie dies
  private async onDeath(): Promise<void> {
    // Prevent multiple death triggers
    if (this.isDying) return;
    this.isDying = true;

    const impactAngle = this.lastDamageSourcePosition
      ? Math.atan2(
          this.position.y - this.lastDamageSourcePosition.y,
          this.position.x - this.lastDamageSourcePosition.x
        )
      : Math.random() * Math.PI * 2;

    // Emit death event IMMEDIATELY for blood/corpse systems
    // This ensures corpse appears at death location before animation moves the zombie
    this.emit('zombieDeath', {
      x: this.position.x,
      y: this.position.y,
      type: this.type,
      size: this.getVisualSize(),
      killerType: this.lastDamageSource,
      impactAngle,
    });

    // Play death animation if using new renderer
    if (this.renderer) {
      await this.renderer.playDeathAnimation(this.lastDamageSource, impactAngle);
    }

    // Mark animation complete so ZombieManager can remove this zombie
    this.deathAnimationComplete = true;
  }

  /**
   * Check if zombie is currently in death animation
   */
  public isDeathAnimationComplete(): boolean {
    return this.deathAnimationComplete;
  }

  // Get visual size for corpse creation
  /** Redraw the fill only when the displayed percentage actually changes. */
  private redrawHealthBar(percent: number): void {
    const rounded = Math.round(percent);
    if (rounded === this.lastBarPercent) {
      return;
    }
    this.lastBarPercent = rounded;
    const { width, height, offsetY } = this.healthBarSpec;
    this.healthBarFg
      .clear()
      .rect(-width / 2, offsetY, (width * rounded) / 100, height)
      .fill(healthBarColor(rounded));
  }

  private getVisualSize(): number {
    switch (this.type) {
      case GameConfig.ZOMBIE_TYPES.BOSS:
        return 20;
      case GameConfig.ZOMBIE_TYPES.NECRO_TANK:
        return 18;
      case GameConfig.ZOMBIE_TYPES.TANK:
        return 15;
      case GameConfig.ZOMBIE_TYPES.ARMORED:
        return 11;
      case GameConfig.ZOMBIE_TYPES.SWARM:
        return 6;
      case GameConfig.ZOMBIE_TYPES.MECHANICAL:
        return 12;
      default:
        return 10;
    }
  }

  // Check if zombie has reached the end
  public hasReachedEnd(): boolean {
    return this.currentWaypointIndex >= this.waypoints.length;
  }

  // Getters
  public getType(): string {
    return this.type;
  }

  /**
   * Get the renderer's graphics for visual effects
   */
  public getRendererGraphics(): Graphics | null {
    // Access graphics property from BaseZombieRenderer
    return (this.renderer as unknown as { graphics?: Graphics })?.graphics || null;
  }

  public getReward(): number {
    return this.reward;
  }

  public getSpeed(): number {
    return this.speed;
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  /** Set additive speed bonus (rage, etc.) and recalc stack. */
  protected setSpeedBonus(bonus: number): void {
    this.speedBonus = bonus;
    this.recalculateSpeed();
  }

  public applySlow(slowPercent: number): void {
    // Only apply if not already slowed, or if new slow is stronger
    if (!this.isSlowed || slowPercent > this.currentSlowPercent) {
      this.isSlowed = true;
      this.currentSlowPercent = slowPercent;
      this.recalculateSpeed();
    }
  }

  public removeSlow(): void {
    if (this.isSlowed) {
      this.isSlowed = false;
      this.currentSlowPercent = 0;
      this.recalculateSpeed();
    }
  }

  public isCurrentlySlowed(): boolean {
    return this.isSlowed;
  }

  public getDamage(): number {
    return this.damage;
  }

  /**
   * Get damage modifier for this zombie type against a specific tower type
   * @param towerType - The type of tower dealing damage (can be string or TowerType)
   * @returns Damage multiplier (e.g., 1.5 = 150% damage, 0.75 = 75% damage)
   */
  public getDamageModifier(towerType: TowerType | string): number {
    const convertedTowerType =
      typeof towerType === 'string' ? convertToTowerType(towerType) : towerType;
    return getDamageModifier(convertToZombieType(this.type), convertedTowerType);
  }

  /**
   * Override destroy to clean up timers and prevent memory leaks
   */
  public override destroy(): void {
    // Destroy renderer if it exists
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }

    // Call parent destroy to clean up components and PixiJS objects
    super.destroy();
  }

  /**
   * Check if zombie is currently dying (animation in progress)
   */
  public getIsDying(): boolean {
    return this.isDying;
  }

  /**
   * Update fire exposure - called when zombie is standing in fire
   * After 1 second of continuous exposure, zombie gets ignited
   */
  public updateFireExposure(deltaTime: number): void {
    if (this.burn.addExposure(deltaTime, !this.isDying)) {
      // Visual feedback via renderer
      this.renderer?.showBurningEffect?.();
    }
  }

  /**
   * Update burn state - apply damage and manage burn duration
   */
  private updateBurn(deltaTime: number): void {
    if (!this.burn.isBurning || this.isDying) {
      return;
    }

    this.takeDamage(this.burn.damageFor(deltaTime), 'Flame');

    if (this.burn.advance(deltaTime)) {
      this.renderer?.stopBurningEffect?.();
    }
  }

  /**
   * Check if zombie is currently burning
   */
  public getIsBurning(): boolean {
    return this.burn.isBurning;
  }

  /**
   * Get remaining burn duration (for visual effects)
   */
  public getBurnDurationRemaining(): number {
    return this.burn.burnRemainingMs;
  }

  /**
   * Get fire exposure progress (0 to 1, where 1 = ignited)
   */
  public getFireExposureProgress(): number {
    return this.burn.exposureProgress;
  }
}
