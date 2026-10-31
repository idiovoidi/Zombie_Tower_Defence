import { BaseZombieRenderer } from './BaseZombieRenderer';
import { ParticleType } from './ZombieParticleSystem';

/**
 * Necro Tank visuals: oversized necrotic bulk with purple aura that shifts
 * to orange cracks as armor sheds, then to exposed necrotic glow.
 */
export class NecroTankRenderer extends BaseZombieRenderer {
  protected readonly ANIMATOR_TYPE = 'NECRO_TANK';
  protected readonly DAMAGE_FLASH_TINT = 0xaa66ff;
  protected readonly DAMAGE_PARTICLES = [
    { type: ParticleType.BLOOD_SPLATTER, count: 7, velocity: 50, lifetime: 850, size: 2.8 },
  ];
  protected readonly DEATH_PARTICLES = [
    { type: ParticleType.BLOOD_SPLATTER, count: 20, velocity: 85, lifetime: 1700, size: 3.5 },
  ];
  protected readonly DEATH_ANIM = {
    phase1Duration: 450,
    phase2Duration: 650,
    phase3Duration: 950,
    phase1MaxRotation: 0.22,
    phase1MaxScale: 0.18,
    phase3YDrift: 4,
  };

  private readonly PRIMARY_COLOR = 0x2a1020;
  private readonly DARK = 0x120810;
  private readonly BLOOD_RED = 0x6b0040;
  private readonly EYE_GLOW = 0x66ff88;

  protected initParts(): void {
    const palette = {
      primary: this.PRIMARY_COLOR,
      dark: this.DARK,
      eyeGlow: this.EYE_GLOW,
      scale: 1.55,
      bulky: true,
      armLength: 10,
      legLength: 8,
      decay: 0.85,
      strokeAlpha: 0.75,
    };

    this.buildHumanoidParts(palette, { y: 22, size: 15 });

    this.finishInitParts();
  }

  protected getAnimationOffsets() {
    return {
      leftLegX: -4.5,
      leftLegY: 14,
      rightLegX: 2.5,
      rightLegY: 14,
      torsoY: 9,
      leftArmX: -8,
      leftArmY: -5.5,
      rightArmX: 8,
      rightArmY: -5.5,
      headY: -18,
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
    this.drawWounds(this.woundsPart, healthPercent, 0, this.BLOOD_RED, 9, 14, 16, 1.8, 2.3, 0.82);
  }

  protected override applyHealthTint(healthPercent: number): void {
    // Phase tints: armored purple → cracking orange → exposed necrotic
    if (healthPercent > 0.66) {
      this.container.tint = 0xcc99ff;
    } else if (healthPercent > 0.33) {
      this.container.tint = 0xff9966;
    } else {
      this.container.tint = 0xaa66ff;
    }
  }
}
