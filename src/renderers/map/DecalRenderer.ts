import type { Graphics } from 'pixi.js';
import { COLORS, DECALS } from '../../config/visualConstants';
import type { MapData } from '../../managers/MapManager';
import { ensurePathGraph, pathGraphToSegments } from '../../path/pathGraph';
import { createSeededRandom, hashString } from '../../utils/seededRandom';

interface SwayTree {
  x: number;
  y: number;
  height: number;
  phase: number;
  swaySpeed: number;
}

interface Pond {
  x: number;
  y: number;
  rx: number;
  ry: number;
  phase: number;
}

interface Reed {
  x: number;
  y: number;
  height: number;
  phase: number;
  swaySpeed: number;
}

interface Bird {
  x: number;
  y: number;
  baseY: number;
  speed: number;
  size: number;
  phase: number;
  bobSpeed: number;
  direction: 1 | -1;
}

/**
 * Lightweight animated map decals: swaying trees, shimmering ponds,
 * reeds, and distant birds. Redrawn each frame into a dedicated Graphics.
 */
export class DecalRenderer {
  private graphics: Graphics;
  private time = 0;
  private mapWidth = 1024;
  private mapHeight = 768;
  private trees: SwayTree[] = [];
  private ponds: Pond[] = [];
  private reeds: Reed[] = [];
  private birds: Bird[] = [];

  constructor(graphics: Graphics) {
    this.graphics = graphics;
  }

  /**
   * Place decals for the current map (seeded for stable layout across remounts).
   */
  public initialize(mapData: MapData): void {
    this.clear();
    this.mapWidth = mapData.width;
    this.mapHeight = mapData.height;

    const rand = createSeededRandom(
      hashString(mapData.name) ^ (mapData.width * 31 + mapData.height)
    );

    this.placeTrees(mapData, rand);
    this.placePonds(mapData, rand);
    this.placeBirds(rand);

    // Prefer authored decorations when present
    if (mapData.decorations?.length) {
      this.applyAuthoredDecorations(mapData);
    }
  }

  public update(deltaTime: number): void {
    if (this.trees.length === 0 && this.ponds.length === 0 && this.birds.length === 0) {
      return;
    }

    this.time += deltaTime * 0.001;

    for (const bird of this.birds) {
      bird.x += bird.speed * bird.direction * (deltaTime * 0.001);
      bird.y =
        bird.baseY + Math.sin(this.time * bird.bobSpeed + bird.phase) * DECALS.BIRD_BOB_AMPLITUDE;

      if (bird.direction === 1 && bird.x > this.mapWidth + 20) {
        bird.x = -20;
      } else if (bird.direction === -1 && bird.x < -20) {
        bird.x = this.mapWidth + 20;
      }
    }

    this.render();
  }

  public clear(): void {
    this.graphics.clear();
    this.trees = [];
    this.ponds = [];
    this.reeds = [];
    this.birds = [];
    this.time = 0;
  }

  private applyAuthoredDecorations(mapData: MapData): void {
    for (const deco of mapData.decorations ?? []) {
      if (deco.type === 'tree') {
        this.trees.push({
          x: deco.x,
          y: deco.y,
          height: deco.size,
          phase: (deco.x + deco.y) * 0.01,
          swaySpeed: DECALS.TREE_SWAY_SPEED * (0.85 + (deco.size % 7) * 0.03),
        });
      } else if (deco.type === 'pond') {
        const pond: Pond = {
          x: deco.x,
          y: deco.y,
          rx: deco.size,
          ry: deco.size * 0.5,
          phase: (deco.x + deco.y) * 0.01,
        };
        this.ponds.push(pond);
        this.addReedsAroundPond(pond, createSeededRandom(Math.floor(deco.x * 13 + deco.y * 17)));
      }
    }
  }

  private placeTrees(mapData: MapData, rand: () => number): void {
    const target = Math.max(
      DECALS.TREE_COUNT,
      Math.round(DECALS.TREE_COUNT * ((mapData.width * mapData.height) / (1024 * 768)))
    );
    let attempts = 0;
    while (this.trees.length < target && attempts < target * 40) {
      attempts++;
      const x = 40 + rand() * (mapData.width - 80);
      const y = DECALS.MIN_Y + rand() * (mapData.height - DECALS.MIN_Y - 40);
      if (!this.isAwayFromPath(x, y, mapData)) {
        continue;
      }
      this.trees.push({
        x,
        y,
        height: DECALS.TREE_MIN_HEIGHT + rand() * (DECALS.TREE_MAX_HEIGHT - DECALS.TREE_MIN_HEIGHT),
        phase: rand() * Math.PI * 2,
        swaySpeed: DECALS.TREE_SWAY_SPEED * (0.7 + rand() * 0.6),
      });
    }
  }

  private placePonds(mapData: MapData, rand: () => number): void {
    const target = Math.max(
      DECALS.POND_COUNT,
      Math.round(DECALS.POND_COUNT * ((mapData.width * mapData.height) / (1024 * 768)))
    );
    let attempts = 0;
    while (this.ponds.length < target && attempts < target * 50) {
      attempts++;
      const x = 80 + rand() * (mapData.width - 160);
      const y = DECALS.MIN_Y + 40 + rand() * (mapData.height - DECALS.MIN_Y - 120);
      const rx = DECALS.POND_MIN_RX + rand() * (DECALS.POND_MAX_RX - DECALS.POND_MIN_RX);
      const ry = DECALS.POND_MIN_RY + rand() * (DECALS.POND_MAX_RY - DECALS.POND_MIN_RY);
      if (!this.isAwayFromPath(x, y, mapData, DECALS.PATH_CLEARANCE + rx)) {
        continue;
      }
      if (this.ponds.some(p => Math.hypot(p.x - x, p.y - y) < p.rx + rx + 40)) {
        continue;
      }
      const pond: Pond = {
        x,
        y,
        rx,
        ry,
        phase: rand() * Math.PI * 2,
      };
      this.ponds.push(pond);
      this.addReedsAroundPond(pond, rand);
    }
  }

  private addReedsAroundPond(pond: Pond, rand: () => number): void {
    for (let i = 0; i < DECALS.REED_PER_POND; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = pond.rx * (0.85 + rand() * 0.35);
      this.reeds.push({
        x: pond.x + Math.cos(angle) * dist,
        y: pond.y + Math.sin(angle) * dist * (pond.ry / pond.rx),
        height: DECALS.REED_MIN_HEIGHT + rand() * (DECALS.REED_MAX_HEIGHT - DECALS.REED_MIN_HEIGHT),
        phase: rand() * Math.PI * 2,
        swaySpeed: DECALS.REED_SWAY_SPEED * (0.8 + rand() * 0.5),
      });
    }
  }

  private placeBirds(rand: () => number): void {
    for (let i = 0; i < DECALS.BIRD_COUNT; i++) {
      const direction: 1 | -1 = rand() > 0.5 ? 1 : -1;
      const baseY = DECALS.BIRD_MIN_Y + rand() * (DECALS.BIRD_MAX_Y - DECALS.BIRD_MIN_Y);
      this.birds.push({
        x: rand() * this.mapWidth,
        y: baseY,
        baseY,
        speed: DECALS.BIRD_MIN_SPEED + rand() * (DECALS.BIRD_MAX_SPEED - DECALS.BIRD_MIN_SPEED),
        size: DECALS.BIRD_MIN_SIZE + rand() * (DECALS.BIRD_MAX_SIZE - DECALS.BIRD_MIN_SIZE),
        phase: rand() * Math.PI * 2,
        bobSpeed: DECALS.BIRD_BOB_SPEED * (0.7 + rand() * 0.6),
        direction,
      });
    }
  }

  private render(): void {
    this.graphics.clear();

    for (const pond of this.ponds) {
      this.drawPond(pond);
    }
    for (const reed of this.reeds) {
      this.drawReed(reed);
    }
    for (const tree of this.trees) {
      this.drawSwayTree(tree);
    }
    for (const bird of this.birds) {
      this.drawBird(bird);
    }
  }

  private drawPond(pond: Pond): void {
    // Muddy bank
    this.graphics
      .ellipse(pond.x, pond.y, pond.rx + 4, pond.ry + 3)
      .fill({ color: COLORS.DECAL_POND_EDGE, alpha: 0.55 });

    // Deep water
    this.graphics
      .ellipse(pond.x, pond.y, pond.rx, pond.ry)
      .fill({ color: COLORS.DECAL_POND_DEEP, alpha: 0.85 });

    // Surface
    this.graphics
      .ellipse(pond.x, pond.y - 1, pond.rx * 0.92, pond.ry * 0.85)
      .fill({ color: COLORS.DECAL_POND_WATER, alpha: 0.7 });

    // Bank stones and drifting lily pads
    for (let i = 0; i < 6; i++) {
      const a = pond.phase + i * 1.05;
      this.graphics
        .ellipse(
          pond.x + Math.cos(a) * (pond.rx + 3),
          pond.y + Math.sin(a) * (pond.ry + 2),
          2.2 + (i % 3) * 0.7,
          1.5 + (i % 2) * 0.5
        )
        .fill({ color: 0x4a4a46, alpha: 0.8 });
    }
    for (let i = 0; i < 3; i++) {
      const drift = this.time * 0.15 + pond.phase + i * 2.1;
      const px = pond.x + Math.cos(drift) * pond.rx * 0.45 + (i - 1) * pond.rx * 0.2;
      const py = pond.y + Math.sin(drift * 0.8) * pond.ry * 0.4;
      this.graphics.ellipse(px, py, 3.4, 2.2).fill({ color: 0x3a6a2a, alpha: 0.85 });
      this.graphics.ellipse(px - 0.6, py - 0.4, 1.6, 1).fill({ color: 0x5a8a3a, alpha: 0.6 });
    }

    // Shimmer ripples
    for (let i = 0; i < DECALS.POND_SHIMMER_COUNT; i++) {
      const t = this.time * DECALS.POND_SHIMMER_SPEED + pond.phase + i * 1.7;
      const pulse = Math.sin(t) * 0.5 + 0.5;
      const rx = pond.rx * (0.25 + i * 0.18 + pulse * 0.08);
      const ry = pond.ry * (0.2 + i * 0.15 + pulse * 0.06);
      this.graphics
        .ellipse(pond.x + Math.sin(t * 0.6) * 3, pond.y + Math.cos(t * 0.5) * 2, rx, ry)
        .stroke({
          width: 1,
          color: COLORS.DECAL_POND_SHIMMER,
          alpha: 0.15 + pulse * 0.25,
        });
    }

    // Specular highlight
    const highlightPulse = Math.sin(this.time * 2 + pond.phase) * 0.5 + 0.5;
    this.graphics
      .ellipse(pond.x - pond.rx * 0.25, pond.y - pond.ry * 0.35, pond.rx * 0.35, pond.ry * 0.2)
      .fill({ color: COLORS.DECAL_POND_SHIMMER, alpha: 0.12 + highlightPulse * 0.18 });
  }

  private drawReed(reed: Reed): void {
    const sway = Math.sin(this.time * reed.swaySpeed + reed.phase) * DECALS.REED_SWAY_AMPLITUDE;
    const tipX = reed.x + sway;
    const tipY = reed.y - reed.height;

    this.graphics
      .moveTo(reed.x, reed.y)
      .quadraticCurveTo(reed.x + sway * 0.5, reed.y - reed.height * 0.5, tipX, tipY)
      .stroke({ width: 1.5, color: COLORS.DECAL_REED, alpha: 0.75 });

    // Leaf blade, and a cattail head on every other reed
    this.graphics
      .moveTo(tipX, tipY)
      .lineTo(tipX + sway * 0.4 + 2, tipY + 3)
      .stroke({ width: 1, color: COLORS.DECAL_REED, alpha: 0.6 });
    if (Math.floor(reed.phase * 10) % 2 === 0) {
      this.graphics.ellipse(tipX, tipY - 1.5, 1.3, 3).fill({ color: 0x4a3222, alpha: 0.9 });
    }
  }

  private drawSwayTree(tree: SwayTree): void {
    const g = this.graphics;
    const h = tree.height;
    const sway = Math.sin(this.time * tree.swaySpeed + tree.phase) * DECALS.TREE_SWAY_AMPLITUDE;
    const gust = Math.sin(this.time * tree.swaySpeed * 2.3 + tree.phase * 1.7) * 0.6;
    const trunkW = h * 0.16;
    const trunkH = h * 0.45;
    const baseY = tree.y + trunkH;

    // Cast shadow, stretched away from the light (upper-left)
    g.ellipse(tree.x + h * 0.2 + sway * 0.3, baseY, h * 0.42, h * 0.13).fill({
      color: 0x0a0f08,
      alpha: 0.3,
    });

    // Tapered trunk with a lit edge, root flare and a fork into the canopy
    const topX = tree.x + sway * 0.25;
    g.poly([
      tree.x - trunkW * 0.8,
      baseY,
      tree.x - trunkW * 0.38,
      baseY - trunkH * 0.25,
      topX - trunkW * 0.3,
      tree.y,
      topX + trunkW * 0.3,
      tree.y,
      tree.x + trunkW * 0.38,
      baseY - trunkH * 0.25,
      tree.x + trunkW * 0.8,
      baseY,
    ]).fill(COLORS.DECAL_TREE_TRUNK);
    g.moveTo(tree.x - trunkW * 0.25, baseY - 1)
      .lineTo(topX - trunkW * 0.15, tree.y)
      .stroke({ width: 1, color: 0x7a6248, alpha: 0.5 });
    g.moveTo(tree.x + trunkW * 0.3, baseY - 1)
      .lineTo(topX + trunkW * 0.2, tree.y)
      .stroke({ width: 1, color: 0x1a120a, alpha: 0.5 });
    g.moveTo(topX, tree.y + trunkH * 0.15)
      .lineTo(topX - h * 0.18 + sway * 0.6, tree.y - h * 0.12)
      .stroke({ width: trunkW * 0.35, color: COLORS.DECAL_TREE_TRUNK });
    g.moveTo(topX, tree.y + trunkH * 0.15)
      .lineTo(topX + h * 0.18 + sway * 0.6, tree.y - h * 0.1)
      .stroke({ width: trunkW * 0.35, color: COLORS.DECAL_TREE_TRUNK });

    // Canopy: clustered lobes (fixed layout per tree), tips swinging more than the base.
    // Drawn dark -> mid -> lit so the lobes read as volume, light from the upper left.
    const cy = tree.y - h * 0.2;
    const lobes = 6;
    const passes = [
      { color: COLORS.DECAL_TREE_FOLIAGE_DARK, scale: 1, dx: 0.06, dy: 0.08, alpha: 0.95 },
      { color: COLORS.DECAL_TREE_FOLIAGE, scale: 0.78, dx: -0.02, dy: -0.02, alpha: 0.92 },
      { color: 0x5a7a3a, scale: 0.42, dx: -0.1, dy: -0.1, alpha: 0.75 },
    ];
    for (const pass of passes) {
      for (let i = 0; i < lobes; i++) {
        const ang = tree.phase + (i / lobes) * Math.PI * 2;
        const ring = i === 0 ? 0 : 1;
        const lx = Math.cos(ang) * h * 0.24 * ring;
        const ly = Math.sin(ang) * h * 0.16 * ring - ring * h * 0.04;
        const wind = (sway + gust * (ly < 0 ? 1.4 : 0.6)) * (1 + (-ly / h) * 1.2);
        const r = h * (i === 0 ? 0.3 : 0.2 + 0.03 * ((i * 7) % 3)) * pass.scale;
        g.circle(topX + lx + wind * 0.5 + pass.dx * h, cy + ly + pass.dy * h, r).fill({
          color: pass.color,
          alpha: pass.alpha,
        });
      }
    }
  }

  private drawBird(bird: Bird): void {
    const wingFlap = Math.sin(this.time * DECALS.BIRD_WING_SPEED + bird.phase);
    const wingY = wingFlap * bird.size * 0.6;
    const dir = bird.direction;
    const s = bird.size;

    // Simple chevron / V silhouette
    this.graphics
      .moveTo(bird.x - s * dir, bird.y + wingY)
      .lineTo(bird.x, bird.y)
      .lineTo(bird.x + s * dir, bird.y + wingY)
      .stroke({ width: 1.5, color: COLORS.DECAL_BIRD, alpha: 0.55 });
  }

  private isAwayFromPath(
    x: number,
    y: number,
    mapData: MapData,
    clearance: number = DECALS.PATH_CLEARANCE
  ): boolean {
    const segments = pathGraphToSegments(ensurePathGraph(mapData));
    for (const seg of segments) {
      if (distanceToSegment(x, y, seg.a.x, seg.a.y, seg.b.x, seg.b.y) < clearance) {
        return false;
      }
    }
    // Keep clear of graveyard spawn area
    if (x < 180 && y > 240 && y < 540) {
      return false;
    }
    return true;
  }
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
