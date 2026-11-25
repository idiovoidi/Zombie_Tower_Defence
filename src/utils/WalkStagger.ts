/**
 * Wave shaping for zombie shambling gait.
 * Prefer these over raw Math.sin so motion reads as staggered steps, not a sine weave.
 */

const TAU = Math.PI * 2;

/** Map any phase into [0, TAU). */
export function wrapPhase(phase: number): number {
  return ((phase % TAU) + TAU) % TAU;
}

/**
 * Asymmetric step wave in [-1, 1].
 * - `sharpness` < 1 → sharper zero-crossings / flatter peaks (stompy plants)
 * - `drag` > 0 → stretches the positive half (dragged leg), compresses recover
 */
export function stepWave(phase: number, sharpness = 0.65, drag = 0): number {
  let t = wrapPhase(phase) / TAU; // 0..1

  if (drag !== 0) {
    const clampedDrag = Math.max(-0.7, Math.min(0.7, drag));
    const posDuty = 0.5 + clampedDrag * 0.25;
    if (t < posDuty) {
      t = (t / posDuty) * 0.5;
    } else {
      t = 0.5 + ((t - posDuty) / (1 - posDuty)) * 0.5;
    }
  }

  const s = Math.sin(t * TAU);
  const a = Math.abs(s);
  return Math.sign(s) * a ** sharpness;
}

/**
 * Footfall envelope [0, 1] — peaks twice per stride (once per foot plant).
 */
export function footfallPulse(phase: number, sharpness = 0.55): number {
  return Math.abs(stepWave(phase, sharpness, 0));
}

/**
 * Irregular lateral lean for path stagger.
 * Eases toward random targets with a stable limp bias instead of weaving on a sine.
 */
export class LateralStagger {
  private lean = 0;
  private target = 0;
  private retargetIn = 0;
  private limpBias: number;

  constructor(seed = Math.random()) {
    // Stable preferred lean side so each zombie has a consistent limp direction
    this.limpBias = Math.sin(seed * TAU);
    this.retargetIn = Math.random() * 0.5;
  }

  reset(seed = Math.random()): void {
    this.lean = 0;
    this.target = 0;
    this.retargetIn = Math.random() * 0.5;
    this.limpBias = Math.sin(seed * TAU);
  }

  /**
   * @param deltaSeconds - Frame dt in seconds
   * @param amplitude - Max lateral lean magnitude (caller units, e.g. px/s)
   * @param followSpeed - How quickly lean eases toward the target
   */
  update(deltaSeconds: number, amplitude: number, followSpeed = 3.2): number {
    this.retargetIn -= deltaSeconds;
    if (this.retargetIn <= 0) {
      // Mostly biased to the limp side, with irregular overshoots
      this.target = (this.limpBias * 0.4 + (Math.random() * 2 - 1) * 0.6) * amplitude;
      // Uneven cadence: quick shuffle or long drag
      this.retargetIn = 0.28 + Math.random() * 0.9;
    }

    const t = Math.min(1, followSpeed * deltaSeconds);
    this.lean += (this.target - this.lean) * t;
    return this.lean;
  }
}
