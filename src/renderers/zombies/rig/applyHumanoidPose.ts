import type { HumanoidRigParts } from './HumanoidRig';
import type { JointPose } from './jointPose';

/**
 * Drive the rig from a pose: only rotations and a few small translations change per frame
 * (no redraws), so this is cheap enough for hundreds of zombies.
 *
 * @param bodyBob vertical dip of the whole body in px (positive = down)
 */
export function applyHumanoidPose(parts: HumanoidRigParts, pose: JointPose, bodyBob: number): void {
  parts.body.position.set(pose.pelvisSway, bodyBob);

  // Positive = outward for both sides; rotation is clockwise-positive, so the right side mirrors
  parts.leftLeg.root.rotation = pose.hipL;
  parts.rightLeg.root.rotation = -pose.hipR;
  parts.leftLeg.joint.rotation = -pose.kneeL;
  parts.rightLeg.joint.rotation = pose.kneeR;

  parts.leftArm.root.rotation = pose.shoulderL;
  parts.rightArm.root.rotation = -pose.shoulderR;
  parts.leftArm.joint.rotation = -pose.elbowL;
  parts.rightArm.joint.rotation = pose.elbowR;

  parts.torsoRoot.rotation = pose.torsoLean;

  // The head partly counter-rotates so it stays more level than the torso, and shifts only a
  // couple of pixels: it is pinned to the neck, never sliding off it
  parts.head.rotation = pose.headTilt - pose.torsoLean * 0.5;
  parts.head.x = pose.headShift;
}
