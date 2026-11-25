/**
 * Joint angles (radians) for the articulated humanoid in three-quarter view. The rig faces +X
 * (the renderer mirrors it for -X), so angles are "along the facing direction":
 *  - hip / shoulder: positive = limb swung FORWARD (towards the facing side)
 *  - knee: positive = flexed, shin folded BACK
 *  - elbow: positive = flexed, forearm folded FORWARD/up
 * "L" is the far-side limb (behind the torso), "R" the near-side limb (in front of it).
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
  /** Torso rotation about the hips; positive leans forward (head towards the facing side). */
  torsoLean: number;
  /** Small hip shift along the facing axis (px). */
  pelvisSway: number;
  /** Head rotation about the neck (before it compensates for the torso). */
  headTilt: number;
  /** Small head lag along the facing axis (px); the head stays on the neck. */
  headShift: number;
  /** 0 = upright, 1 = lying prone (the body drops so the torso rests on the ground). */
  prone: number;
}

export const REST_POSE: Readonly<JointPose> = {
  hipL: 0,
  hipR: 0,
  kneeL: 0.08,
  kneeR: 0.08,
  shoulderL: 0.35,
  shoulderR: 0.35,
  elbowL: 0.35,
  elbowR: 0.35,
  torsoLean: 0.08,
  pelvisSway: 0,
  headTilt: 0,
  headShift: 0,
  prone: 0,
};

/** Linear blend of two poses (t = 0 gives a, 1 gives b). */
export function lerpPose(a: JointPose, b: JointPose, t: number): JointPose {
  const out = { ...a };
  for (const key of Object.keys(a) as Array<keyof JointPose>) {
    out[key] = a[key] + (b[key] - a[key]) * t;
  }
  return out;
}
