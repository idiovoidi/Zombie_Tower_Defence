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
