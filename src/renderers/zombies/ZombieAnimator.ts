import type { LimbFlags } from '../../components/LimbState';
import { footfallPulse, stepWave, wrapPhase } from '../../utils/WalkStagger';
import { type JointPose, lerpPose } from './rig/jointPose';
import { AnimationState } from './ZombieRenderer';

export interface AnimationData {
  /** Joint angles for the articulated rig (three-quarter view, facing +X). */
  joints: JointPose;
  /** Vertical dip of the whole body in px (positive = down). */
  bodyBob: number;
  /** Per-type personality twitches */
  twitch: number;
  /** Damage-reactive limp factor (0 = healthy, 1 = near death) */
  damageLevel: number;
}

/** Per-type gait personality. Angles in radians, see JointPose for the conventions. */
export interface GaitStyle {
  /** Hip swing amplitude: how far each leg reaches forward/back. Sets the stride length. */
  legSwing: number;
  /** Resting forward reach of the arms (zombie arms out in front). */
  armReach: number;
  /** How much the arms swing with the stride. */
  armSwing: number;
  /** Forward lean of the torso while walking (hunch). */
  lean: number;
  /** Vertical bob per foot plant (px). */
  bob: number;
  /** Head nod with the stride. */
  headBob: number;
  /** <1 = stompy plants (sharper step wave). */
  stepSharpness: number;
  /** Built-in limp on one side. */
  limpBias: number;
  /** Random personality twitches (0 = none, e.g. machines). */
  twitch: number;
}

const ALL_LIMBS: LimbFlags = {
  leftArm: true,
  rightArm: true,
  leftLeg: true,
  rightLeg: true,
};

const TAU = Math.PI * 2;
/** Stride cadence limits (cycles / s), so very slow or fast movers still read as walking. */
const MIN_CADENCE = 0.35;
const MAX_CADENCE = 4.5;
/** How quickly the body falls into / gets up from the prone crawl (per second). */
const PRONE_RATE = 2.5;

const GAITS = {
  BASIC: {
    legSwing: 0.45,
    armReach: 0.75,
    armSwing: 0.15,
    lean: 0.12,
    bob: 1.2,
    headBob: 0.12,
    stepSharpness: 0.6,
    limpBias: 0.15,
    twitch: 1,
  },
  FAST: {
    legSwing: 0.6,
    armReach: 0.3,
    armSwing: 0.55,
    lean: 0.28,
    bob: 1.0,
    headBob: 0.06,
    stepSharpness: 0.55,
    limpBias: 0.05,
    twitch: 0.6,
  },
  TANK: {
    legSwing: 0.3,
    armReach: 0.55,
    armSwing: 0.12,
    lean: 0.2,
    bob: 2.2,
    headBob: 0.05,
    stepSharpness: 0.45,
    limpBias: 0.2,
    twitch: 0.6,
  },
  BOSS: {
    legSwing: 0.28,
    armReach: 0.5,
    armSwing: 0.1,
    lean: 0.18,
    bob: 2.8,
    headBob: 0.04,
    stepSharpness: 0.4,
    limpBias: 0.25,
    twitch: 0.5,
  },
  NECRO_TANK: {
    legSwing: 0.3,
    armReach: 0.65,
    armSwing: 0.12,
    lean: 0.18,
    bob: 2.5,
    headBob: 0.045,
    stepSharpness: 0.42,
    limpBias: 0.22,
    twitch: 0.5,
  },
  STEALTH: {
    legSwing: 0.4,
    armReach: 0.15,
    armSwing: 0.2,
    lean: 0.3,
    bob: 0.5,
    headBob: 0.12,
    stepSharpness: 0.7,
    limpBias: 0.1,
    twitch: 0.8,
  },
  SWARM: {
    legSwing: 0.5,
    armReach: 0.6,
    armSwing: 0.3,
    lean: 0.22,
    bob: 1.2,
    headBob: 0.25,
    stepSharpness: 0.5,
    limpBias: 0.15,
    twitch: 1.2,
  },
  ARMORED: {
    legSwing: 0.32,
    armReach: 0.5,
    armSwing: 0.12,
    lean: 0.08,
    bob: 1.3,
    headBob: 0.05,
    stepSharpness: 0.5,
    limpBias: 0.12,
    twitch: 0.6,
  },
  MECHANICAL: {
    legSwing: 0.35,
    armReach: 0.2,
    armSwing: 0.35,
    lean: 0,
    bob: 0.6,
    headBob: 0.02,
    stepSharpness: 0.85,
    limpBias: 0,
    twitch: 0,
  },
} satisfies Record<string, GaitStyle>;

/** Gait personality for an animator type (falls back to BASIC). */
export function getGaitStyle(zombieType: string): GaitStyle {
  return (GAITS as Record<string, GaitStyle | undefined>)[zombieType] ?? GAITS.BASIC;
}

/**
 * Distance the body travels per full stride cycle (two steps) for a leg of length `leg` swinging
 * ±legSwing: each foot sweeps 2·leg·sin(swing) backwards while planted, twice per cycle.
 * Matching the cadence to this keeps planted feet from sliding.
 */
export function strideLength(leg: number, legSwing: number): number {
  return 4 * leg * Math.sin(legSwing);
}

/**
 * Procedural pose generator for the zombie rig. Walk cadence follows the actual movement speed
 * (slows, limb loss and rage all change it), and the crawl is blended in so a zombie visibly
 * falls onto its front instead of snapping.
 */
export class ZombieAnimator {
  private currentState: AnimationState = AnimationState.WALK;
  private animationTime = 0;
  private gait: GaitStyle;
  private phaseOffset: number;
  /** Stride phase (radians), advanced by cadence so speed changes never jump the pose. */
  private stridePhase: number;
  private damageLevel = 0; // 0 = full health, 1 = near death
  private twitchTimer = 0;
  private twitchValue = 0;
  private limbs: LimbFlags = { ...ALL_LIMBS };
  /** 0 = upright, 1 = fully prone; eases towards the crawl state. */
  private proneBlend = 0;
  private speed = 0;
  private legLen = 7.5;
  private armLen = 7;

  constructor(zombieType: string) {
    this.gait = getGaitStyle(zombieType);
    this.phaseOffset = Math.random() * TAU;
    this.stridePhase = this.phaseOffset;
  }

  /** Limb lengths from the rig layout (px), used to match stride and pull length to speed. */
  setLimbLengths(leg: number, arm: number): void {
    this.legLen = Math.max(1, leg);
    this.armLen = Math.max(1, arm);
  }

  /** Full stride cycles per second at the current speed. */
  getCadence(): number {
    if (this.speed <= 0) {
      return 0;
    }
    const perCycle =
      this.currentState === AnimationState.CRAWL
        ? this.armLen * 1.6
        : strideLength(this.legLen, this.gait.legSwing);
    return Math.min(MAX_CADENCE, Math.max(MIN_CADENCE, this.speed / perCycle));
  }

  /** Reset per-life state for pool reuse. */
  reset(): void {
    this.proneBlend = 0;
    this.damageLevel = 0;
    this.twitchValue = 0;
    this.limbs = { ...ALL_LIMBS };
    this.currentState = AnimationState.WALK;
  }

  update(
    deltaTime: number,
    state: {
      isMoving: boolean;
      health?: number;
      maxHealth?: number;
      isCrawling?: boolean;
      limbs?: LimbFlags;
      /** Current movement speed (px/s). */
      speed?: number;
    }
  ): void {
    const dt = deltaTime / 1000;
    this.animationTime += dt;
    if (state.limbs) {
      this.limbs = state.limbs;
    }
    this.speed = state.isMoving ? Math.max(0, state.speed ?? 25) : 0;

    if (state.isCrawling === true) {
      this.currentState = AnimationState.CRAWL;
    } else {
      this.currentState = state.isMoving ? AnimationState.WALK : AnimationState.IDLE;
    }

    const proneTarget = this.currentState === AnimationState.CRAWL ? 1 : 0;
    const step = PRONE_RATE * dt;
    this.proneBlend += Math.max(-step, Math.min(step, proneTarget - this.proneBlend));

    this.stridePhase += TAU * this.getCadence() * dt;

    // Update damage level for damage-reactive animations
    if (state.health !== undefined && state.maxHealth !== undefined && state.maxHealth > 0) {
      this.damageLevel = 1 - state.health / state.maxHealth;
    }

    // Random twitches - more frequent when damaged
    this.twitchTimer += dt;
    const twitchFrequency = 2 + this.damageLevel * 5;
    if (this.twitchTimer > 1 / twitchFrequency && Math.random() > 0.7) {
      this.twitchValue = (Math.random() - 0.5) * (0.5 + this.damageLevel) * this.gait.twitch;
      this.twitchTimer = 0;
    }
    this.twitchValue *= 0.9;
  }

  getCurrentFrame(): AnimationData {
    const upright =
      this.currentState === AnimationState.IDLE ||
      (this.currentState === AnimationState.CRAWL && this.speed <= 0)
        ? this.getIdleFrame(this.animationTime + this.phaseOffset)
        : this.getWalkFrame(this.stridePhase);

    if (this.proneBlend <= 0) {
      return upright;
    }
    const crawl = this.getCrawlFrame(this.stridePhase);
    if (this.proneBlend >= 1) {
      return crawl;
    }
    return {
      ...crawl,
      joints: lerpPose(upright.joints, crawl.joints, this.proneBlend),
      bodyBob: upright.bodyBob + (crawl.bodyBob - upright.bodyBob) * this.proneBlend,
    };
  }

  private getWalkFrame(stridePhase: number): AnimationData {
    const gait = this.gait;
    const missingFar = !this.limbs.leftLeg;
    const missingNear = !this.limbs.rightLeg;
    const oneLegLimp = missingFar !== missingNear ? 0.55 : 0;

    // Step waves: +1 = leg fully forward. The limp stretches the dragged leg's phase
    const limpDrag = this.damageLevel * 0.55 + gait.limpBias + oneLegLimp;
    const farStep = missingFar
      ? 0
      : stepWave(stridePhase, gait.stepSharpness, limpDrag + (missingNear ? 0.3 : 0));
    const nearStep = missingNear
      ? 0
      : stepWave(stridePhase + Math.PI, gait.stepSharpness, -limpDrag * 0.35);

    // Body dips on each foot plant (twice per stride), with a hitch on the limping side
    const plants = footfallPulse(stridePhase, gait.stepSharpness);
    const limpHitch = farStep > 0 ? limpDrag * plants * 1.2 : 0;
    const oneLegHitch = oneLegLimp * plants * 2.5;

    // The knee folds while the leg swings forward (the phase where the step wave rises)
    const kneeAmp = 0.55 + gait.legSwing;
    const liftFar = missingFar ? 0 : Math.max(0, Math.cos(wrapPhase(stridePhase))) ** 1.4;
    const liftNear = missingNear
      ? 0
      : Math.max(0, Math.cos(wrapPhase(stridePhase + Math.PI))) ** 1.4;

    // Arms reach forward and swing against the opposite leg; the hurt side droops
    const reach = gait.armReach;
    const headStep = stepWave(stridePhase * 0.5 - 0.4, 0.75, limpDrag * 0.4);

    const joints: JointPose = {
      hipL: farStep * gait.legSwing,
      hipR: nearStep * gait.legSwing,
      kneeL: 0.08 + liftFar * kneeAmp,
      kneeR: 0.08 + liftNear * kneeAmp,
      shoulderL: this.limbs.leftArm
        ? reach + nearStep * gait.armSwing - this.damageLevel * 0.15
        : 0,
      shoulderR: this.limbs.rightArm ? reach + farStep * gait.armSwing : 0,
      elbowL: 0.25 + reach * 0.25 + Math.max(0, nearStep) * 0.25,
      elbowR: 0.25 + reach * 0.25 + Math.max(0, farStep) * 0.25,
      // Hunched forward; leans into each plant and more when hurt
      torsoLean: gait.lean + plants * 0.03 + this.damageLevel * 0.08,
      pelvisSway: (farStep - nearStep) * 0.25,
      headTilt: headStep * gait.headBob + this.twitchValue * 0.3,
      headShift: headStep * 0.4 + this.twitchValue * 0.3,
      prone: 0,
    };

    return {
      joints,
      bodyBob: plants * gait.bob + limpHitch + oneLegHitch,
      twitch: this.twitchValue,
      damageLevel: this.damageLevel,
    };
  }

  /**
   * Prone drag: the torso lies forward along the ground, the arms reach ahead and pull, and any
   * remaining legs trail behind.
   */
  private getCrawlFrame(phase: number): AnimationData {
    const pull = stepWave(phase, 0.5, 0.25);
    const opposite = stepWave(phase + Math.PI, 0.5, -0.15);
    const groundBob = footfallPulse(phase, 0.45);

    // Arms point ahead of the head (the torso is rotated ~75° forward, so the shoulder angle is
    // large); each pull drags the hand back towards the chest
    const armFar = this.limbs.leftArm ? 2.05 + pull * 0.45 : 0;
    const armNear = this.limbs.rightArm ? 2.05 + opposite * 0.45 : 0;

    const joints: JointPose = {
      hipL: this.limbs.leftLeg ? -1.2 + opposite * 0.06 : 0,
      hipR: this.limbs.rightLeg ? -1.25 + pull * 0.06 : 0,
      kneeL: this.limbs.leftLeg ? 0.25 : 0,
      kneeR: this.limbs.rightLeg ? 0.3 : 0,
      shoulderL: armFar,
      shoulderR: armNear,
      elbowL: 0.2 + Math.max(0, -pull) * 0.8,
      elbowR: 0.2 + Math.max(0, -opposite) * 0.8,
      torsoLean: 1.3 + (pull - opposite) * 0.04,
      pelvisSway: (pull - opposite) * 0.3,
      // Head lifted to look ahead (counters most of the torso's rotation)
      headTilt: -0.45 + pull * 0.08 + this.twitchValue * 0.2,
      headShift: opposite * 0.3,
      prone: 1,
    };

    return {
      joints,
      bodyBob: groundBob * 0.6 + this.twitchValue * 0.3,
      twitch: this.twitchValue,
      damageLevel: this.damageLevel,
    };
  }

  private getIdleFrame(time: number): AnimationData {
    // Idle can stay sine-based: breathing should feel smooth
    const breathe = Math.sin(time * 1.5);
    const twitch = Math.sin(time * 7.3) * 0.1;
    const damageTwitch = this.damageLevel * Math.sin(time * 11.7) * 0.15;
    const reach = this.gait.armReach * 0.6;

    const joints: JointPose = {
      hipL: 0.04,
      hipR: -0.04,
      kneeL: 0.08,
      kneeR: 0.08,
      shoulderL: this.limbs.leftArm ? reach + breathe * 0.04 - this.damageLevel * 0.1 : 0,
      shoulderR: this.limbs.rightArm ? reach + Math.sin(time * 1.5 + 0.7) * 0.04 : 0,
      elbowL: 0.35 + breathe * 0.05,
      elbowR: 0.35 + Math.sin(time * 1.5 + 0.7) * 0.05,
      torsoLean: this.gait.lean * 0.6 + Math.sin(time * 0.9) * 0.015 + this.damageLevel * 0.05,
      pelvisSway: 0,
      headTilt: Math.sin(time * 1.2) * 0.06 + this.twitchValue * 0.3,
      headShift: Math.sin(time * 1.3) * 0.3 + this.twitchValue * 0.3,
      prone: 0,
    };

    return {
      joints,
      bodyBob: breathe * 0.8 + twitch + damageTwitch,
      twitch: this.twitchValue,
      damageLevel: this.damageLevel,
    };
  }
}
