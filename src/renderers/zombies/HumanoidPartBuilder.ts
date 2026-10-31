import { Graphics } from 'pixi.js';
import { GlowEffect, ShadowEffect } from './components/ZombieEffects';

export const STANDARD_HUMANOID_OFFSETS = {
  leftLegX: -3,
  leftLegY: 10,
  rightLegX: 1,
  rightLegY: 10,
  torsoY: 6,
  leftArmX: -5,
  leftArmY: -4,
  rightArmX: 5,
  rightArmY: -4,
  headY: -12,
} as const;

/** Shared palette / proportion options for humanoid part builders. */
export interface HumanoidPartOptions {
  primary: number;
  dark: number;
  eyeGlow?: number;
  /** Overall size multiplier (1 = Basic). */
  scale?: number;
  /** 0–1 decay detail density. */
  decay?: number;
  /** Arm length in local units before scale (default 7). */
  armLength?: number;
  /** Leg length in local units before scale (default 6). */
  legLength?: number;
  /** Extra torso bulk (Tank). */
  bulky?: boolean;
  /** Slimmer proportions (Fast). */
  slim?: boolean;
  /** Bone/pale accent color (Stealth). */
  accent?: number;
  strokeAlpha?: number;
}

function s(options: HumanoidPartOptions): number {
  return options.scale ?? 1;
}

export function createHumanoidShadow(y = 15, size = 8): Graphics {
  const shadow = new Graphics();
  ShadowEffect.apply(shadow, 0, y, size);
  return shadow;
}

/**
 * Tapered thigh/shin legs with foot pads. Pivot at top of thigh (y=0).
 */
export function createHumanoidLegs(
  primaryColorOrOptions: number | HumanoidPartOptions,
  strokeAlpha = 0.6
): { leftLeg: Graphics; rightLeg: Graphics } {
  const options: HumanoidPartOptions =
    typeof primaryColorOrOptions === 'number'
      ? { primary: primaryColorOrOptions, dark: primaryColorOrOptions, strokeAlpha }
      : primaryColorOrOptions;

  const scale = s(options);
  const alpha = options.strokeAlpha ?? strokeAlpha;
  const legLen = (options.legLength ?? 6) * scale;
  const thighW = (options.slim ? 2.2 : options.bulky ? 4.2 : 3.2) * scale;
  const shinW = thighW * 0.75;
  const decay = options.decay ?? 0.5;

  const drawLeg = (g: Graphics, bruiseSide: number) => {
    // Thigh (wider at top)
    g.moveTo(-thighW / 2, 0)
      .lineTo(thighW / 2, 0)
      .lineTo(shinW / 2, legLen * 0.55)
      .lineTo(-shinW / 2, legLen * 0.55)
      .fill(options.primary);
    g.stroke({ color: 0x000000, width: 0.5, alpha });

    // Shin
    g.moveTo(-shinW / 2, legLen * 0.5)
      .lineTo(shinW / 2, legLen * 0.5)
      .lineTo(shinW * 0.35, legLen)
      .lineTo(-shinW * 0.35, legLen)
      .fill(options.primary);
    g.stroke({ color: 0x000000, width: 0.5, alpha });

    // Knee joint
    g.circle(0, legLen * 0.52, shinW * 0.35).fill({ color: options.dark, alpha: 0.7 });

    // Foot pad
    g.ellipse(0, legLen + 0.5 * scale, thighW * 0.55, 1.2 * scale).fill(options.dark);
    g.stroke({ color: 0x000000, width: 0.4, alpha: alpha * 0.8 });

    // Decay / tear marks
    if (decay > 0.2) {
      g.ellipse(bruiseSide * thighW * 0.25, legLen * 0.25, 1.2 * scale, 0.8 * scale).fill({
        color: options.dark,
        alpha: 0.45 + decay * 0.3,
      });
    }
    if (decay > 0.5) {
      g.moveTo(-thighW * 0.2, legLen * 0.15)
        .lineTo(thighW * 0.15, legLen * 0.4)
        .stroke({ color: 0x1a0a0a, width: 0.6, alpha: 0.5 });
    }
  };

  const leftLeg = new Graphics();
  drawLeg(leftLeg, -1);
  const rightLeg = new Graphics();
  drawLeg(rightLeg, 1);

  return { leftLeg, rightLeg };
}

/**
 * Rounded torso with shoulders, ribs, and clothing shreds. Origin at torso center.
 */
export function createHumanoidTorso(options: HumanoidPartOptions): Graphics {
  const scale = s(options);
  const g = new Graphics();
  const w = (options.slim ? 8 : options.bulky ? 14 : 10) * scale;
  const h = (options.slim ? 11 : options.bulky ? 14 : 12) * scale;
  const decay = options.decay ?? 0.5;

  // Main body
  g.roundRect(-w / 2, -h / 2, w, h, 1.5 * scale)
    .fill(options.primary)
    .stroke({ color: 0x000000, width: 1, alpha: options.strokeAlpha ?? 0.6 });

  // Shoulder bumps
  const shoulderY = -h / 2 + 1.5 * scale;
  const shoulderR = (options.bulky ? 2.8 : 2.2) * scale;
  g.circle(-w / 2 + 1, shoulderY, shoulderR).fill(options.primary);
  g.circle(w / 2 - 1, shoulderY, shoulderR).fill(options.primary);
  g.circle(-w / 2 + 1, shoulderY, shoulderR).stroke({
    color: 0x000000,
    width: 0.5,
    alpha: 0.4,
  });
  g.circle(w / 2 - 1, shoulderY, shoulderR).stroke({
    color: 0x000000,
    width: 0.5,
    alpha: 0.4,
  });

  // Rib / decay strokes
  const ribCount = options.bulky ? 4 : 3;
  for (let i = 0; i < ribCount; i++) {
    const ry = -h / 2 + (3 + i * 2.5) * scale;
    g.moveTo(-w * 0.32, ry)
      .lineTo(w * 0.32, ry)
      .stroke({ color: options.dark, width: 0.6 * scale, alpha: 0.75 });
  }

  // Clothing shreds
  if (decay > 0.3) {
    g.moveTo(-w / 2 + 1, h * 0.15)
      .lineTo(-w / 2 - 1.5 * scale, h * 0.4)
      .lineTo(-w / 2 + 2, h * 0.35)
      .fill({ color: options.dark, alpha: 0.55 });
    g.moveTo(w / 2 - 1, -h * 0.1)
      .lineTo(w / 2 + 1.5 * scale, h * 0.15)
      .lineTo(w / 2 - 2, h * 0.1)
      .fill({ color: options.dark, alpha: 0.45 });
  }

  // Pale blotches (Tank / decay)
  if (options.bulky || decay > 0.6) {
    g.ellipse(-w * 0.15, 0, 2 * scale, 1.5 * scale).fill({ color: 0xc8c8a0, alpha: 0.25 });
    g.ellipse(w * 0.2, h * 0.15, 1.8 * scale, 1.2 * scale).fill({
      color: 0xc8c8a0,
      alpha: 0.2,
    });
  }

  // Bone accent strip (Stealth)
  if (options.accent !== undefined) {
    g.rect(-w * 0.15, -h * 0.35, w * 0.3, h * 0.15).fill({
      color: options.accent,
      alpha: 0.55,
    });
  }

  return g;
}

/**
 * Skull oval head with jaw, uneven glowing eyes, mouth. Origin at head center.
 */
export function createHumanoidHead(options: HumanoidPartOptions): Graphics {
  const scale = s(options);
  const g = new Graphics();
  const eyeGlow = options.eyeGlow ?? 0xff0000;
  const rx = (options.slim ? 3.8 : options.bulky ? 5.5 : 4.5) * scale;
  const ry = rx * 1.05;

  // Cranium
  g.ellipse(0, -0.5 * scale, rx, ry)
    .fill(options.primary)
    .stroke({ color: 0x000000, width: 1, alpha: options.strokeAlpha ?? 0.6 });

  // Jaw
  g.ellipse(0, ry * 0.55, rx * 0.7, ry * 0.4)
    .fill(options.primary)
    .stroke({ color: 0x000000, width: 0.5, alpha: 0.5 });

  // Ear stubs
  g.ellipse(-rx * 0.95, 0, 1.1 * scale, 1.6 * scale).fill(options.dark);
  g.ellipse(rx * 0.95, 0, 1.1 * scale, 1.6 * scale).fill(options.dark);

  // Eyes (slightly uneven)
  const eyeY = -0.8 * scale;
  const leftEyeX = -2.1 * scale;
  const rightEyeX = 2.3 * scale;
  const leftR = 1.1 * scale;
  const rightR = 1.0 * scale;

  GlowEffect.apply(g, leftEyeX, eyeY, leftR * 1.4, eyeGlow);
  GlowEffect.apply(g, rightEyeX, eyeY, rightR * 1.4, eyeGlow);
  g.circle(leftEyeX, eyeY, leftR).fill({ color: 0x000000, alpha: 0.9 });
  g.circle(rightEyeX, eyeY, rightR).fill({ color: 0x000000, alpha: 0.9 });
  g.circle(leftEyeX, eyeY, leftR * 0.55).fill(eyeGlow);
  g.circle(rightEyeX, eyeY, rightR * 0.55).fill(eyeGlow);

  // Nose cavity
  g.moveTo(0, 0.5 * scale)
    .lineTo(-0.8 * scale, 1.8 * scale)
    .lineTo(0.8 * scale, 1.8 * scale)
    .fill({ color: 0x000000, alpha: 0.75 });

  // Mouth gape
  g.ellipse(0, 2.8 * scale, 2.2 * scale, 1.1 * scale).fill({ color: 0x000000, alpha: 0.9 });
  // Teeth ticks
  for (let i = -1; i <= 1; i++) {
    g.rect(i * 1.2 * scale - 0.3 * scale, 2.2 * scale, 0.6 * scale, 0.9 * scale).fill({
      color: options.accent ?? 0xd8d8c0,
      alpha: 0.7,
    });
  }

  // Decay crack
  if ((options.decay ?? 0.5) > 0.4) {
    g.moveTo(-rx * 0.3, -ry * 0.6)
      .lineTo(-rx * 0.1, -ry * 0.1)
      .lineTo(-rx * 0.25, ry * 0.2)
      .stroke({ color: options.dark, width: 0.7, alpha: 0.65 });
  }

  return g;
}

/**
 * Tapered arm along +Y from shoulder (0,0), with hand + finger ticks.
 */
export function createHumanoidArm(
  options: HumanoidPartOptions,
  side: 'left' | 'right' = 'right'
): Graphics {
  const scale = s(options);
  const g = new Graphics();
  const len = (options.armLength ?? 7) * scale;
  const upperW = (options.slim ? 1.6 : options.bulky ? 3.2 : 2.2) * scale;
  const lowerW = upperW * 0.75;
  const handR = (options.bulky ? 2.0 : 1.5) * scale;
  const shadowAlpha = side === 'left' ? 0.3 : 0.5;

  // Shadow stroke behind limb
  g.moveTo(-upperW * 0.15, 0)
    .lineTo(upperW * 0.1, len)
    .stroke({ color: 0x000000, width: upperW * 1.15, alpha: shadowAlpha * 0.5 });

  // Upper arm tapered poly
  g.moveTo(-upperW / 2, 0)
    .lineTo(upperW / 2, 0)
    .lineTo(lowerW / 2, len * 0.55)
    .lineTo(-lowerW / 2, len * 0.55)
    .fill(options.primary);
  g.stroke({ color: 0x000000, width: 0.5, alpha: options.strokeAlpha ?? 0.5 });

  // Forearm
  g.moveTo(-lowerW / 2, len * 0.5)
    .lineTo(lowerW / 2, len * 0.5)
    .lineTo(lowerW * 0.35, len)
    .lineTo(-lowerW * 0.35, len)
    .fill(options.primary);
  g.stroke({ color: 0x000000, width: 0.5, alpha: options.strokeAlpha ?? 0.5 });

  // Elbow
  g.circle(0, len * 0.52, lowerW * 0.4).fill({ color: options.dark, alpha: 0.65 });

  // Hand
  g.circle(0, len + handR * 0.3, handR)
    .fill(options.primary)
    .stroke({ color: 0x000000, width: 0.5, alpha: shadowAlpha });

  // Finger ticks
  for (let i = -1; i <= 1; i++) {
    g.moveTo(i * handR * 0.45, len + handR * 0.5)
      .lineTo(i * handR * 0.55, len + handR * 1.35)
      .stroke({ color: options.dark, width: 0.7 * scale, alpha: 0.85 });
  }

  // Decay bruise
  if ((options.decay ?? 0.5) > 0.35) {
    g.ellipse(upperW * 0.15, len * 0.3, 1 * scale, 0.7 * scale).fill({
      color: options.dark,
      alpha: 0.4,
    });
  }

  return g;
}

/**
 * Convenience: build a full standard humanoid set from options.
 */
export function createHumanoidParts(
  options: HumanoidPartOptions,
  shadow?: { y?: number; size?: number }
): {
  shadow: Graphics;
  leftLeg: Graphics;
  rightLeg: Graphics;
  torso: Graphics;
  head: Graphics;
  leftArm: Graphics;
  rightArm: Graphics;
} {
  const scale = s(options);
  const legs = createHumanoidLegs(options);
  return {
    shadow: createHumanoidShadow(shadow?.y ?? 15 * scale, shadow?.size ?? 8 * scale),
    leftLeg: legs.leftLeg,
    rightLeg: legs.rightLeg,
    torso: createHumanoidTorso(options),
    head: createHumanoidHead(options),
    leftArm: createHumanoidArm(options, 'left'),
    rightArm: createHumanoidArm(options, 'right'),
  };
}
