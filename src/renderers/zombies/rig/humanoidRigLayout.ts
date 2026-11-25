import type { HumanoidPartOptions } from '../HumanoidPartBuilder';

/**
 * How much of the body's side-to-side width shows in the three-quarter view (cos of the yaw
 * from facing the camera). The rig is authored facing +X; the renderer mirrors it to face -X.
 */
const LATERAL = 0.5;

/**
 * Proportions and joint positions of the articulated humanoid in three-quarter view, in px.
 * The figure faces +X: its front (face, chest) is on the +X side, the "near" limbs are on the
 * camera side and drawn in front of the torso, the "far" limbs are behind it.
 *
 * Coordinate spaces:
 *  - body space: origin at the zombie's centre, +Y down; feet rest on `groundY`
 *  - torso space: origin at the HIPS (the torso rotates about them), +Y down, so the shoulders
 *    are at negative Y
 */
export interface HumanoidRigLayout {
  scale: number;
  /** Visible torso width in three-quarter view. */
  torsoW: number;
  torsoH: number;
  /** Hip joint centre in body space. */
  hipY: number;
  /** Near (camera-side) and far hip X in body space. */
  hipNearX: number;
  hipFarX: number;
  /** Shoulder joints (torso space). */
  shoulderNearX: number;
  shoulderFarX: number;
  shoulderY: number;
  /** Where the neck meets the torso / head (torso space). */
  neckBaseY: number;
  neckTopY: number;
  neckW: number;
  /** Head pivot X (torso space): the head juts forward of the chest, zombie-style. */
  headX: number;
  /** Head ellipse radii, and how far below its centre the head pivots (the "chin"). */
  headRx: number;
  headRy: number;
  headPivotDrop: number;
  /** How far the face features sit towards +X from the head centre. */
  faceX: number;
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
  /** How far the body drops when fully prone so the torso lies on the ground. */
  proneDrop: number;
}

/**
 * Derive the rig layout from the palette options (scale, bulky, slim, armLength, legLength), so
 * every renderer keeps its character.
 */
export function computeHumanoidRigLayout(
  options: HumanoidPartOptions,
  groundY: number
): HumanoidRigLayout {
  const s = options.scale ?? 1;

  // Width as seen from the front; the three-quarter view shows part of it plus some depth
  const frontW = byBuild(options, 8, 10, 14) * s;
  const torsoW = frontW * 0.8;
  const torsoH = byBuild(options, 11, 12, 14) * s;

  const legTotal = (options.legLength ?? 6) * 1.25 * s;
  const thighLen = legTotal * 0.52;
  const shinLen = legTotal * 0.48;
  const footH = 1.2 * s;
  const thighW = byBuild(options, 2.4, 3.4, 4.6) * s;
  const shinW = thighW * 0.78;

  const armTotal = (options.armLength ?? 7) * s;
  const upperArmW = byBuild(options, 1.9, 2.5, 3.5) * s;

  const headRx = byBuild(options, 3.8, 4.5, 5.5) * s;
  const headRy = headRx * 1.05;
  const neckH = 1.6 * s;

  const hipY = groundY - legTotal - footH;
  const hipLateral = frontW * 0.26 * LATERAL;
  const shoulderLateral = (frontW / 2 - 0.9 * s) * LATERAL;

  return {
    scale: s,
    torsoW,
    torsoH,
    hipY,
    hipNearX: -hipLateral,
    hipFarX: hipLateral,
    // The near shoulder sits a little back (it is turned towards the camera)
    shoulderNearX: -shoulderLateral * 1.1,
    shoulderFarX: shoulderLateral * 0.9,
    shoulderY: -torsoH + 2.2 * s,
    neckBaseY: -torsoH + 1.2 * s,
    neckTopY: -torsoH - neckH,
    neckW: headRx * 0.85,
    headX: torsoW * 0.14,
    headRx,
    headRy,
    headPivotDrop: headRy * 0.82,
    faceX: headRx * 0.38,
    thighLen,
    shinLen,
    footH,
    thighW,
    shinW,
    upperArmLen: armTotal * 0.5,
    foreArmLen: armTotal * 0.5,
    upperArmW,
    foreArmW: upperArmW * 0.8,
    handR: byBuild(options, 1.55, 1.55, 2.0) * s,
    groundY,
    // Lying on its front: hips drop to half a torso-width above the ground
    proneDrop: Math.max(0, groundY - torsoW * 0.5 - hipY),
  };
}

/** Pick a value by body build (slim / normal / bulky). */
function byBuild(
  options: HumanoidPartOptions,
  slim: number,
  normal: number,
  bulky: number
): number {
  if (options.slim) {
    return slim;
  }
  return options.bulky ? bulky : normal;
}

/** Total leg length (hip to sole), used to match the stride to the walking speed. */
export function legLength(layout: HumanoidRigLayout): number {
  return layout.thighLen + layout.shinLen + layout.footH;
}
