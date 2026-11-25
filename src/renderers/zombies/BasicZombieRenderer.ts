import { BaseZombieRenderer } from './BaseZombieRenderer';
import { ParticleType } from './ZombieParticleSystem';

export class BasicZombieRenderer extends BaseZombieRenderer {
  protected readonly ANIMATOR_TYPE = 'BASIC';
  protected readonly DAMAGE_FLASH_TINT = 0xff0000;
  protected readonly DAMAGE_PARTICLES = [
    { type: ParticleType.BLOOD_SPLATTER, count: 3, velocity: 40, lifetime: 600, size: 2 },
  ];
  protected readonly DEATH_PARTICLES = [
    { type: ParticleType.BLOOD_SPLATTER, count: 8, velocity: 60, lifetime: 1000, size: 2.5 },
  ];

  private readonly PRIMARY_COLOR = 0x2d5016;
  private readonly DARK_GREEN = 0x1a3010;
  private readonly BLOOD_RED = 0x8b0000;
  private readonly EYE_GLOW = 0xff0000;

  protected initParts(): void {
    const palette = {
      primary: this.PRIMARY_COLOR,
      dark: this.DARK_GREEN,
      eyeGlow: this.EYE_GLOW,
      decay: 0.55,
      strokeAlpha: 0.6,
    };

    this.buildHumanoidParts(palette);

    this.finishInitParts();
  }

  protected updateWounds(healthPercent: number): void {
    this.updateBloodWounds(healthPercent, this.BLOOD_RED, { maxWounds: 5, alpha: 0.8 });
  }
}
