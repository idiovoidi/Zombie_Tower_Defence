import { BaseZombieRenderer } from './BaseZombieRenderer';
import { ParticleType } from './ZombieParticleSystem';
import type { ZombieRenderState } from './ZombieRenderer';

export class StealthZombieRenderer extends BaseZombieRenderer {
  protected readonly ANIMATOR_TYPE = 'STEALTH';
  protected readonly DAMAGE_FLASH_TINT = 0xaa88ff;
  protected readonly DAMAGE_PARTICLES = [
    { type: ParticleType.SMOKE, count: 3, velocity: 35, lifetime: 600, size: 2 },
    { type: ParticleType.BLOOD_SPLATTER, count: 2, velocity: 30, lifetime: 500, size: 1.5 },
  ];
  protected readonly DEATH_PARTICLES = [
    { type: ParticleType.SMOKE, count: 8, velocity: 50, lifetime: 1000, size: 2.5 },
    { type: ParticleType.BLOOD_SPLATTER, count: 3, velocity: 40, lifetime: 800, size: 2 },
  ];

  private fadePhase = 0;

  private readonly PRIMARY_COLOR = 0x3a2a4a;
  private readonly DARK_PURPLE = 0x2a1a3a;
  private readonly BLOOD_RED = 0x8b0000;
  private readonly BONE_WHITE = 0xcccccc;
  private readonly EYE_GLOW = 0x9966ff;

  protected initParts(): void {
    const palette = {
      primary: this.PRIMARY_COLOR,
      dark: this.DARK_PURPLE,
      eyeGlow: this.EYE_GLOW,
      accent: this.BONE_WHITE,
      decay: 0.5,
      strokeAlpha: 0.4,
    };

    this.buildHumanoidParts(palette);
    // Soft aura around head
    this.headPart.circle(0, 0, 6).fill({ color: 0x4a3a5a, alpha: 0.12 });

    this.finishInitParts();
  }

  protected updateWounds(healthPercent: number): void {
    this.updateBloodWounds(healthPercent, this.BLOOD_RED, { maxWounds: 4, alpha: 0.5 });
  }

  protected override applyCustomEffects(_healthPercent: number): void {
    const baseAlpha = 0.5 + Math.sin(this.fadePhase) * 0.1;
    this.shadowPart.alpha = baseAlpha * 0.3;
    // Rigged limbs fade with the container (per-limb alpha would show the body through the arms)
    this.container.alpha = baseAlpha;
  }

  override update(deltaTime: number, state: ZombieRenderState): void {
    super.update(deltaTime, state);
    this.fadePhase += deltaTime * 0.002;
  }

  // Dissolves/flickers instead of collapsing, so the corpse system draws its own wreck
  override hasRagdollCorpse(): boolean {
    return false;
  }

  override playDeathAnimation(_killerType?: string): Promise<void> {
    return this.playTimedDeath(1200, elapsed => {
      if (elapsed < 300) {
        const t = elapsed / 300;
        this.container.alpha = 0.6 - t * 0.2;
        this.container.rotation = t * 0.2;
      } else if (elapsed < 800) {
        const t = (elapsed - 300) / 500;
        this.container.alpha = 0.4 - t * 0.4;
        this.container.scale.set(1 + t * 0.3);
      } else {
        const t = (elapsed - 800) / 400;
        this.container.alpha = (1 - t) * 0.05;
      }
    });
  }
}
