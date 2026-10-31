import type { Graphics } from 'pixi.js';
import { COLORS, GROUND_TEXTURE } from '../../config/visualConstants';
import type { MapData } from '../../managers/MapManager';
import { createSeededRandom, hashString } from '../../utils/seededRandom';

/**
 * TerrainRenderer
 *
 * Responsible for rendering the ground terrain including:
 * - Base ground layer with large-scale mottling
 * - Dirt/mud/ash patches (multi-pass soft edges)
 * - Dead grass patches
 * - Rocks with highlight/shadow
 * - Pebbles
 * - Ground cracks
 * - Weathering stains
 * - Grass tufts with blade strokes
 *
 * Feature counts scale with map area so wider/taller maps stay dense.
 * Spawns are inset from borders so soft blobs don't leave jagged map edges.
 */
export class TerrainRenderer {
  private graphics: Graphics;
  private rand: () => number = Math.random;

  constructor(graphics: Graphics) {
    this.graphics = graphics;
  }

  public render(mapData: MapData): void {
    this.rand = createSeededRandom(
      hashString(mapData.name) ^ (mapData.width * 31 + mapData.height * 17)
    );

    this.renderBaseLayer(mapData);
    this.renderMottling(mapData);
    this.renderDirtPatches(mapData);
    this.renderDeadGrassPatches(mapData);
    this.renderBarrenDirtPatches(mapData);
    this.renderMudPatches(mapData);
    this.renderAshPatches(mapData);
    this.renderRocksAndDebris(mapData);
    this.renderPebbles(mapData);
    this.renderGroundCracks(mapData);
    this.renderWeatheringStains(mapData);
    this.renderGrassTufts(mapData);
    this.sealMapEdges(mapData);
  }

  /** Scale authored counts so density stays consistent across map sizes. */
  private scaledCount(baseCount: number, mapData: MapData): number {
    const reference = GROUND_TEXTURE.REFERENCE_WIDTH * GROUND_TEXTURE.REFERENCE_HEIGHT;
    const area = Math.max(1, mapData.width * mapData.height);
    return Math.max(1, Math.round(baseCount * (area / reference)));
  }

  private randomPoint(
    mapData: MapData,
    inset: number = GROUND_TEXTURE.EDGE_INSET
  ): { x: number; y: number } {
    const ix = Math.min(inset, mapData.width * 0.45);
    const iy = Math.min(inset, mapData.height * 0.45);
    return {
      x: ix + this.rand() * Math.max(1, mapData.width - ix * 2),
      y: iy + this.rand() * Math.max(1, mapData.height - iy * 2),
    };
  }

  private renderBaseLayer(mapData: MapData): void {
    this.graphics.rect(0, 0, mapData.width, mapData.height);
    this.graphics.fill({ color: COLORS.GROUND_BASE });
  }

  /**
   * Cover border spill from soft blobs with a continuous base rim so map
   * edges read as a clean rectangle when panning.
   */
  private sealMapEdges(mapData: MapData): void {
    const t = Math.min(18, GROUND_TEXTURE.EDGE_INSET * 0.4);
    const c = COLORS.GROUND_BASE;
    this.graphics.rect(0, 0, mapData.width, t).fill({ color: c, alpha: 0.92 });
    this.graphics.rect(0, mapData.height - t, mapData.width, t).fill({ color: c, alpha: 0.92 });
    this.graphics.rect(0, 0, t, mapData.height).fill({ color: c, alpha: 0.92 });
    this.graphics.rect(mapData.width - t, 0, t, mapData.height).fill({ color: c, alpha: 0.92 });
  }

  private renderMottling(mapData: MapData): void {
    const count = this.scaledCount(GROUND_TEXTURE.MOTTLE_COUNT, mapData);
    for (let i = 0; i < count; i++) {
      const { x, y } = this.randomPoint(mapData, GROUND_TEXTURE.MOTTLE_MAX_SIZE * 0.35);
      const rx =
        GROUND_TEXTURE.MOTTLE_MIN_SIZE +
        this.rand() * (GROUND_TEXTURE.MOTTLE_MAX_SIZE - GROUND_TEXTURE.MOTTLE_MIN_SIZE);
      const ry = rx * (0.45 + this.rand() * 0.45);
      const dark = this.rand() > 0.45;
      const alpha =
        GROUND_TEXTURE.MOTTLE_MIN_ALPHA +
        this.rand() * (GROUND_TEXTURE.MOTTLE_MAX_ALPHA - GROUND_TEXTURE.MOTTLE_MIN_ALPHA);

      this.graphics.ellipse(x, y, rx, ry).fill({
        color: dark ? COLORS.GROUND_MOTTLE_DARK : COLORS.GROUND_MOTTLE_LIGHT,
        alpha,
      });
      this.graphics
        .ellipse(x + (this.rand() - 0.5) * 8, y + (this.rand() - 0.5) * 6, rx * 0.55, ry * 0.55)
        .fill({
          color: dark ? COLORS.GROUND_MOTTLE_DARK : COLORS.GROUND_MOTTLE_LIGHT,
          alpha: alpha * 0.7,
        });
    }
  }

  private renderSoftBlob(
    x: number,
    y: number,
    size: number,
    points: number,
    minRadius: number,
    maxRadius: number,
    color: number,
    alpha: number,
    angleJitter = 0,
    coreColor?: number
  ): void {
    const radii: number[] = [];
    const angles: number[] = [];
    for (let j = 0; j < points; j++) {
      angles.push((j / points) * Math.PI * 2 + this.rand() * angleJitter);
      radii.push(size * (minRadius + this.rand() * (maxRadius - minRadius)));
    }

    this.graphics.moveTo(
      x + Math.cos(angles[0]) * radii[0] * 1.12,
      y + Math.sin(angles[0]) * radii[0] * 1.12
    );
    for (let j = 1; j < points; j++) {
      this.graphics.lineTo(
        x + Math.cos(angles[j]) * radii[j] * 1.12,
        y + Math.sin(angles[j]) * radii[j] * 1.12
      );
    }
    this.graphics.fill({ color, alpha: alpha * 0.45 });

    this.graphics.moveTo(x + Math.cos(angles[0]) * radii[0], y + Math.sin(angles[0]) * radii[0]);
    for (let j = 1; j < points; j++) {
      this.graphics.lineTo(x + Math.cos(angles[j]) * radii[j], y + Math.sin(angles[j]) * radii[j]);
    }
    this.graphics.fill({ color, alpha });

    if (coreColor !== undefined) {
      this.graphics
        .ellipse(
          x + (this.rand() - 0.5) * size * 0.15,
          y + (this.rand() - 0.5) * size * 0.1,
          size * 0.35,
          size * 0.22
        )
        .fill({ color: coreColor, alpha: alpha * 0.55 });
    }
  }

  private renderBlobPatches(
    mapData: MapData,
    count: number,
    minSize: number,
    maxSize: number,
    minPoints: number,
    maxPoints: number,
    minRadius: number,
    maxRadius: number,
    color: number,
    minAlpha: number,
    maxAlpha: number,
    angleJitter = 0,
    coreColor?: number
  ): void {
    const scaled = this.scaledCount(count, mapData);
    const inset = Math.max(GROUND_TEXTURE.EDGE_INSET, maxSize * 0.85);
    for (let i = 0; i < scaled; i++) {
      const { x, y } = this.randomPoint(mapData, inset);
      const size = minSize + this.rand() * (maxSize - minSize);
      const points = minPoints + Math.floor(this.rand() * (maxPoints - minPoints));
      const alpha = minAlpha + this.rand() * (maxAlpha - minAlpha);
      this.renderSoftBlob(
        x,
        y,
        size,
        points,
        minRadius,
        maxRadius,
        color,
        alpha,
        angleJitter,
        coreColor
      );
    }
  }

  private renderDirtPatches(mapData: MapData): void {
    this.renderBlobPatches(
      mapData,
      GROUND_TEXTURE.DIRT_PATCH_COUNT,
      GROUND_TEXTURE.DIRT_PATCH_MIN_SIZE,
      GROUND_TEXTURE.DIRT_PATCH_MAX_SIZE,
      GROUND_TEXTURE.DIRT_PATCH_MIN_POINTS,
      GROUND_TEXTURE.DIRT_PATCH_MAX_POINTS,
      GROUND_TEXTURE.DIRT_PATCH_MIN_RADIUS_FACTOR,
      GROUND_TEXTURE.DIRT_PATCH_MAX_RADIUS_FACTOR,
      COLORS.GROUND_DIRT_PATCH,
      GROUND_TEXTURE.DIRT_PATCH_MIN_ALPHA,
      GROUND_TEXTURE.DIRT_PATCH_MAX_ALPHA,
      0,
      COLORS.GROUND_DIRT_CORE
    );
  }

  private renderDeadGrassPatches(mapData: MapData): void {
    this.renderBlobPatches(
      mapData,
      GROUND_TEXTURE.DEAD_GRASS_COUNT,
      GROUND_TEXTURE.DEAD_GRASS_MIN_SIZE,
      GROUND_TEXTURE.DEAD_GRASS_MAX_SIZE,
      GROUND_TEXTURE.DEAD_GRASS_MIN_POINTS,
      GROUND_TEXTURE.DEAD_GRASS_MAX_POINTS,
      GROUND_TEXTURE.DEAD_GRASS_MIN_RADIUS_FACTOR,
      GROUND_TEXTURE.DEAD_GRASS_MAX_RADIUS_FACTOR,
      COLORS.GROUND_DEAD_GRASS,
      GROUND_TEXTURE.DEAD_GRASS_MIN_ALPHA,
      GROUND_TEXTURE.DEAD_GRASS_MAX_ALPHA,
      0,
      COLORS.GROUND_DEAD_GRASS_TIP
    );
  }

  private renderBarrenDirtPatches(mapData: MapData): void {
    this.renderBlobPatches(
      mapData,
      GROUND_TEXTURE.BARREN_DIRT_COUNT,
      GROUND_TEXTURE.BARREN_DIRT_MIN_SIZE,
      GROUND_TEXTURE.BARREN_DIRT_MAX_SIZE,
      GROUND_TEXTURE.BARREN_DIRT_MIN_POINTS,
      GROUND_TEXTURE.BARREN_DIRT_MAX_POINTS,
      GROUND_TEXTURE.BARREN_DIRT_MIN_RADIUS_FACTOR,
      GROUND_TEXTURE.BARREN_DIRT_MAX_RADIUS_FACTOR,
      COLORS.GROUND_BARREN_DIRT,
      GROUND_TEXTURE.BARREN_DIRT_MIN_ALPHA,
      GROUND_TEXTURE.BARREN_DIRT_MAX_ALPHA,
      0.5
    );
  }

  private renderMudPatches(mapData: MapData): void {
    const count = this.scaledCount(GROUND_TEXTURE.MUD_COUNT, mapData);
    const inset = Math.max(GROUND_TEXTURE.EDGE_INSET, GROUND_TEXTURE.MUD_MAX_SIZE);
    for (let i = 0; i < count; i++) {
      const { x, y } = this.randomPoint(mapData, inset);
      const rx =
        GROUND_TEXTURE.MUD_MIN_SIZE +
        this.rand() * (GROUND_TEXTURE.MUD_MAX_SIZE - GROUND_TEXTURE.MUD_MIN_SIZE);
      const ry = rx * (0.4 + this.rand() * 0.4);
      const alpha =
        GROUND_TEXTURE.MUD_MIN_ALPHA +
        this.rand() * (GROUND_TEXTURE.MUD_MAX_ALPHA - GROUND_TEXTURE.MUD_MIN_ALPHA);
      this.graphics.ellipse(x, y, rx, ry).fill({ color: COLORS.GROUND_MUD, alpha });
      this.graphics
        .ellipse(x + rx * 0.1, y, rx * 0.55, ry * 0.5)
        .fill({ color: COLORS.GROUND_MUD, alpha: alpha * 0.6 });
    }
  }

  private renderAshPatches(mapData: MapData): void {
    const count = this.scaledCount(GROUND_TEXTURE.ASH_COUNT, mapData);
    const inset = Math.max(GROUND_TEXTURE.EDGE_INSET, GROUND_TEXTURE.ASH_MAX_SIZE);
    for (let i = 0; i < count; i++) {
      const { x, y } = this.randomPoint(mapData, inset);
      const size =
        GROUND_TEXTURE.ASH_MIN_SIZE +
        this.rand() * (GROUND_TEXTURE.ASH_MAX_SIZE - GROUND_TEXTURE.ASH_MIN_SIZE);
      const alpha =
        GROUND_TEXTURE.ASH_MIN_ALPHA +
        this.rand() * (GROUND_TEXTURE.ASH_MAX_ALPHA - GROUND_TEXTURE.ASH_MIN_ALPHA);
      this.renderSoftBlob(x, y, size, 6, 0.6, 1.2, COLORS.GROUND_ASH, alpha, 0.3);
    }
  }

  private renderRocksAndDebris(mapData: MapData): void {
    const count = this.scaledCount(GROUND_TEXTURE.ROCK_COUNT, mapData);
    for (let i = 0; i < count; i++) {
      const { x, y } = this.randomPoint(mapData, GROUND_TEXTURE.EDGE_INSET * 0.5);
      const size =
        GROUND_TEXTURE.ROCK_MIN_SIZE +
        this.rand() * (GROUND_TEXTURE.ROCK_MAX_SIZE - GROUND_TEXTURE.ROCK_MIN_SIZE);
      const points =
        GROUND_TEXTURE.ROCK_MIN_POINTS +
        Math.floor(this.rand() * (GROUND_TEXTURE.ROCK_MAX_POINTS - GROUND_TEXTURE.ROCK_MIN_POINTS));
      const alpha =
        GROUND_TEXTURE.ROCK_MIN_ALPHA +
        this.rand() * (GROUND_TEXTURE.ROCK_MAX_ALPHA - GROUND_TEXTURE.ROCK_MIN_ALPHA);

      this.graphics
        .ellipse(x + 1, y + size * 0.35, size * 0.85, size * 0.35)
        .fill({ color: COLORS.GROUND_ROCK_SHADOW, alpha: 0.3 });

      const path: number[] = [];
      for (let j = 0; j < points; j++) {
        const angle = (j / points) * Math.PI * 2 + this.rand() * 0.25;
        const radius =
          size *
          (GROUND_TEXTURE.ROCK_MIN_RADIUS_FACTOR +
            this.rand() *
              (GROUND_TEXTURE.ROCK_MAX_RADIUS_FACTOR - GROUND_TEXTURE.ROCK_MIN_RADIUS_FACTOR));
        path.push(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      }
      this.graphics.poly(path).fill({ color: COLORS.GROUND_ROCK, alpha });
      this.graphics.poly(path).stroke({ width: 1, color: COLORS.GROUND_ROCK_SHADOW, alpha: 0.4 });

      if (size > 6) {
        this.graphics
          .ellipse(x - size * 0.2, y - size * 0.2, size * 0.2, size * 0.12)
          .fill({ color: COLORS.GROUND_ROCK_HIGHLIGHT, alpha: 0.35 });
      }
    }
  }

  private renderPebbles(mapData: MapData): void {
    const count = this.scaledCount(GROUND_TEXTURE.PEBBLE_COUNT, mapData);
    for (let i = 0; i < count; i++) {
      const { x, y } = this.randomPoint(mapData, 8);
      const size =
        GROUND_TEXTURE.PEBBLE_MIN_SIZE +
        this.rand() * (GROUND_TEXTURE.PEBBLE_MAX_SIZE - GROUND_TEXTURE.PEBBLE_MIN_SIZE);
      this.graphics.ellipse(x, y, size, size * (0.6 + this.rand() * 0.35)).fill({
        color: COLORS.GROUND_PEBBLE,
        alpha:
          GROUND_TEXTURE.PEBBLE_MIN_ALPHA +
          this.rand() * (GROUND_TEXTURE.PEBBLE_MAX_ALPHA - GROUND_TEXTURE.PEBBLE_MIN_ALPHA),
      });
    }
  }

  private renderGroundCracks(mapData: MapData): void {
    const count = this.scaledCount(GROUND_TEXTURE.CRACK_COUNT, mapData);
    for (let i = 0; i < count; i++) {
      const { x, y } = this.randomPoint(mapData, GROUND_TEXTURE.EDGE_INSET);
      const mainLength =
        GROUND_TEXTURE.CRACK_MIN_LENGTH +
        this.rand() * (GROUND_TEXTURE.CRACK_MAX_LENGTH - GROUND_TEXTURE.CRACK_MIN_LENGTH);
      const angle = this.rand() * Math.PI * 2;

      let currentX = x;
      let currentY = y;
      const segments =
        GROUND_TEXTURE.CRACK_MIN_SEGMENTS +
        Math.floor(
          this.rand() * (GROUND_TEXTURE.CRACK_MAX_SEGMENTS - GROUND_TEXTURE.CRACK_MIN_SEGMENTS)
        );

      for (let s = 0; s < segments; s++) {
        const segLen = mainLength / segments;
        const segAngle = angle + (this.rand() - 0.5) * GROUND_TEXTURE.CRACK_ANGLE_VARIATION;
        const nextX = currentX + Math.cos(segAngle) * segLen;
        const nextY = currentY + Math.sin(segAngle) * segLen;
        const width =
          GROUND_TEXTURE.CRACK_MIN_WIDTH +
          this.rand() * (GROUND_TEXTURE.CRACK_MAX_WIDTH - GROUND_TEXTURE.CRACK_MIN_WIDTH);

        this.graphics
          .moveTo(currentX, currentY)
          .lineTo(nextX, nextY)
          .stroke({
            width: width + 1.5,
            color: COLORS.GROUND_CRACK_EDGE,
            alpha: GROUND_TEXTURE.CRACK_ALPHA * 0.45,
          });
        this.graphics.moveTo(currentX, currentY).lineTo(nextX, nextY).stroke({
          width,
          color: COLORS.GROUND_CRACK,
          alpha: GROUND_TEXTURE.CRACK_ALPHA,
        });

        if (this.rand() < GROUND_TEXTURE.CRACK_BRANCH_PROBABILITY) {
          const branchLen =
            segLen *
            (GROUND_TEXTURE.CRACK_BRANCH_MIN_LENGTH_FACTOR +
              this.rand() *
                (GROUND_TEXTURE.CRACK_BRANCH_MAX_LENGTH_FACTOR -
                  GROUND_TEXTURE.CRACK_BRANCH_MIN_LENGTH_FACTOR));
          const branchAngle = segAngle + (this.rand() > 0.5 ? 1 : -1) * (0.6 + this.rand() * 0.5);
          this.graphics
            .moveTo(currentX, currentY)
            .lineTo(
              currentX + Math.cos(branchAngle) * branchLen,
              currentY + Math.sin(branchAngle) * branchLen
            )
            .stroke({
              width: GROUND_TEXTURE.CRACK_BRANCH_WIDTH,
              color: COLORS.GROUND_CRACK,
              alpha: GROUND_TEXTURE.CRACK_BRANCH_ALPHA,
            });
        }

        currentX = nextX;
        currentY = nextY;
      }
    }
  }

  private renderWeatheringStains(mapData: MapData): void {
    const count = this.scaledCount(GROUND_TEXTURE.STAIN_COUNT, mapData);
    const inset = Math.max(GROUND_TEXTURE.EDGE_INSET, GROUND_TEXTURE.STAIN_MAX_SIZE * 0.6);
    for (let i = 0; i < count; i++) {
      const { x, y } = this.randomPoint(mapData, inset);
      const size =
        GROUND_TEXTURE.STAIN_MIN_SIZE +
        this.rand() * (GROUND_TEXTURE.STAIN_MAX_SIZE - GROUND_TEXTURE.STAIN_MIN_SIZE);
      const alpha =
        GROUND_TEXTURE.STAIN_MIN_ALPHA +
        this.rand() * (GROUND_TEXTURE.STAIN_MAX_ALPHA - GROUND_TEXTURE.STAIN_MIN_ALPHA);
      const dark = this.rand() > 0.5;
      this.renderSoftBlob(
        x,
        y,
        size,
        5 + Math.floor(this.rand() * 3),
        0.6,
        1.25,
        dark ? COLORS.GROUND_STAIN_DARK : COLORS.GROUND_STAIN,
        alpha,
        0.4
      );
    }
  }

  private renderGrassTufts(mapData: MapData): void {
    const count = this.scaledCount(GROUND_TEXTURE.GRASS_TUFT_COUNT, mapData);
    for (let i = 0; i < count; i++) {
      const { x, y } = this.randomPoint(mapData, GROUND_TEXTURE.EDGE_INSET * 0.5);
      const size =
        GROUND_TEXTURE.GRASS_TUFT_MIN_SIZE +
        this.rand() * (GROUND_TEXTURE.GRASS_TUFT_MAX_SIZE - GROUND_TEXTURE.GRASS_TUFT_MIN_SIZE);
      const points =
        GROUND_TEXTURE.GRASS_TUFT_MIN_POINTS +
        Math.floor(
          this.rand() *
            (GROUND_TEXTURE.GRASS_TUFT_MAX_POINTS - GROUND_TEXTURE.GRASS_TUFT_MIN_POINTS)
        );
      const alpha =
        GROUND_TEXTURE.GRASS_TUFT_MIN_ALPHA +
        this.rand() * (GROUND_TEXTURE.GRASS_TUFT_MAX_ALPHA - GROUND_TEXTURE.GRASS_TUFT_MIN_ALPHA);

      this.renderSoftBlob(
        x,
        y,
        size,
        points,
        GROUND_TEXTURE.GRASS_TUFT_MIN_RADIUS_FACTOR,
        GROUND_TEXTURE.GRASS_TUFT_MAX_RADIUS_FACTOR,
        COLORS.GROUND_GRASS_TUFT,
        alpha,
        0.2
      );

      const blades = GROUND_TEXTURE.GRASS_BLADE_COUNT;
      for (let b = 0; b < blades; b++) {
        const lean = (this.rand() - 0.5) * 3;
        const height = size * (1.4 + this.rand() * 1.2);
        this.graphics
          .moveTo(x + (b - blades / 2) * 1.2, y)
          .lineTo(x + (b - blades / 2) * 1.2 + lean, y - height)
          .stroke({
            width: 1,
            color: COLORS.GROUND_DEAD_GRASS_TIP,
            alpha: alpha * 0.85,
          });
      }
    }
  }
}
