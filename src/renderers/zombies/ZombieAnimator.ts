import type { LimbFlags } from '../../components/LimbState';
import { footfallPulse, stepWave, wrapPhase } from '../../utils/WalkStagger';
import type { JointPose } from './rig/jointPose';
import { AnimationState } from './ZombieRenderer';

export interface AnimationData {
  bodyBob: number;
  headTilt: number;
  headSway: number;
  leftArmAngle: number;
  rightArmAngle: number;
  leftLegOffset: number;
  rightLegOffset: number;
  limbSwing: number;
  /** Per-type personality twitches */
  twitch: number;
  /** Damage-reactive limp factor (0 = healthy, 1 = near death) */
  damageLevel: number;
  /** Joint angles for the articulated rig (the fields above still drive the legacy part path). */
  joints: JointPose;
}

const ALL_LIMBS: LimbFlags = {
  leftArm: true,
  rightArm: true,
  leftLeg: true,
  rightLeg: true,
};

export class ZombieAnimator {
  private currentState: AnimationState = AnimationState.WALK;
  private animationTime = 0;
  private zombieType: string;
  private phaseOffset: number;
  private damageLevel = 0; // 0 = full health, 1 = near death
  private twitchTimer = 0;
  private twitchValue = 0;
  private limbs: LimbFlags = { ...ALL_LIMBS };
  private isCrawling = false;

  constructor(zombieType: string) {
    this.zombieType = zombieType;
    this.phaseOffset = Math.random() * Math.PI * 2;
  }

  update(
    deltaTime: number,
    state: {
      isMoving: boolean;
      health?: number;
      maxHealth?: number;
      isCrawling?: boolean;
      limbs?: LimbFlags;
    }
  ): void {
    this.animationTime += deltaTime / 1000;
    this.isCrawling = state.isCrawling === true;
    if (state.limbs) {
      this.limbs = state.limbs;
    }

    if (this.isCrawling) {
      this.currentState = AnimationState.CRAWL;
    } else {
      this.currentState = state.isMoving ? AnimationState.WALK : AnimationState.IDLE;
    }

    // Update damage level for damage-reactive animations
    if (state.health !== undefined && state.maxHealth !== undefined && state.maxHealth > 0) {
      this.damageLevel = 1 - state.health / state.maxHealth;
    }

    // Random twitches - more frequent when damaged
    this.twitchTimer += deltaTime / 1000;
    const twitchFrequency = 2 + this.damageLevel * 5; // More twitches when hurt
    if (this.twitchTimer > 1 / twitchFrequency && Math.random() > 0.7) {
      this.twitchValue = (Math.random() - 0.5) * (0.5 + this.damageLevel);
      this.twitchTimer = 0;
    }
    // Decay twitches
    this.twitchValue *= 0.9;
  }

  getCurrentFrame(): AnimationData {
    const time = this.animationTime + this.phaseOffset;

    if (this.currentState === AnimationState.CRAWL) {
      return this.getCrawlFrame(time);
    }
    if (this.currentState === AnimationState.WALK) {
      return this.getWalkFrame(time);
    }
    return this.getIdleFrame(time);
  }

  private getWalkFrame(time: number): AnimationData {
    const speed = this.getAnimationSpeed();
    const gait = this.getGaitStyle();

    // Extra limp when one leg is missing
    const missingLeftLeg = !this.limbs.leftLeg;
    const missingRightLeg = !this.limbs.rightLeg;
    const oneLegLimp = missingLeftLeg !== missingRightLeg ? 0.55 : 0;

    // Stride phase — shaped step waves, not stacked sines
    const stridePhase = time * 4 * speed;
    const limpDrag = this.damageLevel * 0.55 + gait.limpBias + oneLegLimp;
    const leftStep = missingLeftLeg
      ? 0
      : stepWave(stridePhase, gait.stepSharpness, limpDrag + (missingRightLeg ? 0.3 : 0));
    const rightStep = missingRightLeg
      ? 0
      : stepWave(stridePhase + Math.PI, gait.stepSharpness, -limpDrag * 0.35);

    // Body dips on each foot plant (twice per stride), with a slight limp hitch
    const plants = footfallPulse(stridePhase, gait.stepSharpness);
    const limpHitch = leftStep > 0 ? limpDrag * plants * 1.2 : 0;
    const oneLegHitch = oneLegLimp * plants * 2.5;

    // Head follows the stride with a delayed, softer step (not an independent sine)
    const headPhase = stridePhase * 0.5 - 0.4;
    const headStep = stepWave(headPhase, 0.75, limpDrag * 0.4);

    const leftArmSwing = this.limbs.leftArm
      ? leftStep * (0.55 + gait.armSwing) + gait.armForwardReach + this.damageLevel * 0.2
      : 0;
    const rightArmSwing = this.limbs.rightArm
      ? rightStep * (0.45 + gait.armSwing) + gait.armForwardReach
      : 0;

    // ---- Articulated rig joints ------------------------------------------------------------
    // Legs alternate; the knee flexes through each leg's forward swing, so the foot visibly lifts
    const hipAmp = 0.15 + 0.1 * gait.legStride;
    const kneeAmp = 0.5 + 0.3 * gait.legStride;
    const liftL = missingLeftLeg ? 0 : Math.max(0, Math.cos(wrapPhase(stridePhase))) ** 1.4;
    const liftR = missingRightLeg
      ? 0
      : Math.max(0, Math.cos(wrapPhase(stridePhase + Math.PI))) ** 1.4;

    // Arms counter-swing the opposite leg, hanging slightly out from the body with bent elbows
    const armAmp = 0.12 + gait.armSwing * 0.55;
    const armBase = 0.16 + gait.armForwardReach * 0.35;
    const elbowBase = 0.45 + gait.armForwardReach * 0.5;

    const sway = leftStep - rightStep;
    const joints: JointPose = {
      hipL: leftStep * hipAmp,
      hipR: rightStep * hipAmp,
      kneeL: 0.06 + liftL * kneeAmp,
      kneeR: 0.06 + liftR * kneeAmp,
      shoulderL: this.limbs.leftArm ? armBase + rightStep * armAmp + this.damageLevel * 0.1 : 0,
      shoulderR: this.limbs.rightArm ? armBase + leftStep * armAmp : 0,
      elbowL: elbowBase + Math.max(0, -rightStep) * 0.35,
      elbowR: elbowBase + Math.max(0, -leftStep) * 0.35,
      // Torso rolls with the stride and sags toward the dragged side when hurt
      torsoLean: sway * 0.035 + limpDrag * 0.05,
      pelvisSway: sway * 0.3,
      // The head lags the torso: a delayed, softer wave plus damage twitches
      headTilt: headStep * (0.08 + gait.headBobIntensity * 0.4) + this.twitchValue * 0.3,
      headShift: headStep * 0.5 * gait.headSwayAmp + this.twitchValue * 0.3,
    };

    return {
      joints,
      bodyBob: plants * (2 + gait.bobIntensity) + limpHitch + oneLegHitch,
      headTilt: headStep * (0.12 + gait.headBobIntensity) + this.twitchValue * 0.3,
      headSway:
        headStep * (1.2 + gait.headSwayAmp) +
        rightStep * 0.35 * gait.headSwayAmp +
        this.twitchValue * 0.8,
      leftArmAngle: leftArmSwing,
      rightArmAngle: rightArmSwing,
      leftLegOffset: leftStep * (2.5 + gait.legStride) + limpHitch,
      rightLegOffset: rightStep * (2.5 + gait.legStride) - limpHitch * 0.4,
      limbSwing: leftStep || rightStep,
      twitch: this.twitchValue,
      damageLevel: this.damageLevel,
    };
  }

  /**
   * Prone drag: torso low, arms pull body forward, legs tucked/still.
   */
  private getCrawlFrame(time: number): AnimationData {
    const speed = this.getAnimationSpeed() * 0.85;
    const phase = time * 3.2 * speed;
    const pull = stepWave(phase, 0.5, 0.25);
    const opposite = stepWave(phase + Math.PI, 0.5, -0.15);
    const groundBob = footfallPulse(phase, 0.45);

    const leftArm = this.limbs.leftArm ? pull * 0.9 + 0.85 : 0.4;
    const rightArm = this.limbs.rightArm ? opposite * 0.9 + 0.85 : 0.4;

    // Legs tucked under when present (critical HP crawl); gone limbs stay at 0
    const tuck = this.limbs.leftLeg || this.limbs.rightLeg ? 1.5 : 0;

    // Prone drag: arms reach out and pull, legs trail tucked
    const joints: JointPose = {
      hipL: this.limbs.leftLeg ? 0.1 : 0,
      hipR: this.limbs.rightLeg ? 0.1 : 0,
      kneeL: this.limbs.leftLeg ? 0.9 : 0,
      kneeR: this.limbs.rightLeg ? 0.9 : 0,
      shoulderL: this.limbs.leftArm ? 0.9 + pull * 0.45 : 0,
      shoulderR: this.limbs.rightArm ? 0.9 + opposite * 0.45 : 0,
      elbowL: 0.7 + Math.max(0, -pull) * 0.5,
      elbowR: 0.7 + Math.max(0, -opposite) * 0.5,
      torsoLean: (pull - opposite) * 0.05 + 0.12,
      pelvisSway: (pull - opposite) * 0.4,
      headTilt: pull * 0.12 + 0.2 + this.twitchValue * 0.2,
      headShift: opposite * 0.5 + this.twitchValue * 0.3,
    };

    return {
      joints,
      bodyBob: 10 + groundBob * 1.5 + this.twitchValue * 0.4,
      headTilt: pull * 0.15 + 0.25 + this.twitchValue * 0.2,
      headSway: opposite * 1.2 + this.twitchValue * 0.5,
      leftArmAngle: leftArm,
      rightArmAngle: rightArm,
      leftLegOffset: this.limbs.leftLeg ? tuck * 0.3 : 0,
      rightLegOffset: this.limbs.rightLeg ? tuck * 0.3 : 0,
      limbSwing: pull,
      twitch: this.twitchValue,
      damageLevel: this.damageLevel,
    };
  }

  /**
   * Get per-type gait personality parameters.
   */
  private getGaitStyle(): {
    bobIntensity: number;
    headBobIntensity: number;
    headSwayAmp: number;
    armSwing: number;
    armForwardReach: number;
    legStride: number;
    stepSharpness: number;
    limpBias: number;
  } {
    switch (this.zombieType) {
      case 'FAST':
        return {
          bobIntensity: 0.5,
          headBobIntensity: 0.1,
          headSwayAmp: 0.3,
          armSwing: 0.3,
          armForwardReach: 0.1,
          legStride: 1.5,
          stepSharpness: 0.55,
          limpBias: 0.05,
        };
      case 'TANK':
        return {
          bobIntensity: 1.5,
          headBobIntensity: 0.05,
          headSwayAmp: 0.8,
          armSwing: 0.2,
          armForwardReach: 0.4,
          legStride: 0.5,
          stepSharpness: 0.45,
          limpBias: 0.2,
        };
      case 'BOSS':
        return {
          bobIntensity: 2.0,
          headBobIntensity: 0.04,
          headSwayAmp: 1.0,
          armSwing: 0.15,
          armForwardReach: 0.5,
          legStride: 0.4,
          stepSharpness: 0.4,
          limpBias: 0.25,
        };
      case 'NECRO_TANK':
        return {
          bobIntensity: 1.8,
          headBobIntensity: 0.045,
          headSwayAmp: 0.9,
          armSwing: 0.18,
          armForwardReach: 0.45,
          legStride: 0.45,
          stepSharpness: 0.42,
          limpBias: 0.22,
        };
      case 'STEALTH':
        return {
          bobIntensity: 0.3,
          headBobIntensity: 0.15,
          headSwayAmp: 0.2,
          armSwing: 0.1,
          armForwardReach: -0.1,
          legStride: 0.8,
          stepSharpness: 0.7,
          limpBias: 0.1,
        };
      case 'SWARM':
        return {
          bobIntensity: 1.0,
          headBobIntensity: 0.3,
          headSwayAmp: 0.5,
          armSwing: 0.5,
          armForwardReach: 0.3,
          legStride: 1.8,
          stepSharpness: 0.5,
          limpBias: 0.15,
        };
      case 'ARMORED':
        return {
          bobIntensity: 0.8,
          headBobIntensity: 0.05,
          headSwayAmp: 0.4,
          armSwing: 0.15,
          armForwardReach: 0.2,
          legStride: 0.6,
          stepSharpness: 0.5,
          limpBias: 0.12,
        };
      case 'MECHANICAL':
        return {
          bobIntensity: 0.2,
          headBobIntensity: 0.02,
          headSwayAmp: 0.1,
          armSwing: 0.1,
          armForwardReach: 0.0,
          legStride: 0.4,
          stepSharpness: 0.85,
          limpBias: 0,
        };
      default: // BASIC
        return {
          bobIntensity: 0.5,
          headBobIntensity: 0.15,
          headSwayAmp: 0.5,
          armSwing: 0.2,
          armForwardReach: 0.3,
          legStride: 0.8,
          stepSharpness: 0.6,
          limpBias: 0.15,
        };
    }
  }

  private getAnimationSpeed(): number {
    switch (this.zombieType) {
      case 'FAST':
        return 1.5;
      case 'SWARM':
        return 1.3;
      case 'STEALTH':
        return 1.2;
      case 'TANK':
        return 0.7;
      case 'BOSS':
        return 0.55;
      case 'NECRO_TANK':
        return 0.6;
      default:
        return 1.0;
    }
  }

  private getIdleFrame(time: number): AnimationData {
    // Idle can stay sine-based — breathing should feel smooth
    const breathe = Math.sin(time * 1.5);
    const twitch = Math.sin(time * 7.3) * 0.1;
    const damagetwitch = this.damageLevel * Math.sin(time * 11.7) * 0.15;

    const joints: JointPose = {
      hipL: 0,
      hipR: 0,
      kneeL: 0.05,
      kneeR: 0.05,
      shoulderL: this.limbs.leftArm ? 0.18 + breathe * 0.04 + this.damageLevel * 0.1 : 0,
      shoulderR: this.limbs.rightArm ? 0.16 + Math.sin(time * 1.5 + 0.7) * 0.04 : 0,
      elbowL: 0.4 + breathe * 0.05,
      elbowR: 0.4 + Math.sin(time * 1.5 + 0.7) * 0.05,
      torsoLean: Math.sin(time * 0.9) * 0.015 + this.damageLevel * 0.03,
      pelvisSway: 0,
      headTilt: Math.sin(time * 1.2) * 0.06 + this.twitchValue * 0.3,
      headShift: Math.sin(time * 1.3) * 0.3 + this.twitchValue * 0.3,
    };

    return {
      joints,
      bodyBob: breathe * 0.8 + twitch + damagetwitch,
      headTilt: Math.sin(time * 1.2) * 0.08 + twitch * 0.5 + this.twitchValue * 0.4,
      headSway: Math.sin(time * 1.3) * 0.5 + Math.sin(time * 3.7) * 0.2 + this.twitchValue * 0.6,
      leftArmAngle: this.limbs.leftArm
        ? Math.sin(time * 1.8) * 0.15 + 0.2 + this.damageLevel * 0.3
        : 0,
      rightArmAngle: this.limbs.rightArm ? Math.sin(time * 1.8 + 0.7) * 0.12 + 0.15 : 0,
      leftLegOffset: 0,
      rightLegOffset: 0,
      limbSwing: breathe * 0.1,
      twitch: this.twitchValue,
      damageLevel: this.damageLevel,
    };
  }

  setState(state: AnimationState): void {
    this.currentState = state;
  }
}
