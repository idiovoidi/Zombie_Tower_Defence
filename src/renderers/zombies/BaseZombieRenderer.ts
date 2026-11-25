import { Container, Graphics } from 'pixi.js';
import type { LimbFlags, LimbId } from '../../components/LimbState';
import { multiplyTint } from '../lighting/zombieLighting';
import { getFlashFilter } from './damageFlash';
import { createHumanoidShadow, type HumanoidPartOptions } from './HumanoidPartBuilder';
import {
  calculateDeathImpulses,
  createRagdollConfig,
  createRagdollStyle,
  getDeathBloodConfig,
  getDetachableBones,
} from './RagdollConfig';
import { RagdollGore } from './RagdollGore';
import { RagdollSkeleton } from './RagdollSkeleton';
import { applyHumanoidPose } from './rig/applyHumanoidPose';
import { assembleHumanoidRig, createHumanoidRig, type HumanoidRigParts } from './rig/HumanoidRig';
import { computeHumanoidRigLayout } from './rig/humanoidRigLayout';
import { ZombieAnimator } from './ZombieAnimator';
import { ParticleType, ZombieParticleSystem } from './ZombieParticleSystem';
import type { IZombieRenderer, ZombieRenderState } from './ZombieRenderer';

export interface DamageEffectConfig {
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
  protected isInitialized = false;

  /** True from the start of the death animation until reset (pool reuse). */
  protected dying = false;
  /** Resolves the pending playDeathAnimation promise; run on game time in update(). */
  private deathResolve: (() => void) | null = null;
  /** Ms left of the post-settle pause before the ragdoll is handed over as a corpse (-1 = not settled). */
  private settleDelay = -1;
  /** Timed (non-ragdoll) death animation, advanced on game time. */
  private timedDeath: { elapsed: number; duration: number; onUpdate: (ms: number) => void } | null =
    null;

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

  // Tint = body (health greying / phase colour) x status (burning) x light cast (fire, blasts, arcs).
  // Each layer has one owner, so no source overwrites another.
  private bodyTint = 0xffffff;
  private statusTint = 0xffffff;
  private lightCast = 0xffffff;
  private appliedTint = -1;
  /** Ms left on the hit flash (a filter overlay, so it can brighten as well as darken). */
  private flashRemaining = 0;
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

    // While dying the death animation owns the body; only the particles keep drawing
    if (this.dying) {
      this.particles.render();
      return;
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
      this.updateWounds(healthPercent);
      this.lastHealthPercent = healthPercent;
    }

    // Apply health tint and render particles
    this.applyHealthTint(healthPercent);
    this.particles.render();

    // Allow subclasses to apply custom effects
    this.applyCustomEffects(healthPercent);

    // Add container to parent if needed
    if (this.container.parent !== container) {
      container.addChild(this.container);
    }
  }

  /**
   * Subclasses implement wound update logic.
   */
  protected abstract updateWounds(healthPercent: number): void;

  /**
   * Override to apply custom effects (e.g., stealth fade, mechanical damage). Not called while dying.
   */
  protected applyCustomEffects(_healthPercent: number): void {
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
    this.updateFlash(deltaTime);

    // Update ragdoll if active
    if (this.isInRagdollDeath && this.ragdoll) {
      this.ragdoll.update(deltaTime);

      // Render ragdoll onto its dedicated graphics: blood on the ground first, then the body
      if (this.ragdollGraphics && !this.ragdollGraphics.destroyed) {
        this.ragdollGraphics.clear();
        this.drawRagdollFrame(this.ragdollGraphics, deltaTime);
      }

      // Once settled, hold the pose briefly, then hand it over as the corpse
      if (this.settleDelay < 0) {
        if (this.ragdoll.isSettled()) {
          this.settleDelay = 300;
        }
      } else {
        this.settleDelay -= deltaTime;
        if (this.settleDelay <= 0) {
          this.finishRagdollDeath();
        }
      }
    }

    if (this.timedDeath) {
      this.timedDeath.elapsed += deltaTime;
      if (this.timedDeath.elapsed >= this.timedDeath.duration) {
        this.timedDeath = null;
        this.resolveDeath();
      } else {
        this.timedDeath.onUpdate(this.timedDeath.elapsed);
      }
    }
  }

  /**
   * Flash the whole zombie towards `color` for `durationMs` of game time (hits, Tesla zaps).
   * Uses a shared colour-matrix filter, so it can brighten dark zombies, which tint cannot.
   */
  flash(color: number, durationMs = 100): void {
    if (this.dying || this.container.destroyed) {
      return;
    }
    this.flashRemaining = Math.max(this.flashRemaining, durationMs);
    this.container.filters = [getFlashFilter(color)];
  }

  private updateFlash(deltaTime: number): void {
    if (this.flashRemaining <= 0) {
      return;
    }
    this.flashRemaining -= deltaTime;
    if (this.flashRemaining <= 0) {
      this.clearFlash();
    }
  }

  private clearFlash(): void {
    this.flashRemaining = 0;
    if (!this.container.destroyed) {
      this.container.filters = null;
    }
  }

  showDamageEffect(damageType: string, _amount: number): void {
    this.flash(this.DAMAGE_FLASH_TINT, 100);

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
   * Play death animation using procedural ragdoll physics. Runs on game time (advanced in
   * update), so it respects pause and game speed; resolves once the body settles.
   *
   * @param killerType - The tower type that killed this zombie
   * @param impactAngle - Direction from damage source to zombie (radians)
   */
  playDeathAnimation(killerType?: string, impactAngle?: number): Promise<void> {
    const angle = impactAngle ?? Math.random() * Math.PI * 2;
    const killer = killerType ?? 'unknown';

    this.setupRagdoll(killer, angle);

    // The ragdoll draws between the (hidden) living body and the particles, so death particles
    // and blood trails stay visible above it
    this.ragdollGraphics = new Graphics();
    const particleGraphics = this.particles.getGraphics();
    if (particleGraphics.parent === this.container) {
      this.container.addChildAt(
        this.ragdollGraphics,
        this.container.getChildIndex(particleGraphics)
      );
    } else {
      this.container.addChild(this.ragdollGraphics);
    }
    this.isInRagdollDeath = true;
    this.ragdollAlpha = 1;
    this.settleDelay = -1;

    this.beginDeath();
    this.emitDeathBurst(killer, angle);

    return new Promise(resolve => {
      this.deathResolve = resolve;
    });
  }

  /** Build the ragdoll for this zombie type and killer: impulses, detached parts, bleeding, style. */
  private setupRagdoll(killer: string, angle: number): void {
    const config = createRagdollConfig(this.zombieTypeName, 18);
    const ragdoll = new RagdollSkeleton(config);
    this.ragdoll = ragdoll;
    ragdoll.initializeFromPose(0, 0, 0);
    ragdoll.applyImpulses(calculateDeathImpulses(killer, angle, this.zombieTypeName));

    // Detach bones for extreme deaths + any limbs already lost while alive
    const detachable = getDetachableBones(killer).filter(b => !this.isLostLimb(b));
    for (const boneName of detachable) {
      ragdoll.detachBone(boneName);
    }

    const bloodConfig = getDeathBloodConfig(killer);
    for (const bp of bloodConfig) {
      ragdoll.addBloodEmitPoint(bp.boneName, bp.boneT, bp.rate, bp.duration);
    }
    // Torn-off parts spurt from both the stump and the severed end
    let bloodAmount = bloodConfig.reduce((sum, bp) => sum + (bp.rate * bp.duration) / 1000, 0);
    for (const boneName of detachable) {
      ragdoll.addBloodEmitPoint(boneName, 0, 18, 900);
      ragdoll.addBloodEmitPoint('torso', stumpPointOnTorso(boneName), 26, 1100);
      bloodAmount += 40;
    }

    // Killer-specific wounds, tint and blood colour; lost limbs stay missing
    const style = createRagdollStyle(this.zombieTypeName, killer);
    ragdoll.setStyle(style);
    for (const boneName of ['arm_l', 'arm_r', 'leg_l', 'leg_r']) {
      if (this.isLostLimb(boneName)) {
        ragdoll.removeLimb(boneName);
      }
    }
    this.ragdollGroundY = config.groundY;
    this.ragdollGore = new RagdollGore(
      style.blood ?? 0x7a0a0a,
      config.bones[0].length,
      bloodAmount
    );
    ragdoll.onGroundHit = (x, y, speed) => this.ragdollGore?.addSplat(x, y, speed);
    ragdoll.onBloodEmit = (x, y, vx, vy) => {
      this.particles.emitWithVelocity(ParticleType.BLOOD_TRAIL, x, y, vx, vy, {
        lifetime: 600,
        size: 2,
      });
    };
  }

  /** Death particles thrown in the impact direction, plus mist and gore for heavy kills. */
  private emitDeathBurst(killer: string, angle: number): void {
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

    const explosive = killer === 'Grenade' || killer === 'Tesla';
    if (explosive) {
      this.particles.emit(ParticleType.BLOOD_MIST, 0, 0, {
        count: 8,
        velocity: 40,
        lifetime: 1200,
        size: 6,
      });
    }
    if (explosive || killer === 'Shotgun') {
      const grenade = killer === 'Grenade';
      this.particles.emit(
        ParticleType.GORE_CHUNK,
        0,
        0,
        { count: grenade ? 6 : 3, velocity: grenade ? 120 : 80, lifetime: 1500, size: 4 },
        { angle, spread: grenade ? 3.0 : 1.5 }
      );
    }
  }

  /**
   * Enter the dying state: the living body hides (particles stay), flashes stop, and render()
   * stops posing the rig. Subclasses with their own death animation call this too.
   */
  protected beginDeath(): void {
    this.dying = true;
    this.clearFlash();
    if (this.isInitialized) {
      this.rig.body.visible = false;
      this.shadowPart.visible = false;
    }
  }

  /**
   * Timed death animation (no ragdoll) driven by game time: `onUpdate` gets the elapsed ms each
   * frame and the promise resolves after `durationMs`. The body stays visible for the effect.
   */
  protected playTimedDeath(
    durationMs: number,
    onUpdate: (elapsedMs: number) => void
  ): Promise<void> {
    this.dying = true;
    this.clearFlash();
    for (const p of this.DEATH_PARTICLES) {
      this.particles.emit(p.type, 0, 0, {
        count: p.count,
        velocity: p.velocity,
        lifetime: p.lifetime,
        size: p.size,
      });
    }
    this.timedDeath = { elapsed: 0, duration: durationMs, onUpdate };
    return new Promise(resolve => {
      this.deathResolve = resolve;
    });
  }

  private finishRagdollDeath(): void {
    this.captureRestingCorpse();
    this.isInRagdollDeath = false;
    this.settleDelay = -1;
    if (this.ragdollGraphics && !this.ragdollGraphics.destroyed) {
      this.ragdollGraphics.destroy();
    }
    this.ragdollGraphics = null;
    this.ragdoll = null;
    this.resolveDeath();
  }

  private resolveDeath(): void {
    const resolve = this.deathResolve;
    this.deathResolve = null;
    resolve?.();
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

  reset(): void {
    // End any death animation in progress. Its promise resolves now; Zombie ignores a death that
    // finishes after the zombie has been reused.
    this.timedDeath = null;
    this.settleDelay = -1;
    this.dying = false;
    this.resolveDeath();
    // Reset container transform and visibility
    this.container.alpha = 1;
    this.clearFlash();
    this.lightCast = 0xffffff;
    this.statusTint = 0xffffff;
    this.setTint(0xffffff);
    this.container.position.set(0, 0);
    this.container.rotation = 0;
    this.container.scale.set(1, 1);
    if (this.isInitialized) {
      this.rig.body.visible = true;
      this.shadowPart.visible = true;
    }
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
    }
    this.ragdollGraphics = null;
    if (this.restingCorpse && !this.restingCorpse.destroyed) {
      this.restingCorpse.destroy();
    }
    this.restingCorpse = null;
  }

  destroy(): void {
    this.timedDeath = null;
    this.resolveDeath();
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

    // Orange status tint while burning (its own layer, so health greying doesn't wipe it)
    this.setStatusTint(BURNING_TINT);

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

    this.setStatusTint(0xffffff);
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
   * Set the zombie's body tint (health greying, phase colours). Owned by applyHealthTint, which
   * runs every frame; status and light layers are multiplied in, so none overwrites another.
   */
  protected setTint(color: number): void {
    this.bodyTint = color;
    this.applyComposedTint();
  }

  /** Status tint layer (burning orange); 0xffffff = none. */
  protected setStatusTint(color: number): void {
    this.statusTint = color;
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
    if (this.container.destroyed) {
      return;
    }
    const tint = composeZombieTint(this.bodyTint, this.statusTint, this.lightCast);
    // Only touch the display object when the value changes (this runs every frame)
    if (tint !== this.appliedTint) {
      this.container.tint = tint;
      this.appliedTint = tint;
    }
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

/** Status tint while burning: warm orange, softened so the zombie's own colours still read. */
export const BURNING_TINT = 0xffa060;

/** Final zombie tint: body (health / phase) x status (burning) x nearby-light cast. */
export function composeZombieTint(body: number, status: number, light: number): number {
  return multiplyTint(multiplyTint(body, status), light);
}

/** Where on the torso bone (0 = neck end, 1 = hip end) a part torn off at death leaves its stump. */
function stumpPointOnTorso(boneName: string): number {
  if (boneName === 'head') {
    return 0;
  }
  return boneName.startsWith('leg') ? 1 : 0.1;
}
