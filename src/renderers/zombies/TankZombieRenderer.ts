import { BaseZombieRenderer } from './BaseZombieRenderer';
import { ParticleType } from './ZombieParticleSystem';

export class TankZombieRenderer extends BaseZombieRenderer {
  protected readonly ANIMATOR_TYPE = 'TANK';
  protected readonly DAMAGE_FLASH_TINT = 0xff0000;
  protected readonly DAMAGE_PARTICLES = [
    { type: ParticleType.BLOOD_SPLATTER, count: 5, velocity: 45, lifetime: 800, size: 2.5 },
  ];
  protected readonly DEATH_PARTICLES = [
    { type: ParticleType.BLOOD_SPLATTER, count: 15, velocity: 70, lifetime: 1500, size: 3 },
  ];
  protected readonly DEATH_ANIM = {
    phase1Duration: 400,
    phase2Duration: 600,
    phase3Duration: 800,
    phase1MaxRotation: 0.2,
    phase1MaxScale: 0.15,
    phase3YDrift: 3,
  };

  private readonly PRIMARY_COLOR = 0x5a1a1a;
  private readonly DARK_RED = 0x3a0a0a;
  private readonly BLOOD_RED = 0x8b0000;
  private readonly EYE_GLOW = 0xff0000;

  protected initParts(): void {
    const palette = {
      primary: this.PRIMARY_COLOR,
      dark: this.DARK_RED,
      eyeGlow: this.EYE_GLOW,
      scale: 1.35,
      bulky: true,
      armLength: 9,
      legLength: 7,
      decay: 0.7,
      strokeAlpha: 0.6,
    };

    this.buildHumanoidParts(palette, { y: 18, size: 12 });

    this.finishInitParts();
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
    this.drawWounds(this.woundsPart, healthPercent, 0, this.BLOOD_RED, 8, 12, 14, 1.5, 2, 0.8);
  }
}
