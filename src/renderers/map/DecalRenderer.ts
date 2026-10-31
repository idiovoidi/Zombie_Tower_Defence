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

    // Leaf tip
    this.graphics
      .moveTo(tipX, tipY)
      .lineTo(tipX + sway * 0.4 + 2, tipY + 3)
      .stroke({ width: 1, color: COLORS.DECAL_REED, alpha: 0.6 });
  }

  private drawSwayTree(tree: SwayTree): void {
    const sway = Math.sin(this.time * tree.swaySpeed + tree.phase) * DECALS.TREE_SWAY_AMPLITUDE;
    const trunkWidth = tree.height * 0.14;
    const trunkHeight = tree.height * 0.45;
    const trunkTop = tree.y;

    // Shadow
    this.graphics
      .ellipse(tree.x + sway * 0.3, tree.y + trunkHeight, tree.height * 0.35, tree.height * 0.12)
      .fill({ color: 0x1a1a1a, alpha: 0.25 });

    // Trunk (static base)
    this.graphics
      .rect(tree.x - trunkWidth / 2, trunkTop, trunkWidth, trunkHeight)
      .fill(COLORS.DECAL_TREE_TRUNK);

    // Foliage canopy — leans with wind
    const canopyCx = tree.x + sway;
    const canopyCy = trunkTop - tree.height * 0.15;
    const layers = [
      { r: tree.height * 0.42, alpha: 0.9, color: COLORS.DECAL_TREE_FOLIAGE_DARK },
      { r: tree.height * 0.32, alpha: 0.85, color: COLORS.DECAL_TREE_FOLIAGE },
      { r: tree.height * 0.2, alpha: 0.8, color: COLORS.DECAL_TREE_FOLIAGE },
    ];

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const layerSway = sway * (1 + i * 0.15);
      this.graphics
        .circle(canopyCx + layerSway * 0.2, canopyCy - i * tree.height * 0.12, layer.r)
        .fill({ color: layer.color, alpha: layer.alpha });
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
