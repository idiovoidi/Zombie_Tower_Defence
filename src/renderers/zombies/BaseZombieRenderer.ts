import { Container, Graphics } from 'pixi.js';
import type { LimbFlags, LimbId } from '../../components/LimbState';
import { EffectCleanupManager } from '../../utils/EffectCleanupManager';
import { createHumanoidShadow, type HumanoidPartOptions } from './HumanoidPartBuilder';
import { applyHumanoidPose } from './rig/applyHumanoidPose';
import { assembleHumanoidRig, createHumanoidRig, type HumanoidRigParts } from './rig/HumanoidRig';
import { computeHumanoidRigLayout } from './rig/humanoidRigLayout';
import {
  calculateDeathImpulses,
  createRagdollConfig,
  createRagdollStyle,
  getDeathBloodConfig,
  getDetachableBones,
} from './RagdollConfig';
import { multiplyTint } from '../lighting/zombieLighting';
import { RagdollGore } from './RagdollGore';
import { RagdollSkeleton } from './RagdollSkeleton';
import { ZombieAnimator } from './ZombieAnimator';
import { ParticleType, ZombieParticleSystem } from './ZombieParticleSystem';
import type { IZombieRenderer, ZombieRenderState } from './ZombieRenderer';

export interface DeathAnimConfig {
  phase1Duration: number; // ms
  phase2Duration: number; // ms
  phase3Duration: number; // ms
  phase1MaxRotation: number;
  phase1MaxScale: number;
  phase3YDrift: number;
}

export interface DamageEffectConfig {
  flashTint: number;
  particles: Array<{
    type: ParticleType;
    count: number;
    velocity: number;
    lifetime: number;
    size: number;
  }>;
}

export interface DeathParticleConfig {
  particles: Array<{
    type: ParticleType;
    count: number;
    velocity: number;
    lifetime: number;
    size: number;
  }>;
}

/**
 * Abstract base for all zombie renderers.
 * Provides shared constructor, destroy, update, showDamageEffect, playDeathAnimation, getContainer.
 * Subclasses implement render() and supply config via protected readonly properties.
 *
 * Now uses a retained-mode skeletal system compliant with PixiJS v8.
 */
export abstract class BaseZombieRenderer implements IZombieRenderer {
  protected container: Container;
  protected animator: ZombieAnimator;
  protected particles: ZombieParticleSystem;
  protected deathAnimationFrame: number | null = null;
  protected isInitialized = false;

  // Burning effect properties
  protected isBurning = false;
  protected burnParticleTimer = 0;

  // Ragdoll death state
  private ragdoll: RagdollSkeleton | null = null;
  private isInRagdollDeath = false;
  private ragdollGraphics: Graphics | null = null;
  private ragdollAlpha = 1;
  private ragdollGore: RagdollGore | null = null;
  private ragdollGroundY = 18;
  /** Final resting pose of the ragdoll, handed to the corpse system once it settles. */
  private restingCorpse: Graphics | null = null;

  // Track last known zombie type for ragdoll config
  private zombieTypeName = 'Basic';

  // Common skeletal parts (shared across all zombie renderers)
  protected shadowPart!: Graphics;
  protected torsoPart!: Graphics;
  protected headPart!: Graphics;
  protected woundsPart!: Graphics;
  /** Articulated skeleton shared by every zombie type (built in buildHumanoidParts). */
  protected rig!: HumanoidRigParts;
  protected lastHealthPercent = 1.0;

  // Tint = base (health / burning / phase colour) x light cast (nearby fire, explosions, arcs)
  private baseTint = 0xffffff;
  private lightCast = 0xffffff;
  private isFlashing = false;
  private currentLimbs: LimbFlags = {
    leftArm: true,
    rightArm: true,
    leftLeg: true,
    rightLeg: true,
  };

  /** Animator type string passed to ZombieAnimator */
  protected abstract readonly ANIMATOR_TYPE: string;

  /** Tint color flashed on damage */
  protected abstract readonly DAMAGE_FLASH_TINT: number;

  /** Particles emitted on damage */
  protected abstract readonly DAMAGE_PARTICLES: DamageEffectConfig['particles'];

  /** Particles emitted at death */
  protected abstract readonly DEATH_PARTICLES: DeathParticleConfig['particles'];

  /** Timing/motion config for the 3-phase death animation */
  protected abstract readonly DEATH_ANIM: DeathAnimConfig;

  constructor() {
    this.container = new Container();
    // ZombieAnimator is constructed after subclass sets ANIMATOR_TYPE
    // We defer via a post-construction init pattern using a getter
    this.animator = new ZombieAnimator(this.getAnimatorType());
    this.particles = new ZombieParticleSystem();
  }

  /** Override if ANIMATOR_TYPE isn't available at super() call time */
  protected getAnimatorType(): string {
    return this.ANIMATOR_TYPE;
  }

  /**
   * Set the zombie type name for ragdoll configuration.
   * Called by subclasses or externally to configure death physics.
   */
  public setZombieType(typeName: string): void {
    this.zombieTypeName = typeName;
  }

  /**
   * Template method for rendering. Handles common logic and delegates to subclass hooks.
   */
  render(container: Container, state: ZombieRenderState): void {
    if (!this.isInitialized) {
      this.initParts();
    }

    const anim = this.animator.getCurrentFrame();
    const healthPercent = state.health / state.maxHealth;

    if (state.limbs) {
      this.currentLimbs = state.limbs;
    }

    applyHumanoidPose(this.rig, anim.joints, anim.bodyBob);
    this.applyLimbVisibility(this.currentLimbs);

    // Update wounds if health changed significantly
    if (Math.abs(this.lastHealthPercent - healthPercent) > 0.05) {
      this.updateWounds(healthPercent, anim);
      this.lastHealthPercent = healthPercent;
    }

    // Apply health tint and render particles
    this.applyHealthTint(healthPercent);
    this.particles.render();

    // Allow subclasses to apply custom effects
    this.applyCustomEffects(healthPercent, anim);

    // Add container to parent if needed
    if (this.container.parent !== container) {
      container.addChild(this.container);
    }
  }

  /**
   * Subclasses implement wound update logic.
   */
  protected abstract updateWounds(
    healthPercent: number,
    anim: {
      leftLegOffset: number;
      rightLegOffset: number;
      bodyBob: number;
      leftArmAngle: number;
      rightArmAngle: number;
      headSway: number;
    }
  ): void;

  /**
   * Override to apply custom effects (e.g., stealth fade, mechanical damage).
   */
  protected applyCustomEffects(
    _healthPercent: number,
    _anim: {
      leftLegOffset: number;
      rightLegOffset: number;
      bodyBob: number;
      leftArmAngle: number;
      rightArmAngle: number;
      headSway: number;
    }
  ): void {
    // Default: no custom effects
  }

  /**
   * Subclasses implement this to create their static graphics parts.
   */
  protected abstract initParts(): void;

  /**
   * Build and assign the standard humanoid part set (shadow, legs, torso, head, arms).
   * Callers may tweak parts afterwards, then must call finishInitParts().
   */
  protected buildHumanoidParts(
    palette: HumanoidPartOptions,
    shadow?: { y?: number; size?: number }
  ): void {
    const scale = palette.scale ?? 1;
    const groundY = shadow?.y ?? 15 * scale;
    const layout = computeHumanoidRigLayout(palette, groundY);
    const rig = createHumanoidRig(palette, layout);

    this.rig = rig;
    this.shadowPart = createHumanoidShadow(groundY, shadow?.size ?? 8 * scale);
    // Parts that subclasses may still decorate (Stealth draws an aura on the head)
    this.torsoPart = rig.torso;
    this.headPart = rig.head;
  }

  /**
   * Y of the head centre in the wounds layer's space (origin = torso centre), for effects that
   * mark the head. Falls back to the legacy value when there is no rig.
   */
  protected headCenterInWoundsSpace(): number {
    const l = this.rig.layout;
    const headCenterTorsoSpace = l.neckTopY + 0.6 * l.scale - l.headPivotDrop;
    return headCenterTorsoSpace + l.torsoH / 2;
  }

  /** Shared tail for initParts — creates wounds layer and registers skeletal parts. */
  protected finishInitParts(): void {
    this.woundsPart = new Graphics();
    this.addPartsToContainer();
    this.isInitialized = true;
  }

  /** Draw blood wounds with common humanoid defaults. */
  protected updateBloodWounds(
    healthPercent: number,
    bloodColor: number,
    options: { maxWounds?: number; alpha?: number } = {}
  ): void {
    this.drawWounds(
      this.woundsPart,
      healthPercent,
      0,
      bloodColor,
      options.maxWounds ?? 4,
      7,
      9,
      1,
      1.5,
      options.alpha ?? 0.7
    );
  }

  /**
   * Add skeletal parts to container in correct z-order.
   * This is shared across all zombie renderers.
   */
  protected addPartsToContainer(): void {
    this.container.addChild(this.shadowPart);
    assembleHumanoidRig(this.rig, this.woundsPart);
    this.container.addChild(this.rig.body);
    this.container.addChild(this.particles.getGraphics());
  }

  /** Hide detached limbs; keep parts present for pool reuse. */
  protected applyLimbVisibility(limbs: LimbFlags): void {
    if (!this.isInitialized) {
      return;
    }
    this.rig.leftArm.root.visible = limbs.leftArm;
    this.rig.rightArm.root.visible = limbs.rightArm;
    this.rig.leftLeg.root.visible = limbs.leftLeg;
    this.rig.rightLeg.root.visible = limbs.rightLeg;
  }

  update(deltaTime: number, state: ZombieRenderState): void {
    // Pass health / crawl / limb info to animator
    this.animator.update(deltaTime, {
      isMoving: state.isMoving,
      health: state.health,
      maxHealth: state.maxHealth,
      isCrawling: state.isCrawling,
      limbs: state.limbs,
    });
    if (state.limbs) {
      this.currentLimbs = state.limbs;
    }
    this.particles.update(deltaTime);
    this.updateBurningEffect(deltaTime);

    // Update ragdoll if active
    if (this.isInRagdollDeath && this.ragdoll) {
      this.ragdoll.update(deltaTime);

      // Render ragdoll onto its dedicated graphics: blood on the ground first, then the body
      if (this.ragdollGraphics && !this.ragdollGraphics.destroyed) {
        this.ragdollGraphics.clear();
        this.drawRagdollFrame(this.ragdollGraphics, deltaTime);
        this.particles.render(); // Note: ZombieParticleSystem now clears its own graphics
      }
    }
  }

  showDamageEffect(damageType: string, _amount: number): void {
    this.isFlashing = true;
    this.container.tint = this.DAMAGE_FLASH_TINT;
    const timeout = EffectCleanupManager.registerTimeout(
      setTimeout(() => {
        EffectCleanupManager.clearTimeout(timeout);
        this.isFlashing = false;
        this.applyComposedTint();
      }, 100)
    );

    // Emit directional damage particles if we have a damage direction
    const direction =
      damageType !== 'unknown'
        ? { angle: Math.random() * Math.PI * 2, spread: Math.PI * 1.5 }
        : undefined;

    for (const p of this.DAMAGE_PARTICLES) {
      this.particles.emit(
        p.type,
        0,
        0,
        {
          count: p.count,
          velocity: p.velocity,
          lifetime: p.lifetime,
          size: p.size,
        },
        direction
      );
    }
  }

  /**
   * Gore burst when a limb is severed while the zombie is still alive.
   */
  onLimbLost(limb: LimbId): void {
    this.currentLimbs = { ...this.currentLimbs, [limb]: false };
    this.applyLimbVisibility(this.currentLimbs);

    const offset = this.getLimbGoreOffset(limb);
    this.particles.emit(ParticleType.BLOOD_SPLATTER, offset.x, offset.y, {
      count: 10,
      velocity: 55,
      lifetime: 700,
      size: 3.5,
    });
    this.particles.emit(ParticleType.GORE_CHUNK, offset.x, offset.y, {
      count: 4,
      velocity: 45,
      lifetime: 900,
      size: 3,
    });
    this.particles.emit(ParticleType.BLOOD_MIST, offset.x, offset.y, {
      count: 5,
      velocity: 30,
      lifetime: 800,
      size: 5,
    });

    // Stump mark on wounds layer
    if (this.isInitialized && this.woundsPart && !this.woundsPart.destroyed) {
      this.woundsPart.circle(offset.x, offset.y, 2.5).fill({ color: 0x660000, alpha: 0.85 });
      this.woundsPart.circle(offset.x, offset.y, 1.2).fill({ color: 0xaa0000, alpha: 0.7 });
    }
  }

  private getLimbGoreOffset(limb: LimbId): { x: number; y: number } {
    switch (limb) {
      case 'leftArm':
        return { x: -6, y: 2 };
      case 'rightArm':
        return { x: 6, y: 2 };
      case 'leftLeg':
        return { x: -3, y: 10 };
      case 'rightLeg':
        return { x: 3, y: 10 };
      default:
        return { x: 0, y: 4 };
    }
  }

  /**
   * Play death animation using procedural ragdoll physics.
   *
   * @param killerType - The tower type that killed this zombie
   * @param impactAngle - Direction from damage source to zombie (radians)
   */
  async playDeathAnimation(killerType?: string, impactAngle?: number): Promise<void> {
    const angle = impactAngle ?? Math.random() * Math.PI * 2;
    const killer = killerType ?? 'unknown';

    // Create ragdoll skeleton from zombie type config
    const config = createRagdollConfig(this.zombieTypeName, 18);
    this.ragdoll = new RagdollSkeleton(config);

    // Initialize from current position (center of container)
    this.ragdoll.initializeFromPose(0, 0, 0);

    // Calculate and apply death impulses
    const impulses = calculateDeathImpulses(killer, angle, this.zombieTypeName);
    this.ragdoll.applyImpulses(impulses);

    // Detach bones for extreme deaths + any limbs already lost while alive
    const detachable = new Set(getDetachableBones(killer));
    for (const boneName of detachable) {
      if (!this.isLostLimb(boneName)) {
        this.ragdoll.detachBone(boneName);
      }
    }

    // Add blood emission points
    const bloodConfig = getDeathBloodConfig(killer);
    for (const bp of bloodConfig) {
      this.ragdoll.addBloodEmitPoint(bp.boneName, bp.boneT, bp.rate, bp.duration);
    }
    // Torn-off parts spurt from both the stump and the severed end
    let bloodAmount = bloodConfig.reduce((sum, bp) => sum + (bp.rate * bp.duration) / 1000, 0);
    for (const boneName of detachable) {
      if (this.isLostLimb(boneName)) continue;
      const tornFromHead = boneName === 'head';
      this.ragdoll.addBloodEmitPoint(boneName, 0, 18, 900);
      this.ragdoll.addBloodEmitPoint(
        'torso',
        tornFromHead ? 0 : boneName.startsWith('leg') ? 1 : 0.1,
        26,
        1100
      );
      bloodAmount += 40;
    }

    // Killer-specific wounds, tint and blood colour; lost limbs stay missing
    const style = createRagdollStyle(this.zombieTypeName, killer);
    this.ragdoll.setStyle(style);
    for (const boneName of ['arm_l', 'arm_r', 'leg_l', 'leg_r']) {
      if (this.isLostLimb(boneName)) {
        this.ragdoll.removeLimb(boneName);
      }
    }
    this.ragdollGroundY = config.groundY;
    this.ragdollGore = new RagdollGore(
      style.blood ?? 0x7a0a0a,
      config.bones[0].length,
      bloodAmount
    );
    this.ragdoll.onGroundHit = (x, y, speed) => this.ragdollGore?.addSplat(x, y, speed);

    // Wire ragdoll blood emission to particle system
    this.ragdoll.onBloodEmit = (x, y, vx, vy) => {
      this.particles.emitWithVelocity(ParticleType.BLOOD_TRAIL, x, y, vx, vy, {
        lifetime: 600,
        size: 2,
      });
    };

    // Create ragdoll graphics
    this.ragdollGraphics = new Graphics();
    this.isInRagdollDeath = true;
    this.ragdollAlpha = 1;

    // Hide original zombie container
    this.container.alpha = 0;

    // Emit initial death particles in impact direction
    for (const p of this.DEATH_PARTICLES) {
      this.particles.emit(
        p.type,
        0,
        0,
        {
          count: Math.floor(p.count * 1.5),
          velocity: p.velocity * 1.2,
          lifetime: p.lifetime,
          size: p.size,
        },
        { angle, spread: 1.2 }
      );
    }

    // Blood mist for explosive deaths
    if (killer === 'Grenade' || killer === 'Tesla') {
      this.particles.emit(ParticleType.BLOOD_MIST, 0, 0, {
        count: 8,
        velocity: 40,
        lifetime: 1200,
        size: 6,
      });
    }

    // Gore chunks for heavy kills
    if (killer === 'Grenade' || killer === 'Shotgun' || killer === 'Tesla') {
      this.particles.emit(
        ParticleType.GORE_CHUNK,
        0,
        0,
        {
          count: killer === 'Grenade' ? 6 : 3,
          velocity: killer === 'Grenade' ? 120 : 80,
          lifetime: 1500,
          size: 4,
        },
        { angle, spread: killer === 'Grenade' ? 3.0 : 1.5 }
      );
    }

    // Wait for ragdoll to settle
    return new Promise(resolve => {
      const checkDone = () => {
        if (!this.ragdoll || this.ragdoll.isSettled()) {
          // Give a brief fade-out period after settlement
          setTimeout(() => {
            this.captureRestingCorpse();
            this.isInRagdollDeath = false;
            if (this.ragdollGraphics && !this.ragdollGraphics.destroyed) {
              this.ragdollGraphics.destroy();
              this.ragdollGraphics = null;
            }
            this.ragdoll = null;
            resolve();
          }, 300);
        } else {
          this.deathAnimationFrame = requestAnimationFrame(checkDone);
        }
      };
      this.deathAnimationFrame = requestAnimationFrame(checkDone);
    });
  }

  private isLostLimb(boneName: string): boolean {
    switch (boneName) {
      case 'arm_l':
        return !this.currentLimbs.leftArm;
      case 'arm_r':
        return !this.currentLimbs.rightArm;
      case 'leg_l':
        return !this.currentLimbs.leftLeg;
      case 'leg_r':
        return !this.currentLimbs.rightLeg;
      default:
        return false;
    }
  }

  private captureRestingCorpse(): void {
    if (!this.ragdoll) {
      return;
    }
    const g = new Graphics();
    this.ragdollGore?.draw(g, 1);
    this.ragdoll.render(g, 1);
    this.restingCorpse = g;
  }

  private drawRagdollFrame(g: Graphics, deltaTime: number): void {
    if (!this.ragdoll) {
      return;
    }
    this.ragdollGore?.update(
      deltaTime,
      this.ragdoll.getCenterOfMass().x,
      this.ragdollGroundY,
      this.ragdoll.isSettled()
    );
    this.ragdollGore?.draw(g, this.ragdollAlpha);
    this.ragdoll.render(g, this.ragdollAlpha);
  }

  /** Renderers with their own death effect (dissolve, flicker) opt out of leaving a ragdoll corpse. */
  public hasRagdollCorpse(): boolean {
    return true;
  }

  /**
   * Take the settled ragdoll as a static drawing (blood pool + body) for the corpse system.
   * Returns null if the renderer had no ragdoll to hand over. Ownership passes to the caller.
   */
  public takeRagdollCorpse(): Graphics | null {
    const corpse = this.restingCorpse;
    this.restingCorpse = null;
    return corpse;
  }

  /**
   * Get the ragdoll graphics for rendering by the zombie container.
   */
  public getRagdollGraphics(): Graphics | null {
    return this.ragdollGraphics;
  }

  /**
   * Check if currently in ragdoll death mode.
   */
  public isRagdolling(): boolean {
    return this.isInRagdollDeath;
  }

  reset(): void {
    // Cancel any ongoing death animation
    if (this.deathAnimationFrame !== null) {
      cancelAnimationFrame(this.deathAnimationFrame);
      this.deathAnimationFrame = null;
    }
    // Reset container transform and visibility
    this.container.alpha = 1;
    this.lightCast = 0xffffff;
    this.isFlashing = false;
    this.setTint(0xffffff);
    this.container.position.set(0, 0);
    this.container.rotation = 0;
    this.container.scale.set(1, 1);
    // Clear any particles
    this.particles.clear?.();
    // Stop burning effect
    this.stopBurningEffect();

    // Restore all limbs for pool reuse
    this.currentLimbs = {
      leftArm: true,
      rightArm: true,
      leftLeg: true,
      rightLeg: true,
    };
    this.lastHealthPercent = 1.0;
    this.applyLimbVisibility(this.currentLimbs);
    if (this.isInitialized && this.woundsPart && !this.woundsPart.destroyed) {
      this.woundsPart.clear();
    }

    // Clean up ragdoll state
    this.isInRagdollDeath = false;
    this.ragdoll = null;
    this.ragdollGore = null;
    this.ragdollAlpha = 1;
    if (this.ragdollGraphics && !this.ragdollGraphics.destroyed) {
      this.ragdollGraphics.destroy();
      this.ragdollGraphics = null;
    }
    if (this.restingCorpse && !this.restingCorpse.destroyed) {
      this.restingCorpse.destroy();
    }
    this.restingCorpse = null;
  }

  destroy(): void {
    if (this.deathAnimationFrame !== null) {
      cancelAnimationFrame(this.deathAnimationFrame);
      this.deathAnimationFrame = null;
    }
    this.container.destroy({ children: true });
    this.particles.destroy();

    if (this.ragdollGraphics && !this.ragdollGraphics.destroyed) {
      this.ragdollGraphics.destroy();
    }
  }

  getGraphics(): Container {
    return this.container;
  }

  /**
   * Show burning effect - emit fire particles from zombie
   */
  showBurningEffect(): void {
    if (this.isBurning) {
      return;
    }
    this.isBurning = true;
    this.burnParticleTimer = 0;

    // Apply orange tint to indicate burning
    this.setTint(0xff6600);

    // Emit initial burst of fire particles
    this.particles.emit(ParticleType.FIRE, 0, -5, {
      count: 8,
      velocity: 40,
      lifetime: 800,
      size: 5,
    });

    // Emit smoke
    this.particles.emit(ParticleType.SMOKE, 0, -10, {
      count: 4,
      velocity: 25,
      lifetime: 1200,
      size: 6,
    });
  }

  /**
   * Stop burning effect
   */
  stopBurningEffect(): void {
    if (!this.isBurning) {
      return;
    }
    this.isBurning = false;
    this.burnParticleTimer = 0;

    // Reset tint if not already dead
    if (!this.container.destroyed && this.container.alpha > 0.5) {
      this.setTint(0xffffff);
    }
  }

  /**
   * Update burning effect - emit continuous fire particles
   */
  updateBurningEffect(deltaTime: number): void {
    if (!this.isBurning) {
      return;
    }

    // Emit fire particles periodically while burning
    this.burnParticleTimer += deltaTime;
    if (this.burnParticleTimer >= 200) {
      // Every 200ms
      this.burnParticleTimer = 0;

      // Random position around the zombie body
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = -5 - Math.random() * 10;

      this.particles.emit(ParticleType.FIRE, offsetX, offsetY, {
        count: 2,
        velocity: 30,
        lifetime: 600,
        size: 4,
      });
    }
  }

  /**
   * Draw wound circles on the zombie body based on health percentage.
   * Now takes a target Graphics object.
   */
  protected drawWounds(
    graphics: Graphics,
    healthPercent: number,
    torsoY: number,
    woundColor: number,
    maxWounds = 4,
    spreadX = 7,
    spreadY = 9,
    baseSize = 1,
    sizeVar = 1.2,
    alpha = 0.7
  ): void {
    graphics.clear();
    const woundCount = Math.floor((1 - healthPercent) * maxWounds);
    for (let i = 0; i < woundCount; i++) {
      const x = (Math.random() - 0.5) * spreadX;
      const y = torsoY + (Math.random() - 0.5) * spreadY;
      graphics.circle(x, y, baseSize + Math.random() * sizeVar).fill({ color: woundColor, alpha });
    }
  }

  /**
   * Set the zombie's base tint (health greying, burning orange, phase colours). The nearby-light
   * cast is multiplied in, so lighting never fights the other tint sources.
   */
  protected setTint(color: number): void {
    this.baseTint = color;
    this.applyComposedTint();
  }

  /** Colour cast from nearby point lights (0xffffff = none). Cheap: only touches the tint on change. */
  setLightCast(color: number): void {
    if (color === this.lightCast) {
      return;
    }
    this.lightCast = color;
    this.applyComposedTint();
  }

  private applyComposedTint(): void {
    // A damage flash owns the tint for its 100ms; the composed tint is restored afterwards
    if (this.isFlashing || this.container.destroyed) {
      return;
    }
    this.container.tint = multiplyTint(this.baseTint, this.lightCast);
  }

  /**
   * Apply standard grey tint based on health percentage.
   */
  protected applyHealthTint(healthPercent: number): void {
    if (healthPercent < 0.25) {
      this.setTint(0x888888);
    } else if (healthPercent < 0.5) {
      this.setTint(0xaaaaaa);
    } else if (healthPercent < 0.75) {
      this.setTint(0xcccccc);
    } else {
      this.setTint(0xffffff);
    }
  }
}
