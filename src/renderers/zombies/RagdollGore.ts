import type { Graphics } from 'pixi.js';

interface Splat {
  x: number;
  y: number;
  r: number;
  /** Squash on the ground plane. */
  squash: number;
}

interface PoolLobe {
  angle: number;
  reach: number;
  size: number;
}

/**
 * The blood a ragdoll leaves on the ground: a pool that spreads while the body is still bleeding,
 * plus splats thrown where bleeding parts hit the floor. Drawn under the body and kept as part of
 * the corpse afterwards.
 */
export class RagdollGore {
  private poolX = 0;
  private poolY = 0;
  private radius = 0;
  private readonly targetRadius: number;
  private readonly growRate: number;
  private readonly lobes: PoolLobe[] = [];
  private readonly splats: Splat[] = [];
  private placed = false;

  constructor(
    private readonly color: number,
    size: number,
    bloodAmount: number
  ) {
    // bloodAmount ~ total expected bleed (rate x duration); more blood = wider pool
    this.targetRadius = Math.min(size * 1.7, size * (0.6 + bloodAmount * 0.025));
    this.growRate = this.targetRadius / 1400;
    const lobeCount = 7;
    for (let i = 0; i < lobeCount; i++) {
      this.lobes.push({
        angle: (i / lobeCount) * Math.PI * 2 + Math.random() * 0.6,
        reach: 0.7 + Math.random() * 0.5,
        size: 0.25 + Math.random() * 0.25,
      });
    }
  }

  /** Where the body currently is on the ground; the pool slides after it until it settles. */
  public update(deltaMs: number, bodyX: number, groundY: number, settled: boolean): void {
    if (!this.placed) {
      this.poolX = bodyX;
      this.poolY = groundY - 1;
      this.placed = true;
    } else if (!settled) {
      this.poolX += (bodyX - this.poolX) * 0.04;
    }
    this.radius = Math.min(this.targetRadius, this.radius + this.growRate * deltaMs);
  }

  public addSplat(x: number, y: number, speed: number): void {
    if (this.splats.length >= 14) {
      return;
    }
    const r = Math.min(4.5, 1.2 + speed * 0.008);
    this.splats.push({ x, y, r, squash: 0.45 });
    // A few satellite droplets
    for (let i = 0; i < 3; i++) {
      this.splats.push({
        x: x + (Math.random() - 0.5) * r * 5,
        y: y + (Math.random() - 0.5) * r * 1.5,
        r: r * (0.15 + Math.random() * 0.25),
        squash: 0.5,
      });
    }
  }

  public draw(g: Graphics, alpha = 1): void {
    const dark = shade(this.color, 0.75);
    for (const s of this.splats) {
      g.ellipse(s.x, s.y, s.r, s.r * s.squash).fill({ color: this.color, alpha: alpha * 0.75 });
    }
    if (this.radius < 1) {
      return;
    }
    const r = this.radius;
    for (const lobe of this.lobes) {
      g.ellipse(
        this.poolX + Math.cos(lobe.angle) * r * lobe.reach,
        this.poolY + Math.sin(lobe.angle) * r * lobe.reach * 0.42,
        r * lobe.size,
        r * lobe.size * 0.45
      ).fill({ color: this.color, alpha: alpha * 0.72 });
    }
    g.ellipse(this.poolX, this.poolY, r * 0.9, r * 0.4).fill({
      color: this.color,
      alpha: alpha * 0.8,
    });
    g.ellipse(this.poolX, this.poolY, r * 0.6, r * 0.27).fill({ color: dark, alpha: alpha * 0.85 });
    // Wet highlight
    g.ellipse(this.poolX - r * 0.25, this.poolY - r * 0.08, r * 0.2, r * 0.06).fill({
      color: 0xffffff,
      alpha: alpha * 0.1,
    });
  }
}

function shade(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 255) * factor);
  const g = Math.round(((color >> 8) & 255) * factor);
  const b = Math.round((color & 255) * factor);
  return (r << 16) | (g << 8) | b;
}
