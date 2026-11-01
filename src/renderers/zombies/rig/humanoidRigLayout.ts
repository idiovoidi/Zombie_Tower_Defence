import type { HumanoidPartOptions } from '../HumanoidPartBuilder';

/**
 * Proportions and joint positions of the articulated humanoid, in px.
 *
 * Coordinate spaces:
 *  - body space: origin at the zombie's centre, +Y down; feet rest on `groundY`
 *  - torso space: origin at the HIPS (the torso rotates about them), +Y down, so the shoulders
 *    are at negative Y
 */
export interface HumanoidRigLayout {
  scale: number;
  torsoW: number;
  torsoH: number;
  /** Hip joint centre in body space. */
  hipY: number;
  hipX: number;
  /** Shoulder joint (torso space). */
  shoulderX: number;
  shoulderY: number;
  /** Where the neck meets the torso / head (torso space). */
  neckBaseY: number;
  neckTopY: number;
  neckW: number;
  /** Head ellipse radii, and how far below its centre the head pivots (the "chin"). */
  headRx: number;
  headRy: number;
  headPivotDrop: number;
  thighLen: number;
  shinLen: number;
  footH: number;
  thighW: number;
  shinW: number;
  upperArmLen: number;
  foreArmLen: number;
  upperArmW: number;
  foreArmW: number;
  handR: number;
  /** Body-space Y of the soles. */
  groundY: number;
}

/**
 * Derive the rig layout from the same palette options the old builder used, so every existing
 * renderer (scale, bulky, slim, armLength, legLength) keeps its character.
 */
export function computeHumanoidRigLayout(
  options: HumanoidPartOptions,
  groundY: number
): HumanoidRigLayout {
  const s = options.scale ?? 1;

  const torsoW = (options.slim ? 8 : options.bulky ? 14 : 10) * s;
  const torsoH = (options.slim ? 11 : options.bulky ? 14 : 12) * s;

  const legTotal = (options.legLength ?? 6) * 1.25 * s;
  const thighLen = legTotal * 0.52;
  const shinLen = legTotal * 0.48;
  const footH = 1.2 * s;
  const thighW = (options.slim ? 2.4 : options.bulky ? 4.6 : 3.4) * s;
  const shinW = thighW * 0.78;

  const armTotal = (options.armLength ?? 7) * s;
  const upperArmW = (options.slim ? 1.9 : options.bulky ? 3.5 : 2.5) * s;

  const headRx = (options.slim ? 3.8 : options.bulky ? 5.5 : 4.5) * s;
  const headRy = headRx * 1.05;
  const neckH = 1.6 * s;

  const hipY = groundY - legTotal - footH;

  return {
    scale: s,
    torsoW,
    torsoH,
    hipY,
    hipX: torsoW * 0.26,
    shoulderX: torsoW / 2 - 0.9 * s,
    shoulderY: -torsoH + 2.2 * s,
    neckBaseY: -torsoH + 1.2 * s,
    neckTopY: -torsoH - neckH,
    neckW: headRx * 0.95,
    headRx,
    headRy,
    headPivotDrop: headRy * 0.82,
    thighLen,
    shinLen,
    footH,
    thighW,
    shinW,
    upperArmLen: armTotal * 0.5,
    foreArmLen: armTotal * 0.5,
    upperArmW,
    foreArmW: upperArmW * 0.8,
    handR: (options.bulky ? 2.0 : 1.55) * s,
    groundY,
  };
}
