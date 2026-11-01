import { BaseZombieRenderer } from './BaseZombieRenderer';
import { ParticleType } from './ZombieParticleSystem';

export class SwarmZombieRenderer extends BaseZombieRenderer {
  protected readonly ANIMATOR_TYPE = 'SWARM';
  protected readonly DAMAGE_FLASH_TINT = 0xffff00;
  protected readonly DAMAGE_PARTICLES = [
    { type: ParticleType.BLOOD_SPLATTER, count: 2, velocity: 30, lifetime: 500, size: 1.5 },
  ];
  protected readonly DEATH_PARTICLES = [
    { type: ParticleType.BLOOD_SPLATTER, count: 4, velocity: 40, lifetime: 700, size: 1.5 },
  ];
  protected readonly DEATH_ANIM = {
    phase1Duration: 200,
    phase2Duration: 400,
    phase3Duration: 400,
    phase1MaxRotation: 0.4,
    phase1MaxScale: 0.15,
    phase3YDrift: 3,
  };

  private readonly PRIMARY_COLOR = 0x6a7a2a;
  private readonly DARK_GREEN = 0x4a5a1a;
  private readonly BLOOD_RED = 0x8b0000;
  private readonly EYE_GLOW = 0xffff00;

  protected initParts(): void {
    const palette = {
      primary: this.PRIMARY_COLOR,
      dark: this.DARK_GREEN,
      eyeGlow: this.EYE_GLOW,
      scale: 0.6,
      slim: true,
      armLength: 6,
      legLength: 5,
      decay: 0.4,
      strokeAlpha: 0.6,
    };

    this.buildHumanoidParts(palette, { y: 10, size: 5 });

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
    this.drawWounds(this.woundsPart, healthPercent, 0, this.BLOOD_RED, 3, 5, 7, 0.5, 0.8, 0.8);
  }
}
