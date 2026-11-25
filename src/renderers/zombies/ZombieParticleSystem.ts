import { Graphics } from 'pixi.js';

export enum ParticleType {
  BLOOD_SPLATTER = 0,
  BLOOD_DRIP = 1,
  DECAY_CLOUD = 2,
  SPARKS = 3,
  SMOKE = 4,
  FIRE = 5,
  ELECTRICITY = 6,
  BONE_FRAGMENTS = 7,
  METAL_SHARDS = 8,
  BLOOD_MIST = 9,
  BLOOD_TRAIL = 10,
  GORE_CHUNK = 11,
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  alpha: number;
  /** Optional rotation for gore chunks */
  rotation: number;
  /** Optional angular velocity */
  angularVelocity: number;
  /** Whether this particle leaves a trail */
  trail: boolean;
}

export interface ParticleConfig {
  count: number;
  velocity: number;
  lifetime?: number;
  size?: number;
}

/**
 * Optional directional emission parameters.
 */
export interface DirectionalConfig {
  /** Emission center angle in radians */
  angle: number;
  /** Spread angle in radians (full cone width) */
  spread: number;
}

export class ZombieParticleSystem {
  private particles: Particle[] = [];
  private graphics: Graphics;
  private maxParticles = 150;
  /** True while the graphics holds drawn particles, so an empty system skips the per-frame clear. */
  private hasDrawn = false;
  /** Trail positions from blood trail particles */
  private trailPositions: Array<{
    x: number;
    y: number;
    alpha: number;
    size: number;
    color: number;
  }> = [];

  constructor() {
    this.graphics = new Graphics();
  }

  /**
   * Emit particles, optionally in a directional cone.
   */
  emit(
    type: ParticleType,
    x: number,
    y: number,
    config: ParticleConfig,
    direction?: DirectionalConfig
  ): void {
    const count = Math.min(config.count, this.maxParticles - this.particles.length);

    for (let i = 0; i < count; i++) {
      let angle: number;
      let speed: number;
      const dir = direction;

      if (dir) {
        // Directional emission: particles fly in a cone
        angle = dir.angle + (Math.random() - 0.5) * dir.spread;
        speed = config.velocity * (0.5 + Math.random() * 0.8);
      } else if (type === ParticleType.BLOOD_DRIP) {
        angle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        speed = config.velocity * (0.8 + Math.random() * 0.4);
      } else if (type === ParticleType.DECAY_CLOUD) {
        angle = -Math.PI / 2 + (Math.random() - 0.5) * 1;
        speed = config.velocity * (0.5 + Math.random() * 0.5);
      } else if (type === ParticleType.BLOOD_MIST) {
        // Blood mist: slow expanding cloud
        angle = Math.random() * Math.PI * 2;
        speed = config.velocity * (0.2 + Math.random() * 0.4);
      } else if (type === ParticleType.GORE_CHUNK) {
        // Gore chunks: heavier, more directed (fallback when no direction provided)
        angle = Math.random() * Math.PI * 2;
        speed = config.velocity * (0.6 + Math.random() * 0.6);
      } else {
        angle = Math.random() * Math.PI * 2;
        speed = config.velocity * (0.5 + Math.random() * 0.5);
      }

      const isTrail = type === ParticleType.BLOOD_TRAIL || type === ParticleType.BLOOD_DRIP;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: config.lifetime || 1000,
        maxLife: config.lifetime || 1000,
        size:
          (config.size || 3) *
          (0.7 + Math.random() * 0.6) *
          (type === ParticleType.GORE_CHUNK ? 1.5 : 1),
        color: this.getParticleColor(type),
        alpha: type === ParticleType.BLOOD_MIST ? 0.5 : 1,
        rotation: Math.random() * Math.PI * 2,
        angularVelocity: type === ParticleType.GORE_CHUNK ? (Math.random() - 0.5) * 10 : 0,
        trail: isTrail,
      });
    }
  }

  /**
   * Emit particles with pre-calculated velocity (for ragdoll blood trails).
   */
  emitWithVelocity(
    type: ParticleType,
    x: number,
    y: number,
    vx: number,
    vy: number,
    config: Partial<ParticleConfig>
  ): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y,
      vx: vx + (Math.random() - 0.5) * 20,
      vy: vy + (Math.random() - 0.5) * 20,
      life: config.lifetime || 800,
      maxLife: config.lifetime || 800,
      size: (config.size || 2) * (0.8 + Math.random() * 0.4),
      color: this.getParticleColor(type),
      alpha: 0.9,
      rotation: 0,
      angularVelocity: 0,
      trail: type === ParticleType.BLOOD_TRAIL,
    });
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    // Decay trail positions
    for (let i = this.trailPositions.length - 1; i >= 0; i--) {
      this.trailPositions[i].alpha -= dt * 0.5;
      if (this.trailPositions[i].alpha <= 0) {
        this.trailPositions.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.angularVelocity * dt;

      // Different physics for different particle types
      if (p.color === 0x006600) {
        // Decay cloud floats up slowly
        p.vy -= 20 * dt;
        p.vx *= 0.98;
      } else if (p.color === 0xff6600) {
        // Fire particles rise up with turbulence
        p.vy -= 60 * dt;
        p.vx += (Math.random() - 0.5) * 30 * dt;
        p.vx *= 0.95;
      } else if (p.color === 0x333333) {
        // Smoke rises slowly with spread
        p.vy -= 30 * dt;
        p.vx *= 0.97;
      } else if (p.color === 0x440000 || p.color === 0x550000) {
        // Blood mist: slow expansion, rises slightly
        p.vy -= 10 * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        // Grow over time
        p.size += dt * 3;
      } else if (p.color === 0x551111) {
        // Gore chunks: heavy gravity
        p.vy += 350 * dt;
        p.vx *= 0.98;
      } else {
        // Blood particles fall with gravity
        p.vy += 200 * dt;
      }

      // Leave trail positions for blood trails
      if (p.trail && p.life > p.maxLife * 0.3) {
        if (Math.random() > 0.6) {
          this.trailPositions.push({
            x: p.x,
            y: p.y,
            alpha: 0.6,
            size: p.size * 0.5,
            color: p.color,
          });
        }
      }

      p.life -= deltaTime;
      p.alpha = p.life / p.maxLife;

      // Fade out faster at the end
      if (p.life < p.maxLife * 0.3) {
        p.alpha *= p.life / (p.maxLife * 0.3);
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(): void {
    if (this.particles.length === 0 && this.trailPositions.length === 0) {
      if (this.hasDrawn) {
        this.graphics.clear();
        this.hasDrawn = false;
      }
      return;
    }
    this.graphics.clear();
    this.hasDrawn = true;

    // Render trail positions (persistent blood marks)
    for (const trail of this.trailPositions) {
      this.graphics
        .circle(trail.x, trail.y, trail.size)
        .fill({ color: trail.color, alpha: trail.alpha });
    }

    // Render particles
    for (const p of this.particles) {
      if (p.angularVelocity !== 0) {
        // Gore chunks: irregular shapes
        const s = p.size;
        this.graphics.save();
        // Draw rotated irregular shape
        this.graphics
          .moveTo(p.x + Math.cos(p.rotation) * s, p.y + Math.sin(p.rotation) * s)
          .lineTo(
            p.x + Math.cos(p.rotation + 1.8) * s * 0.7,
            p.y + Math.sin(p.rotation + 1.8) * s * 0.7
          )
          .lineTo(
            p.x + Math.cos(p.rotation + 3.6) * s * 0.9,
            p.y + Math.sin(p.rotation + 3.6) * s * 0.9
          )
          .lineTo(
            p.x + Math.cos(p.rotation + 5.0) * s * 0.6,
            p.y + Math.sin(p.rotation + 5.0) * s * 0.6
          )
          .closePath()
          .fill({ color: p.color, alpha: p.alpha });
        this.graphics.restore();
      } else {
        this.graphics.circle(p.x, p.y, p.size).fill({ color: p.color, alpha: p.alpha });
      }
    }
  }

  private getParticleColor(type: ParticleType): number {
    switch (type) {
      case ParticleType.BLOOD_SPLATTER:
        return [0x8b0000, 0xa00000, 0x7a0000][Math.floor(Math.random() * 3)];
      case ParticleType.BLOOD_DRIP:
        return 0x8b0000;
      case ParticleType.BLOOD_MIST:
        return [0x440000, 0x550000][Math.floor(Math.random() * 2)];
      case ParticleType.BLOOD_TRAIL:
        return [0x8b0000, 0x660000][Math.floor(Math.random() * 2)];
      case ParticleType.GORE_CHUNK:
        return [0x551111, 0x661111, 0x441111][Math.floor(Math.random() * 3)];
      case ParticleType.DECAY_CLOUD:
        return 0x006600;
      case ParticleType.SPARKS:
        return 0xffff00;
      case ParticleType.SMOKE:
        return 0x333333;
      case ParticleType.FIRE:
        return 0xff6600;
      case ParticleType.ELECTRICITY:
        return 0x00ffff;
      case ParticleType.BONE_FRAGMENTS:
        return 0xeeeeee;
      case ParticleType.METAL_SHARDS:
        return 0x888888;
      default:
        return 0xffffff;
    }
  }

  clear(): void {
    this.particles = [];
    this.trailPositions = [];
  }

  destroy(): void {
    this.graphics.destroy({ children: true });
    this.particles = [];
    this.trailPositions = [];
  }

  getGraphics(): Graphics {
    return this.graphics;
  }
}
