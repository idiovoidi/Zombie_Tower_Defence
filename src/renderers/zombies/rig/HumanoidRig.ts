import { Container, Graphics } from 'pixi.js';
import { createHumanoidHead, type HumanoidPartOptions } from '../HumanoidPartBuilder';
import type { HumanoidRigLayout } from './humanoidRigLayout';

/** One two-bone limb: `root` sits on the hip/shoulder; `joint` is the knee/elbow pivot. */
export interface RigLimb {
  root: Container;
  upper: Graphics;
  joint: Container;
  lower: Graphics;
}

export interface HumanoidRigParts {
  layout: HumanoidRigLayout;
  /** Everything except the shadow; bob / sway move this. */
  body: Container;
  /** Pivots at the hips. Carries arms, wounds, neck and head so they follow lean and bob. */
  torsoRoot: Container;
  torso: Graphics;
  head: Graphics;
  leftArm: RigLimb;
  rightArm: RigLimb;
  leftLeg: RigLimb;
  rightLeg: RigLimb;
}

const OUTLINE = { color: 0x000000, alpha: 0.55 };
const OUTLINE_GROW = 0.55;

function mix(a: number, b: number, t: number): number {
  const ch = (shift: number): number =>
    Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * Tapered capsule from (0, 0) down to (0, length). The round end-caps overlap the neighbouring
 * segment, so a joint stays visually connected whatever angle it bends to.
 * `skipTopOutline` leaves the joint end un-outlined so no dark ring is drawn across the segment above.
 */
function drawSegment(
  g: Graphics,
  length: number,
  w1: number,
  w2: number,
  color: number,
  skipTopOutline: boolean
): void {
  const r1 = w1 / 2;
  const r2 = w2 / 2;
  const body = (
    grow: number,
    fillStyle: { color: number; alpha?: number },
    includeTop: boolean
  ) => {
    g.moveTo(-r1 - grow, 0)
      .lineTo(r1 + grow, 0)
      .lineTo(r2 + grow, length)
      .lineTo(-r2 - grow, length)
      .fill(fillStyle);
    if (includeTop) {
      g.circle(0, 0, r1 + grow).fill(fillStyle);
    }
    g.circle(0, length, r2 + grow).fill(fillStyle);
  };
  // Pass 1: dark silhouette slightly larger than the limb; pass 2: the limb colour
  body(OUTLINE_GROW, OUTLINE, !skipTopOutline);
  body(0, { color }, true);
}

function createLimb(
  upperLen: number,
  upperW1: number,
  upperW2: number,
  lowerLen: number,
  lowerW1: number,
  lowerW2: number,
  color: number,
  isLower: boolean
): RigLimb {
  const root = new Container();
  const upper = new Graphics();
  drawSegment(upper, upperLen, upperW1, upperW2, color, isLower);
  root.addChild(upper);

  const joint = new Container();
  joint.position.set(0, upperLen);
  const lower = new Graphics();
  drawSegment(lower, lowerLen, lowerW1, lowerW2, color, true);
  joint.addChild(lower);
  root.addChild(joint);

  return { root, upper, joint, lower };
}

function createLeg(
  layout: HumanoidRigLayout,
  options: HumanoidPartOptions,
  side: -1 | 1,
  shade: number
): RigLimb {
  const color = mix(options.primary, 0x000000, shade);
  const dark = mix(options.dark, 0x000000, shade);
  const decay = options.decay ?? 0.5;
  const limb = createLimb(
    layout.thighLen,
    layout.thighW,
    layout.shinW * 1.05,
    layout.shinLen,
    layout.shinW * 1.05,
    layout.shinW * 0.8,
    color,
    false
  );

  // Knee joint: reads as a joint, and hides any seam
  limb.joint.addChild(
    new Graphics().circle(0, 0, layout.shinW * 0.42).fill({ color: dark, alpha: 0.7 })
  );

  // Boot: wider than the shin, with a toe cap
  const s = layout.scale;
  const foot = new Graphics();
  foot.ellipse(0, layout.shinLen + 0.3 * s, layout.thighW * 0.78, 1.45 * s).fill({
    color: 0x000000,
    alpha: 0.5,
  });
  foot.ellipse(0, layout.shinLen + 0.2 * s, layout.thighW * 0.68, 1.2 * s).fill(dark);
  limb.joint.addChild(foot);

  if (decay > 0.2) {
    limb.upper.ellipse(side * layout.thighW * 0.22, layout.thighLen * 0.45, 1.1 * s, 0.8 * s).fill({
      color: dark,
      alpha: 0.4 + decay * 0.3,
    });
  }
  if (decay > 0.5) {
    limb.upper
      .moveTo(-layout.thighW * 0.2, layout.thighLen * 0.2)
      .lineTo(layout.thighW * 0.15, layout.thighLen * 0.65)
      .stroke({ color: 0x1a0a0a, width: 0.6, alpha: 0.5 });
  }
  return limb;
}

function createArm(
  layout: HumanoidRigLayout,
  options: HumanoidPartOptions,
  shade: number
): RigLimb {
  const color = mix(options.primary, 0x000000, shade);
  const dark = mix(options.dark, 0x000000, shade);
  const s = layout.scale;
  const limb = createLimb(
    layout.upperArmLen,
    layout.upperArmW * 1.1,
    layout.foreArmW * 1.05,
    layout.foreArmLen,
    layout.foreArmW * 1.05,
    layout.foreArmW * 0.8,
    color,
    false
  );

  // Shoulder cap hides the join with the torso; elbow dot defines the joint
  limb.upper.circle(0, 0, layout.upperArmW * 0.62).fill(color);
  limb.joint.addChild(
    new Graphics().circle(0, 0, layout.foreArmW * 0.45).fill({ color: dark, alpha: 0.65 })
  );

  // Hand with finger ticks
  const hand = new Graphics();
  const hy = layout.foreArmLen + layout.handR * 0.25;
  hand.circle(0, hy, layout.handR + 0.5).fill(OUTLINE);
  hand.circle(0, hy, layout.handR).fill(color);
  for (let i = -1; i <= 1; i++) {
    hand
      .moveTo(i * layout.handR * 0.45, hy + layout.handR * 0.4)
      .lineTo(i * layout.handR * 0.6, hy + layout.handR * 1.35)
      .stroke({ color: dark, width: 0.7 * s, alpha: 0.85 });
  }
  limb.joint.addChild(hand);

  if ((options.decay ?? 0.5) > 0.35) {
    limb.upper
      .ellipse(layout.upperArmW * 0.15, layout.upperArmLen * 0.5, 1 * s, 0.7 * s)
      .fill({ color: dark, alpha: 0.4 });
  }
  return limb;
}

/**
 * Torso in torso space (origin at the hips): tapered chest-to-pelvis silhouette, shoulder bumps,
 * a neck that runs up into the head, plus the old ribs/shreds/blotches detailing.
 */
function createTorsoGraphics(layout: HumanoidRigLayout, options: HumanoidPartOptions): Graphics {
  const { torsoW: W, torsoH: H, scale: s } = layout;
  const g = new Graphics();
  const decay = options.decay ?? 0.5;
  const shoulderR = (options.bulky ? 2.9 : 2.3) * s;
  const dark = options.dark;

  // Neck (drawn first so the torso overlaps its base)
  const neckColor = mix(options.primary, dark, 0.4);
  const neckTop = layout.neckTopY + 0.6 * s;
  g.rect(
    -layout.neckW / 2 - OUTLINE_GROW,
    neckTop,
    layout.neckW + OUTLINE_GROW * 2,
    layout.neckBaseY - neckTop + 1
  ).fill(OUTLINE);
  g.rect(-layout.neckW / 2, neckTop, layout.neckW, layout.neckBaseY - neckTop + 1).fill(neckColor);

  const outline = (grow: number, style: { color: number; alpha?: number }) => {
    const gw = W / 2 + grow;
    g.moveTo(-gw, -H + 1.4 * s - grow)
      .lineTo(-W * 0.3, -H - grow)
      .lineTo(W * 0.3, -H - grow)
      .lineTo(gw, -H + 1.4 * s - grow)
      .lineTo(W * 0.5 + grow * 0.5, -H * 0.55)
      .lineTo(W * 0.4 + grow, -H * 0.22)
      .lineTo(W * 0.47 + grow, 1.2 * s + grow)
      .lineTo(-W * 0.47 - grow, 1.2 * s + grow)
      .lineTo(-W * 0.4 - grow, -H * 0.22)
      .lineTo(-W * 0.5 - grow * 0.5, -H * 0.55)
      .fill(style);
    g.circle(-layout.shoulderX, layout.shoulderY, shoulderR + grow).fill(style);
    g.circle(layout.shoulderX, layout.shoulderY, shoulderR + grow).fill(style);
  };
  outline(OUTLINE_GROW, OUTLINE);
  outline(0, { color: options.primary });

  // Ribs
  const ribCount = options.bulky ? 4 : 3;
  for (let i = 0; i < ribCount; i++) {
    const ry = -H + (3.5 + i * 2.4) * s;
    g.moveTo(-W * 0.3, ry)
      .lineTo(W * 0.3, ry)
      .stroke({ color: dark, width: 0.6 * s, alpha: 0.7 });
  }

  // Torn clothing
  if (decay > 0.3) {
    g.moveTo(-W / 2 + 1, -H * 0.4)
      .lineTo(-W / 2 - 1.6 * s, -H * 0.12)
      .lineTo(-W / 2 + 2, -H * 0.15)
      .fill({ color: dark, alpha: 0.55 });
    g.moveTo(W / 2 - 1, -H * 0.6)
      .lineTo(W / 2 + 1.5 * s, -H * 0.35)
      .lineTo(W / 2 - 2, -H * 0.38)
      .fill({ color: dark, alpha: 0.45 });
  }

  // Pale blotches (bulky / heavily decayed)
  if (options.bulky || decay > 0.6) {
    g.ellipse(-W * 0.15, -H * 0.5, 2 * s, 1.5 * s).fill({ color: 0xc8c8a0, alpha: 0.25 });
    g.ellipse(W * 0.2, -H * 0.35, 1.8 * s, 1.2 * s).fill({ color: 0xc8c8a0, alpha: 0.2 });
  }

  // Bone accent strip (Stealth)
  if (options.accent !== undefined) {
    g.rect(-W * 0.15, -H * 0.85, W * 0.3, H * 0.15).fill({ color: options.accent, alpha: 0.55 });
  }

  // Belt line separating chest from pelvis
  g.moveTo(-W * 0.4, -H * 0.1)
    .lineTo(W * 0.4, -H * 0.1)
    .stroke({ color: dark, width: 0.8 * s, alpha: 0.55 });

  return g;
}

/**
 * Build the articulated humanoid (not yet attached to a container: see assembleHumanoidRig).
 * Far-side limbs are drawn slightly darker so depth reads without transparency.
 */
export function createHumanoidRig(
  options: HumanoidPartOptions,
  layout: HumanoidRigLayout
): HumanoidRigParts {
  const body = new Container();
  const torsoRoot = new Container();
  const torso = createTorsoGraphics(layout, options);
  const head = createHumanoidHead(options);
  // Pivot at the chin/neck so the head tilts about the neck instead of its own centre
  head.pivot.set(0, layout.headPivotDrop);

  return {
    layout,
    body,
    torsoRoot,
    torso,
    head,
    leftArm: createArm(layout, options, 0.2),
    rightArm: createArm(layout, options, 0),
    leftLeg: createLeg(layout, options, -1, 0.12),
    rightLeg: createLeg(layout, options, 1, 0),
  };
}

/**
 * Wire the hierarchy and place the joints. The wounds layer is parented to the torso so damage
 * marks follow lean and bob.
 */
export function assembleHumanoidRig(parts: HumanoidRigParts, wounds: Graphics): void {
  const { layout: l, body, torsoRoot } = parts;

  body.removeChildren();
  torsoRoot.removeChildren();

  parts.leftLeg.root.position.set(-l.hipX, l.hipY);
  parts.rightLeg.root.position.set(l.hipX, l.hipY);
  body.addChild(parts.leftLeg.root);
  body.addChild(parts.rightLeg.root);

  torsoRoot.position.set(0, l.hipY);
  body.position.set(0, 0);
  // Wounds were authored around the torso centre
  wounds.position.set(0, -l.torsoH / 2);

  parts.leftArm.root.position.set(-l.shoulderX, l.shoulderY);
  parts.rightArm.root.position.set(l.shoulderX, l.shoulderY);
  parts.head.position.set(0, l.neckTopY + 0.6 * l.scale);

  // Far arm behind the chest; near arm in front of it; head last
  torsoRoot.addChild(parts.leftArm.root);
  torsoRoot.addChild(parts.torso);
  torsoRoot.addChild(wounds);
  torsoRoot.addChild(parts.rightArm.root);
  torsoRoot.addChild(parts.head);
  body.addChild(torsoRoot);
}
