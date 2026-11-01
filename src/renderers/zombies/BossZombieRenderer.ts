import { BaseZombieRenderer } from './BaseZombieRenderer';
import { ParticleType } from './ZombieParticleSystem';

export class BossZombieRenderer extends BaseZombieRenderer {
  protected readonly ANIMATOR_TYPE = 'BOSS';
  protected readonly DAMAGE_FLASH_TINT = 0xffaa00;
  protected readonly DAMAGE_PARTICLES = [
    { type: ParticleType.BLOOD_SPLATTER, count: 8, velocity: 55, lifetime: 900, size: 3 },
  ];
  protected readonly DEATH_PARTICLES = [
    { type: ParticleType.BLOOD_SPLATTER, count: 22, velocity: 90, lifetime: 1800, size: 4 },
  ];
  protected readonly DEATH_ANIM = {
    phase1Duration: 500,
    phase2Duration: 700,
    phase3Duration: 1000,
    phase1MaxRotation: 0.25,
    phase1MaxScale: 0.2,
    phase3YDrift: 4,
  };

  private readonly PRIMARY_COLOR = 0x1a0a12;
  private readonly DARK = 0x0a0508;
  private readonly BLOOD_RED = 0x8b0000;
  private readonly EYE_GLOW = 0xffaa00;

  protected initParts(): void {
    const palette = {
      primary: this.PRIMARY_COLOR,
      dark: this.DARK,
      eyeGlow: this.EYE_GLOW,
      scale: 1.8,
      bulky: true,
      armLength: 11,
      legLength: 9,
      decay: 0.8,
      strokeAlpha: 0.7,
    };

    this.buildHumanoidParts(palette, { y: 24, size: 16 });

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
    this.drawWounds(this.woundsPart, healthPercent, 0, this.BLOOD_RED, 10, 15, 18, 2, 2.5, 0.85);
  }
}
