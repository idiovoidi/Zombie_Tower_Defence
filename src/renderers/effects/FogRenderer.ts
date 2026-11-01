import type { Graphics } from 'pixi.js';
import { COLORS, FOG } from '../../config/visualConstants';
import { createSeededRandom } from '../../utils/seededRandom';

type FogLayer = 'deep' | 'mid' | 'upper';

interface FogParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  rx: number;
  ry: number;
  speed: number;
  alpha: number;
  baseAlpha: number;
  pulseOffset: number;
  driftOffset: number;
  driftAmplitude: number;
  layer: FogLayer;
  color: number;
}

/**
 * FogRenderer handles animated fog effects for the graveyard area.
 *
 * Features:
 * - Three-layer fog banks (deep / mid / upper wisps)
 * - Soft elliptical multi-ring drawing
 * - Parallax drift + bob + breathing pulse
 * - Horizontal wrapping with slight spill past graveyard bounds
 */
export class FogRenderer {
  private fogContainer: Graphics;
  private fogParticles: FogParticle[] = [];
  private fogTime = 0;
  private graveyardBounds: { x: number; y: number; width: number; height: number };

  constructor(fogContainer: Graphics) {
    this.fogContainer = fogContainer;
    this.graveyardBounds = { x: 0, y: 0, width: 0, height: 0 };
  }

  /**
   * Initialize fog particles for a specific area (typically the graveyard)
   */
  public initialize(
    graveyardX: number,
    graveyardY: number,
    graveyardWidth: number,
    graveyardHeight: number
  ): void {
    this.graveyardBounds = {
      x: graveyardX,
      y: graveyardY,
      width: graveyardWidth,
      height: graveyardHeight,
    };
    this.fogParticles = [];

    const rand = createSeededRandom(
      Math.floor(graveyardX * 97 + graveyardY * 53 + graveyardWidth * 13 + graveyardHeight)
    );

    this.spawnLayer(
      rand,
      'deep',
      FOG.DEEP_COUNT,
      FOG.DEEP_Y_MIN,
      FOG.DEEP_Y_MAX,
      FOG.DEEP_MIN_RX,
      FOG.DEEP_MAX_RX,
      FOG.DEEP_MIN_RY,
      FOG.DEEP_MAX_RY,
      FOG.DEEP_MIN_SPEED,
      FOG.DEEP_MAX_SPEED,
      FOG.DEEP_MIN_ALPHA,
      FOG.DEEP_MAX_ALPHA,
      FOG.DEEP_DRIFT,
      COLORS.FOG_DEEP
    );

    this.spawnLayer(
      rand,
      'mid',
      FOG.MID_COUNT,
      FOG.MID_Y_MIN,
      FOG.MID_Y_MAX,
      FOG.MID_MIN_RX,
      FOG.MID_MAX_RX,
      FOG.MID_MIN_RY,
      FOG.MID_MAX_RY,
      FOG.MID_MIN_SPEED,
      FOG.MID_MAX_SPEED,
      FOG.MID_MIN_ALPHA,
      FOG.MID_MAX_ALPHA,
      FOG.MID_DRIFT,
      COLORS.FOG_MID
    );

    this.spawnLayer(
      rand,
      'upper',
      FOG.UPPER_COUNT,
      FOG.UPPER_Y_MIN,
      FOG.UPPER_Y_MAX,
      FOG.UPPER_MIN_RX,
      FOG.UPPER_MAX_RX,
      FOG.UPPER_MIN_RY,
      FOG.UPPER_MAX_RY,
      FOG.UPPER_MIN_SPEED,
      FOG.UPPER_MAX_SPEED,
      FOG.UPPER_MIN_ALPHA,
      FOG.UPPER_MAX_ALPHA,
      FOG.UPPER_DRIFT,
      COLORS.FOG_UPPER
    );
  }

  private spawnLayer(
    rand: () => number,
    layer: FogLayer,
    count: number,
    yMin: number,
    yMax: number,
    minRx: number,
    maxRx: number,
    minRy: number,
    maxRy: number,
    minSpeed: number,
    maxSpeed: number,
    minAlpha: number,
    maxAlpha: number,
    driftAmplitude: number,
    color: number
  ): void {
    const { x, y, width, height } = this.graveyardBounds;

    for (let i = 0; i < count; i++) {
      const px = x - FOG.SPILL_X + rand() * (width + FOG.SPILL_X * 2);
      const py = y + height * (yMin + rand() * (yMax - yMin));
      const baseAlpha = minAlpha + rand() * (maxAlpha - minAlpha);

      this.fogParticles.push({
        x: px,
        y: py,
        baseX: px,
        baseY: py,
        rx: minRx + rand() * (maxRx - minRx),
        ry: minRy + rand() * (maxRy - minRy),
        speed: minSpeed + rand() * (maxSpeed - minSpeed),
        alpha: baseAlpha,
        baseAlpha,
        pulseOffset: rand() * Math.PI * 2,
        driftOffset: rand() * Math.PI * 2,
        driftAmplitude,
        layer,
        color,
      });
    }
  }

  /**
   * Update fog particle positions and alpha values
   */
  public update(deltaTime: number): void {
    if (this.fogParticles.length === 0) {
      return;
    }

    this.fogTime += deltaTime * 0.001;

    const left = this.graveyardBounds.x - FOG.SPILL_X;
    const right = this.graveyardBounds.x + this.graveyardBounds.width + FOG.SPILL_X;
    const top = this.graveyardBounds.y - FOG.SPILL_Y;
    const bottom = this.graveyardBounds.y + this.graveyardBounds.height + FOG.SPILL_Y;

    for (const particle of this.fogParticles) {
      const driftX =
        Math.sin(this.fogTime * particle.speed + particle.driftOffset) * particle.driftAmplitude;
      particle.x = particle.baseX + driftX;

      const bobY =
        Math.sin(
          this.fogTime * particle.speed * FOG.BOB_SPEED_FACTOR +
            particle.driftOffset * FOG.BOB_SPEED_FACTOR
        ) * FOG.BOB_AMPLITUDE;
      particle.y = particle.baseY + bobY;

      // Keep deep fog hugging lower ground with a slight vertical clamp
      if (particle.layer === 'deep') {
        particle.y = Math.min(Math.max(particle.y, top + this.graveyardBounds.height * 0.35), bottom);
      } else {
        particle.y = Math.min(Math.max(particle.y, top), bottom);
      }

      const pulseFactor =
        Math.sin(this.fogTime * FOG.PULSE_SPEED + particle.pulseOffset) * 0.5 + 0.5;
      particle.alpha =
        particle.baseAlpha *
        (FOG.PULSE_MIN_FACTOR + pulseFactor * (FOG.PULSE_MAX_FACTOR - FOG.PULSE_MIN_FACTOR));

      // Slow continuous crawl + wrap
      particle.baseX += particle.speed * 0.15 * (deltaTime * 0.001) * 20;
      if (particle.x < left - particle.rx) {
        particle.baseX = right + particle.rx * 0.5;
      } else if (particle.x > right + particle.rx) {
        particle.baseX = left - particle.rx * 0.5;
      }
    }
  }

  /**
   * Render fog particles to the fog container
   */
  public render(): void {
    this.fogContainer.clear();

    // Draw deep → mid → upper so wisps sit on top
    const order: FogLayer[] = ['deep', 'mid', 'upper'];
    for (const layer of order) {
      for (const particle of this.fogParticles) {
        if (particle.layer !== layer) {
          continue;
        }
        this.drawSoftFog(particle);
      }
    }
  }

  private drawSoftFog(particle: FogParticle): void {
    // Concentric ellipses for soft falloff (outer → inner)
    for (let ring = FOG.RING_COUNT; ring >= 1; ring--) {
      const t = ring / FOG.RING_COUNT;
      const rx = particle.rx * (0.55 + t * 0.45);
      const ry = particle.ry * (0.55 + t * 0.45);
      const ringAlpha =
        particle.alpha * Math.pow(FOG.RING_ALPHA_FALLOFF, FOG.RING_COUNT - ring);

      this.fogContainer
        .ellipse(particle.x, particle.y, rx, ry)
        .fill({ color: particle.color, alpha: ringAlpha });
    }

    // Slight secondary lobe for irregular bank shape
    const lobeX = particle.x + particle.rx * 0.35;
    const lobeY = particle.y + particle.ry * 0.1;
    this.fogContainer
      .ellipse(lobeX, lobeY, particle.rx * 0.55, particle.ry * 0.6)
      .fill({ color: particle.color, alpha: particle.alpha * 0.35 });
  }

  /**
   * Clear all fog particles and reset state
   */
  public clear(): void {
    this.fogContainer.clear();
    this.fogParticles = [];
    this.fogTime = 0;
  }

  /**
   * Check if fog has been initialized
   */
  public isInitialized(): boolean {
    return this.fogParticles.length > 0;
  }
}
