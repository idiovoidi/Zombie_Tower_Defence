import { DismembermentConfig, type LimbFlags, type LimbId } from '../config/dismembermentConfig';
import { Component } from './Component';

export type { LimbFlags, LimbId };

/**
 * Tracks which limbs remain on a living zombie and drives crawl / speed penalties.
 * Limb loss is rolled only when HP crosses configured thresholds downward.
 */
export class LimbState extends Component {
  private limbs: LimbFlags = {
    leftArm: true,
    rightArm: true,
    leftLeg: true,
    rightLeg: true,
  };
  private crossedThresholds = new Set<number>();
  private zombieType: string;

  constructor(zombieType = 'Basic') {
    super('LimbState');
    this.zombieType = zombieType;
  }

  public setZombieType(type: string): void {
    this.zombieType = type;
  }

  public getLimbs(): LimbFlags {
    return { ...this.limbs };
  }

  public hasLimb(limb: LimbId): boolean {
    return this.limbs[limb];
  }

  public bothLegsGone(): boolean {
    return !this.limbs.leftLeg && !this.limbs.rightLeg;
  }

  public oneLegGone(): boolean {
    return this.limbs.leftLeg !== this.limbs.rightLeg;
  }

  /**
   * Crawl when both legs are missing, or when HP is at/below the critical floor.
   */
  public isCrawling(healthRatio: number): boolean {
    return this.bothLegsGone() || healthRatio <= DismembermentConfig.CRITICAL_CRAWL_HP;
  }

  public getSpeedMultiplier(healthRatio: number): number {
    if (this.isCrawling(healthRatio)) {
      return DismembermentConfig.SPEED.crawl;
    }
    if (this.oneLegGone()) {
      return DismembermentConfig.SPEED.oneLeg;
    }
    return 1;
  }

  /**
   * If HP crossed one or more unused thresholds, roll once for a limb loss.
   * Returns the lost limb, or null if no loss occurred.
   */
  public tryThresholdDismember(prevRatio: number, nextRatio: number): LimbId | null {
    if (nextRatio >= prevRatio) {
      return null;
    }

    const newlyCrossed: number[] = [];
    for (const threshold of DismembermentConfig.THRESHOLDS) {
      if (
        prevRatio > threshold &&
        nextRatio <= threshold &&
        !this.crossedThresholds.has(threshold)
      ) {
        newlyCrossed.push(threshold);
      }
    }

    if (newlyCrossed.length === 0) {
      return null;
    }

    // Mark all newly crossed bands so multi-threshold jumps still only roll once
    for (const t of newlyCrossed) {
      this.crossedThresholds.add(t);
    }

    const typeMult = DismembermentConfig.TYPE_CHANCE_MULT[this.zombieType] ?? 1;
    const chance = DismembermentConfig.LIMB_LOSS_CHANCE * typeMult;
    if (Math.random() > chance) {
      return null;
    }

    const lowestCrossed = Math.min(...newlyCrossed);
    const preferLegs = lowestCrossed <= 0.25;
    const limb = this.pickLimb(preferLegs);
    if (!limb) {
      return null;
    }

    this.limbs[limb] = false;
    return limb;
  }

  /** Force-remove a limb (tests / special events). Returns false if already gone. */
  public removeLimb(limb: LimbId): boolean {
    if (!this.limbs[limb]) {
      return false;
    }
    this.limbs[limb] = false;
    return true;
  }

  public reset(): void {
    this.limbs = {
      leftArm: true,
      rightArm: true,
      leftLeg: true,
      rightLeg: true,
    };
    this.crossedThresholds.clear();
  }

  private pickLimb(preferLegs: boolean): LimbId | null {
    const remaining: LimbId[] = [];
    if (this.limbs.leftArm) remaining.push('leftArm');
    if (this.limbs.rightArm) remaining.push('rightArm');
    if (this.limbs.leftLeg) remaining.push('leftLeg');
    if (this.limbs.rightLeg) remaining.push('rightLeg');

    if (remaining.length === 0) {
      return null;
    }

    if (preferLegs) {
      const legs = remaining.filter(l => l === 'leftLeg' || l === 'rightLeg');
      if (legs.length > 0 && Math.random() < DismembermentConfig.LOW_HP_LEG_BIAS) {
        return legs[Math.floor(Math.random() * legs.length)];
      }
    }

    return remaining[Math.floor(Math.random() * remaining.length)];
  }
}
