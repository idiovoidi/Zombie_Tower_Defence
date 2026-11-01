/**
 * Joint angles (radians) for the articulated humanoid, in a side-agnostic convention so the
 * animator never has to think about mirroring: for BOTH sides, a positive hip/shoulder angle is
 * "limb swung outward, away from the body" and a positive knee/elbow angle is "joint flexed,
 * lower segment folded up toward the body". The rig applier mirrors for the right side.
 */
export interface JointPose {
  hipL: number;
  hipR: number;
  kneeL: number;
  kneeR: number;
  shoulderL: number;
  shoulderR: number;
  elbowL: number;
  elbowR: number;
  /** Torso rotation about the hips; positive leans the head toward +X. */
  torsoLean: number;
  /** Sideways hip shift (px). */
  pelvisSway: number;
  /** Head rotation about the neck (before it compensates for the torso). */
  headTilt: number;
  /** Small sideways head lag (px); the head stays on the neck, this is only a few pixels. */
  headShift: number;
}

export const REST_POSE: Readonly<JointPose> = {
  hipL: 0,
  hipR: 0,
  kneeL: 0.05,
  kneeR: 0.05,
  shoulderL: 0.15,
  shoulderR: 0.15,
  elbowL: 0.4,
  elbowR: 0.4,
  torsoLean: 0,
  pelvisSway: 0,
  headTilt: 0,
  headShift: 0,
};
