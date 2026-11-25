import { Graphics } from 'pixi.js';
import { GlowEffect, ShadowEffect } from './components/ZombieEffects';

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
 * Skull head in three-quarter view facing +X: the face (eyes, nose, mouth, jaw) is shifted
 * towards +X, the far eye is smaller and squashed, and only the near ear shows. Origin at the
 * head centre.
 */
export function createHumanoidHead(options: HumanoidPartOptions): Graphics {
  const scale = s(options);
  const g = new Graphics();
  const eyeGlow = options.eyeGlow ?? 0xff0000;
  const rx = (options.slim ? 3.8 : options.bulky ? 5.5 : 4.5) * scale;
  const ry = rx * 1.05;
  const face = rx * 0.38;

  // Cranium, a touch deeper at the back
  g.ellipse(-0.3 * scale, -0.5 * scale, rx, ry)
    .fill(options.primary)
    .stroke({ color: 0x000000, width: 1, alpha: options.strokeAlpha ?? 0.6 });

  // Jaw, forward under the face
  g.ellipse(face * 0.7, ry * 0.55, rx * 0.62, ry * 0.38)
    .fill(options.primary)
    .stroke({ color: 0x000000, width: 0.5, alpha: 0.5 });

  // Turned-away side of the skull in shadow; near ear on the back of the head
  g.ellipse(-rx * 0.45, -0.3 * scale, rx * 0.5, ry * 0.85).fill({ color: 0x000000, alpha: 0.18 });
  g.ellipse(-rx * 0.4, 0.1 * scale, 1.1 * scale, 1.6 * scale).fill(options.dark);

  // Eyes: near eye full, far eye smaller and foreshortened towards the edge of the face
  const eyeY = -0.8 * scale;
  const nearX = face - 1.5 * scale;
  const farX = face + 1.6 * scale;
  const nearR = 1.1 * scale;
  const farR = 0.85 * scale;
  GlowEffect.apply(g, nearX, eyeY, nearR * 1.4, eyeGlow);
  GlowEffect.apply(g, farX, eyeY, farR * 1.2, eyeGlow);
  g.circle(nearX, eyeY, nearR).fill({ color: 0x000000, alpha: 0.9 });
  g.ellipse(farX, eyeY, farR * 0.7, farR).fill({ color: 0x000000, alpha: 0.9 });
  g.circle(nearX, eyeY, nearR * 0.55).fill(eyeGlow);
  g.ellipse(farX, eyeY, farR * 0.4, farR * 0.55).fill(eyeGlow);

  // Nose cavity, pointing forward
  g.moveTo(face + 0.4 * scale, 0.4 * scale)
    .lineTo(face - 0.4 * scale, 1.8 * scale)
    .lineTo(face + 1.1 * scale, 1.8 * scale)
    .fill({ color: 0x000000, alpha: 0.75 });

  // Mouth gape
  g.ellipse(face + 0.2 * scale, 2.8 * scale, 1.9 * scale, 1.1 * scale).fill({
    color: 0x000000,
    alpha: 0.9,
  });
  // Teeth ticks
  for (let i = -1; i <= 1; i++) {
    g.rect(face + i * 1.0 * scale - 0.3 * scale, 2.2 * scale, 0.6 * scale, 0.9 * scale).fill({
      color: options.accent ?? 0xd8d8c0,
      alpha: 0.7,
    });
  }

  // Decay crack on the side of the skull
  if ((options.decay ?? 0.5) > 0.4) {
    g.moveTo(-rx * 0.3, -ry * 0.6)
      .lineTo(-rx * 0.1, -ry * 0.1)
      .lineTo(-rx * 0.25, ry * 0.2)
      .stroke({ color: options.dark, width: 0.7, alpha: 0.65 });
  }

  return g;
}
