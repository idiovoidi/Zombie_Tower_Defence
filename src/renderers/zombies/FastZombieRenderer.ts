import { BaseZombieRenderer } from './BaseZombieRenderer';
import { ParticleType } from './ZombieParticleSystem';

export class FastZombieRenderer extends BaseZombieRenderer {
  protected readonly ANIMATOR_TYPE = 'FAST';
  protected readonly DAMAGE_FLASH_TINT = 0xff6600;
  protected readonly DAMAGE_PARTICLES = [
    { type: ParticleType.BLOOD_SPLATTER, count: 3, velocity: 50, lifetime: 600, size: 2 },
  ];
  protected readonly DEATH_PARTICLES = [
    { type: ParticleType.BLOOD_SPLATTER, count: 8, velocity: 70, lifetime: 1000, size: 2.5 },
  ];
  protected readonly DEATH_ANIM = {
    phase1Duration: 300,
    phase2Duration: 500,
    phase3Duration: 700,
    phase1MaxRotation: 0.3,
    phase1MaxScale: 0.2,
    phase3YDrift: 5,
  };

  private readonly PRIMARY_COLOR = 0x8b4513;
  private readonly DARK_ORANGE = 0x5a2a0a;
  private readonly BLOOD_RED = 0x8b0000;
  private readonly EYE_GLOW = 0xff6600;

  protected initParts(): void {
    const palette = {
      primary: this.PRIMARY_COLOR,
      dark: this.DARK_ORANGE,
      eyeGlow: this.EYE_GLOW,
      scale: 0.9,
      slim: true,
      armLength: 8.5,
      decay: 0.45,
      strokeAlpha: 0.6,
    };

    this.buildHumanoidParts(palette, { y: 15, size: 7 });

    this.finishInitParts();
  }

  protected getAnimationOffsets() {
    return {
      leftLegX: -2.5,
      leftLegY: 10,
      rightLegX: 0.5,
      rightLegY: 10,
      torsoY: 5.5,
      leftArmX: -4,
      leftArmY: -3.5,
      rightArmX: 4,
      rightArmY: -3.5,
      headY: -11.5,
    };
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
    this.drawWounds(this.woundsPart, healthPercent, 0, this.BLOOD_RED, 5, 6, 8, 1, 1.5, 0.8);
  }
}
