import type { Graphics } from 'pixi.js';
import { BaseZombieRenderer } from './BaseZombieRenderer';
import { GlowEffect } from './components/ZombieEffects';
import { playParticleDeathAnimation } from './CustomDeathAnimation';
import type { HumanoidRigParts } from './rig/HumanoidRig';
import { ParticleType } from './ZombieParticleSystem';
import type { ZombieRenderState } from './ZombieRenderer';

export class MechanicalZombieRenderer extends BaseZombieRenderer {
  protected readonly ANIMATOR_TYPE = 'MECHANICAL';
  protected readonly DAMAGE_FLASH_TINT = 0x00ffff;
  protected readonly DAMAGE_PARTICLES = [
    { type: ParticleType.SPARKS, count: 5, velocity: 50, lifetime: 500, size: 1.5 },
    { type: ParticleType.SMOKE, count: 2, velocity: 25, lifetime: 600, size: 2 },
  ];
  protected readonly DEATH_PARTICLES = [
    { type: ParticleType.SPARKS, count: 12, velocity: 70, lifetime: 1000, size: 2 },
    { type: ParticleType.SMOKE, count: 8, velocity: 40, lifetime: 1200, size: 2.5 },
    { type: ParticleType.METAL_SHARDS, count: 6, velocity: 55, lifetime: 1000, size: 2 },
  ];
  protected readonly DEATH_ANIM = {
    phase1Duration: 300,
    phase2Duration: 500,
    phase3Duration: 700,
    phase1MaxRotation: 0.2,
    phase1MaxScale: 0,
    phase3YDrift: 4,
  };

  private readonly PRIMARY_COLOR = 0x3a4a5a;
  private readonly DARK_METAL = 0x2a3a4a;
  private readonly LIGHT_METAL = 0x5a6a7a;
  private readonly RUST_COLOR = 0x8b4513;
  private readonly OIL_BLACK = 0x1a1a1a;
  private readonly EYE_GLOW = 0x00ffff;

  protected initParts(): void {
    // Same articulated skeleton and animation as the organic zombies; every part is then redrawn
    // as machinery (box chassis, rectangular segments, servo discs at each joint)
    this.buildHumanoidParts(
      {
        primary: this.PRIMARY_COLOR,
        dark: this.DARK_METAL,
        eyeGlow: this.EYE_GLOW,
        decay: 0,
        strokeAlpha: 0.6,
      },
      { y: 16, size: 9 }
    );
    this.restyleAsMachine(this.rig);
    this.finishInitParts();
  }

  /** Redraw the rig's parts in robot style. Joints are discs so they never open a gap. */
  private restyleAsMachine(rig: HumanoidRigParts): void {
    const l = rig.layout;
    const s = l.scale;

    // --- Torso: box chassis with a glowing core (torso space: origin at the hips)
    const torso = rig.torso;
    torso.clear();
    const cw = l.torsoW * 1.2;
    const cy = -l.torsoH / 2;
    // Piston neck
    torso
      .rect(-1.3 * s, l.neckTopY + 0.6 * s, 2.6 * s, l.neckBaseY - l.neckTopY)
      .fill(this.DARK_METAL);
    torso
      .rect(-cw / 2, -l.torsoH - 0.5 * s, cw, l.torsoH + 1.8 * s)
      .fill(this.PRIMARY_COLOR)
      .stroke({ color: 0x000000, width: 1, alpha: 0.6 });
    torso.rect(-cw / 2 + 1, cy - 4, cw - 2, 8).fill({ color: this.LIGHT_METAL, alpha: 0.5 });
    torso.rect(-cw / 2 + 1, cy - 4, cw - 2, 8).stroke({ color: this.DARK_METAL, width: 0.5 });
    torso.rect(-4, cy - 1, 8, 0.5).fill(this.DARK_METAL);
    torso.rect(-0.5, cy - 3, 1, 6).fill(this.DARK_METAL);
    for (const [bx, by] of [
      [-cw / 2 + 1, cy - 3.5],
      [cw / 2 - 1, cy - 3.5],
      [-cw / 2 + 1, cy + 3],
      [cw / 2 - 1, cy + 3],
    ]) {
      this.drawBolt(torso, bx, by);
    }
    torso.circle(0, cy, 2).fill({ color: this.EYE_GLOW, alpha: 0.4 });
    torso.circle(0, cy, 1.2).fill({ color: this.EYE_GLOW, alpha: 0.7 });
    // Shoulder servos
    for (const side of [-1, 1]) {
      torso.circle(side * l.shoulderX, l.shoulderY, 2.1 * s).fill(this.DARK_METAL);
      torso.circle(side * l.shoulderX, l.shoulderY, 1.1 * s).fill(this.LIGHT_METAL);
    }

    // --- Head: box with a visor (drawn around its own centre, as before)
    const head = rig.head;
    head.clear();
    head.rect(-5, -4, 10, 9).fill(this.PRIMARY_COLOR);
    head.rect(-5, -4, 10, 9).stroke({ color: 0x000000, width: 1, alpha: 0.6 });
    head.rect(-4, -3, 8, 7).fill({ color: this.LIGHT_METAL, alpha: 0.4 });
    head.rect(-0.5, -6, 1, 2).fill(this.DARK_METAL);
    head.circle(0, -6, 1).fill({ color: this.EYE_GLOW, alpha: 0.8 });
    head.rect(-4, -1, 8, 2).fill({ color: 0x000000, alpha: 0.9 });
    GlowEffect.apply(head, -2.5, 0, 1.8, this.EYE_GLOW);
    GlowEffect.apply(head, 2.5, 0, 1.8, this.EYE_GLOW);
    head.rect(-3, -0.5, 1.5, 1).fill(this.EYE_GLOW);
    head.rect(1.5, -0.5, 1.5, 1).fill(this.EYE_GLOW);
    head.rect(-2, 2, 4, 1.5).fill({ color: this.DARK_METAL, alpha: 0.8 });
    for (let i = 0; i < 4; i++) {
      head.rect(-1.5 + i, 2.2, 0.5, 1).fill({ color: 0x000000, alpha: 0.6 });
    }

    // --- Legs: thigh and shin plates, knee servo, foot plate
    for (const leg of [rig.leftLeg, rig.rightLeg]) {
      const tw = l.thighW * 1.1;
      const sw = l.shinW * 1.05;
      leg.upper.clear();
      leg.upper.rect(-tw / 2, 0, tw, l.thighLen + 0.4).fill(this.PRIMARY_COLOR);
      leg.upper
        .rect(-tw / 2, 0, tw, l.thighLen + 0.4)
        .stroke({ color: 0x000000, width: 0.5, alpha: 0.6 });
      leg.upper.circle(0, 0, tw * 0.55).fill(this.DARK_METAL);
      leg.upper.circle(0, 0, tw * 0.28).fill(this.LIGHT_METAL);

      leg.joint.removeChildren();
      leg.lower.clear();
      leg.lower.rect(-sw / 2, 0, sw, l.shinLen).fill(this.PRIMARY_COLOR);
      leg.lower.rect(-sw / 2, 0, sw, l.shinLen).stroke({ color: 0x000000, width: 0.5, alpha: 0.6 });
      leg.lower.circle(0, 0, sw * 0.62).fill(this.DARK_METAL);
      leg.lower.circle(0, 0, sw * 0.3).fill(this.LIGHT_METAL);
      leg.lower.rect(-sw * 0.85, l.shinLen - 0.3, sw * 1.7, 1.5 * s).fill(this.DARK_METAL);
      leg.joint.addChild(leg.lower);
    }

    // --- Arms: segments with servo elbows and a clamp-style hand
    for (const arm of [rig.leftArm, rig.rightArm]) {
      const uw = l.upperArmW * 1.15;
      const fw = l.foreArmW * 1.1;
      arm.upper.clear();
      arm.upper.rect(-uw / 2, 0, uw, l.upperArmLen + 0.4).fill(this.PRIMARY_COLOR);
      arm.upper
        .rect(-uw / 2, 0, uw, l.upperArmLen + 0.4)
        .stroke({ color: 0x000000, width: 0.5, alpha: 0.6 });
      arm.upper.circle(0, 0, uw * 0.62).fill(this.DARK_METAL);

      arm.joint.removeChildren();
      arm.lower.clear();
      arm.lower.rect(-fw / 2, 0, fw, l.foreArmLen).fill(this.PRIMARY_COLOR);
      arm.lower
        .rect(-fw / 2, 0, fw, l.foreArmLen)
        .stroke({ color: 0x000000, width: 0.5, alpha: 0.6 });
      arm.lower.circle(0, 0, fw * 0.62).fill(this.DARK_METAL);
      arm.lower.circle(0, 0, fw * 0.3).fill(this.LIGHT_METAL);
      arm.lower.circle(0, l.foreArmLen, l.handR * 1.25).fill(this.PRIMARY_COLOR);
      arm.lower.circle(0, l.foreArmLen, l.handR * 0.6).fill(this.DARK_METAL);
      arm.joint.addChild(arm.lower);
    }
  }
  protected updateWounds(
    healthPercent: number,
    _anim: {
      leftLegOffset: number;
      rightLegOffset: number;
      bodyBob: number;
      leftArmAngle: number;
      rightArmAngle: number;
      headSway: number;
    }
  ): void {
    this.woundsPart.clear();
    if (healthPercent < 0.7) {
      this.drawDamage(this.woundsPart, healthPercent, 0);
    }
  }

  override update(deltaTime: number, state: ZombieRenderState): void {
    super.update(deltaTime, state);
  }

  // Mechanical has a flicker phase — fully override
  override async playDeathAnimation(_killerType?: string): Promise<void> {
    return playParticleDeathAnimation({
      container: this.container,
      particles: this.particles,
      deathParticles: this.DEATH_PARTICLES,
      durationMs: 1500,
      setFrameId: id => {
        this.deathAnimationFrame = id;
      },
      onUpdate: elapsed => {
        if (elapsed < 300) {
          const t = elapsed / 300;
          this.container.rotation = t * 0.2;
          this.container.alpha = t % 0.2 < 0.1 ? 0.5 : 1.0;
        } else if (elapsed < 800) {
          const t = (elapsed - 300) / 500;
          this.container.rotation = 0.2 + t * (Math.PI / 2 - 0.2);
          this.container.scale.y = 1 - t * 0.7;
          this.container.alpha = 1 - t * 0.4;
        } else {
          const t = (elapsed - 800) / 700;
          this.container.alpha = 0.6 - t * 0.6;
          this.container.y += t * 4;
        }
      },
    });
  }

  private drawBolt(graphics: Graphics, x: number, y: number): void {
    graphics.circle(x, y, 1).fill(this.DARK_METAL);
    graphics.circle(x, y, 0.5).fill(this.LIGHT_METAL);
    graphics.rect(x - 0.6, y - 0.1, 1.2, 0.2).fill(0x000000);
    graphics.rect(x - 0.1, y - 0.6, 0.2, 1.2).fill(0x000000);
  }

  private drawDamage(graphics: Graphics, healthPercent: number, torsoY: number): void {
    const rustCount = Math.floor((1 - healthPercent) * 5);
    for (let i = 0; i < rustCount; i++) {
      const x = (Math.random() - 0.5) * 10;
      const y = torsoY + (Math.random() - 0.5) * 11;
      graphics.circle(x, y, 0.8 + Math.random() * 1.5).fill({ color: this.RUST_COLOR, alpha: 0.7 });
    }
    const oilCount = Math.floor((1 - healthPercent) * 3);
    for (let i = 0; i < oilCount; i++) {
      const x = (Math.random() - 0.5) * 9;
      const y = torsoY + (Math.random() - 0.5) * 10;
      graphics.circle(x, y, 1 + Math.random() * 1.8).fill({ color: this.OIL_BLACK, alpha: 0.6 });
    }
    if (healthPercent < 0.3) {
      graphics
        .moveTo(-4, torsoY + 4)
        .lineTo(-2, torsoY + 6)
        .lineTo(-3, torsoY + 8)
        .stroke({ color: 0xff6600, width: 0.8, alpha: 0.8 });
    }
  }
}
