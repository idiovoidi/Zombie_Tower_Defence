import { Graphics } from 'pixi.js';
import { GlowEffect } from './components/ZombieEffects';
import { HumanoidZombieRenderer } from './HumanoidZombieRenderer';
import type { HumanoidRigParts } from './rig/HumanoidRig';
import { ParticleType } from './ZombieParticleSystem';

export class ArmoredZombieRenderer extends HumanoidZombieRenderer {
  protected readonly ANIMATOR_TYPE = 'ARMORED';
  protected readonly DAMAGE_FLASH_TINT = 0xffffff;
  protected readonly DAMAGE_PARTICLES = [
    { type: ParticleType.SPARKS, count: 4, velocity: 45, lifetime: 500, size: 1.5 },
  ];
  protected readonly DEATH_PARTICLES = [
    { type: ParticleType.METAL_SHARDS, count: 6, velocity: 55, lifetime: 1000, size: 2 },
    { type: ParticleType.BLOOD_SPLATTER, count: 5, velocity: 50, lifetime: 900, size: 2.5 },
  ];
  protected readonly DEATH_ANIM = {
    phase1Duration: 300,
    phase2Duration: 500,
    phase3Duration: 700,
    phase1MaxRotation: 0.3,
    phase1MaxScale: 0.2,
    phase3YDrift: 5,
  };

  private readonly PRIMARY_COLOR = 0x4a4a4a;
  private readonly DARK_GRAY = 0x2a2a2a;
  private readonly LIGHT_GRAY = 0x6a6a6a;
  private readonly ZOMBIE_GREEN = 0x2d5016;
  private readonly DARK_GREEN = 0x1a3010;
  private readonly RUST_COLOR = 0x8b4513;
  private readonly BLOOD_RED = 0x8b0000;
  private readonly EYE_GLOW = 0xff6600;

  protected initParts(): void {
    const flesh = {
      primary: this.ZOMBIE_GREEN,
      dark: this.DARK_GREEN,
      eyeGlow: this.EYE_GLOW,
      decay: 0.4,
      strokeAlpha: 0.5,
    };

    // Same articulated skeleton as the other humanoids; the armour is drawn onto its parts
    this.buildHumanoidParts(flesh, { y: 15, size: 9 });
    const rig = this.rig;
    this.addArmorToTorso(rig.torso, rig.layout.torsoH);
    this.addArmorToLimbs(rig);

    // Box helmet over the head (head is drawn around its own centre)
    this.headPart.rect(-4.5, -4.5, 9, 8).fill({ color: this.PRIMARY_COLOR, alpha: 0.92 });
    this.headPart.rect(-4.5, -4.5, 9, 8).stroke({ color: 0x000000, width: 1, alpha: 0.6 });
    this.headPart.rect(-4.5, -4.5, 9, 1.5).fill({ color: this.LIGHT_GRAY, alpha: 0.7 });
    this.headPart.rect(-3, 2.5, 6, 1.5).fill({ color: this.ZOMBIE_GREEN, alpha: 0.9 });
    this.headPart.rect(-3.5, -1, 7, 1.5).fill({ color: 0x000000, alpha: 0.9 });
    GlowEffect.apply(this.headPart, -2, -0.5, 1.5, this.EYE_GLOW);
    GlowEffect.apply(this.headPart, 2, -0.5, 1.5, this.EYE_GLOW);
    this.headPart.circle(-2, -0.5, 0.6).fill(this.EYE_GLOW);
    this.headPart.circle(2, -0.5, 0.6).fill(this.EYE_GLOW);

    this.finishInitParts();
  }

  /** Chest and belly plates over the flesh torso (torso space: origin at the hips). */
  private addArmorToTorso(torso: Graphics, torsoH: number): void {
    const cy = -torsoH / 2; // the old plates were authored around the torso centre
    torso.rect(-5, cy - 4, 10, 3).fill({ color: this.LIGHT_GRAY, alpha: 0.75 });
    torso.rect(-5, cy - 4, 10, 3).stroke({ color: this.DARK_GRAY, width: 0.5 });
    torso.rect(-5, cy + 1, 10, 3).fill({ color: this.LIGHT_GRAY, alpha: 0.75 });
    torso.rect(-5, cy + 1, 10, 3).stroke({ color: this.DARK_GRAY, width: 0.5 });
    torso.rect(-4, cy - 0.5, 8, 1).fill({ color: this.ZOMBIE_GREEN, alpha: 0.9 });
    this.drawRivet(torso, -4, cy - 3);
    this.drawRivet(torso, 4, cy - 3);
    this.drawRivet(torso, -4, cy + 2);
    this.drawRivet(torso, 4, cy + 2);
  }

  /** Greaves on the shins, and pauldron-and-bracer sleeves on the arms. */
  private addArmorToLimbs(rig: HumanoidRigParts): void {
    const { layout } = rig;
    for (const leg of [rig.leftLeg, rig.rightLeg]) {
      const w = layout.shinW * 1.25;
      leg.lower
        .rect(-w / 2, layout.shinLen * 0.12, w, layout.shinLen * 0.62)
        .fill({ color: this.PRIMARY_COLOR, alpha: 0.9 });
      leg.lower
        .rect(-w / 2, layout.shinLen * 0.12, w, layout.shinLen * 0.62)
        .stroke({ color: this.DARK_GRAY, width: 0.5 });
    }
    for (const arm of [rig.leftArm, rig.rightArm]) {
      // Upper-arm sleeve with a rounded pauldron at the shoulder
      arm.upper
        .moveTo(0, 0)
        .lineTo(0, layout.upperArmLen * 0.9)
        .stroke({ color: this.PRIMARY_COLOR, width: layout.upperArmW * 1.25, alpha: 0.9 });
      arm.upper.circle(0, 0, layout.upperArmW * 0.85).fill(this.PRIMARY_COLOR);
      arm.upper.circle(0, 0, layout.upperArmW * 0.45).fill(this.DARK_GRAY);
      // Bracer and gauntlet on the forearm
      const gauntlet = new Graphics();
      gauntlet
        .moveTo(0, layout.foreArmLen * 0.15)
        .lineTo(0, layout.foreArmLen)
        .stroke({ color: this.PRIMARY_COLOR, width: layout.foreArmW * 1.3, alpha: 0.9 });
      gauntlet
        .circle(0, layout.foreArmLen + layout.handR * 0.2, layout.handR * 1.15)
        .fill(this.PRIMARY_COLOR);
      gauntlet
        .circle(0, layout.foreArmLen + layout.handR * 0.2, layout.handR * 0.6)
        .fill(this.DARK_GRAY);
      arm.joint.addChild(gauntlet);
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
    this.drawWounds(this.woundsPart, healthPercent, 0, this.BLOOD_RED);
    if (healthPercent < 0.7) {
      this.drawRust(this.woundsPart, healthPercent, 0);
    }
    if (healthPercent < 0.5) {
      // Dents on the helmet: positions are relative to the torso centre, where wounds are drawn
      const hy = this.headCenterInWoundsSpace();
      this.woundsPart.circle(-2, hy + 1, 1).fill({ color: this.DARK_GRAY, alpha: 0.8 });
      this.woundsPart.circle(1.5, hy - 2, 0.8).fill({ color: this.DARK_GRAY, alpha: 0.8 });
    }
  }

  override showDamageEffect(damageType: string, amount: number): void {
    super.showDamageEffect(damageType, amount);
    if (Math.random() < 0.3) {
      this.particles.emit(ParticleType.BLOOD_SPLATTER, 0, 0, {
        count: 2,
        velocity: 35,
        lifetime: 600,
        size: 2,
      });
    }
  }

  private drawRivet(graphics: Graphics, x: number, y: number): void {
    graphics.circle(x, y, 0.8).fill(this.DARK_GRAY);
    graphics.circle(x, y, 0.4).fill(this.LIGHT_GRAY);
  }

  private drawRust(graphics: Graphics, healthPercent: number, torsoY: number): void {
    const rustCount = Math.floor((1 - healthPercent) * 4);
    for (let i = 0; i < rustCount; i++) {
      const x = (Math.random() - 0.5) * 8;
      const y = torsoY + (Math.random() - 0.5) * 10;
      graphics.circle(x, y, 0.8 + Math.random() * 1.2).fill({ color: this.RUST_COLOR, alpha: 0.7 });
    }
  }
}
