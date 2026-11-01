import type { Graphics } from 'pixi.js';
import { GRAVEYARD_DETAILS } from '../../config/visualConstants';
import { createSeededRandom } from '../../utils/seededRandom';
import { GravestoneRenderer } from './GravestoneRenderer';
import { GraveyardFenceRenderer } from './GraveyardFenceRenderer';

/** Open graves the zombies climb out of, relative to the graveyard origin (pit centres). */
const PITS = [
  { x: 38, y: 122 },
  { x: 38, y: 168 },
  { x: 74, y: 145 },
];

/**
 * GraveyardRenderer
 *
 * Responsible for rendering the graveyard area including:
 * - Graveyard ground (cursed earth)
 * - Dead grass patches
 * - Disturbed earth (zombie emergence sites)
 * - Scattered bones and debris
 * - Dark stains (blood/decay)
 * - Weathered wrought-iron fence with spiked bars
 * - Gate with stone pillars and skulls
 * - Broken iron gates
 * - RIP sign
 * - Rusty chains
 * - Gravestones (cross, headstone, monument types)
 * - Dead trees
 * - Eerie green glow spots
 * - Open graves with skeletal hands
 */
export class GraveyardRenderer {
  private graphics: Graphics;
  private graveyardX: number;
  private graveyardY: number;
  private graveyardWidth: number;
  private graveyardHeight: number;
  private rand: () => number;
  private fence: GraveyardFenceRenderer;
  private gravestones: GravestoneRenderer;

  constructor(graphics: Graphics) {
    this.graphics = graphics;
    this.fence = new GraveyardFenceRenderer(graphics);
    this.gravestones = new GravestoneRenderer(graphics);
    this.graveyardX = GRAVEYARD_DETAILS.X;
    this.graveyardY = GRAVEYARD_DETAILS.Y;
    this.graveyardWidth = GRAVEYARD_DETAILS.WIDTH;
    this.graveyardHeight = GRAVEYARD_DETAILS.HEIGHT;
    this.rand = createSeededRandom(
      this.graveyardX * 131 + this.graveyardY * 97 + this.graveyardWidth * 17
    );
  }

  public render(): void {
    this.rand = createSeededRandom(
      this.graveyardX * 131 + this.graveyardY * 97 + this.graveyardWidth * 17
    );
    this.renderGraveyardGround();
    this.renderInnerPath();
    this.renderDeadGrassPatches();
    this.renderBonesAndDebris();
    this.renderDarkStains();
    this.fence.render(this.rand);
    this.gravestones.render(this.rand);
    this.renderProps();
    this.renderDeadTrees();
    this.renderEerieGlow();
    this.renderOpenGraves();
  }

  private renderGraveyardGround(): void {
    this.graphics
      .rect(this.graveyardX, this.graveyardY, this.graveyardWidth, this.graveyardHeight)
      .fill({ color: GRAVEYARD_DETAILS.GROUND_COLOR });

    // Subtle soil mottling for depth
    for (let i = 0; i < 18; i++) {
      const x = this.graveyardX + 8 + this.rand() * (this.graveyardWidth - 16);
      const y = this.graveyardY + 8 + this.rand() * (this.graveyardHeight - 16);
      this.graphics
        .ellipse(x, y, 10 + this.rand() * 16, 6 + this.rand() * 10)
        .fill({ color: 0x152015, alpha: 0.35 + this.rand() * 0.25 });
    }
  }

  private renderInnerPath(): void {
    // Worn walkway from the open graves out through the gate, where the zombies leave
    const pathY = this.graveyardY + 136;
    const pathH = 22;
    const startX = this.graveyardX + 60;
    const len = this.graveyardWidth - 60;
    this.graphics
      .rect(startX, pathY, len, pathH)
      .fill({ color: GRAVEYARD_DETAILS.PATH_COLOR, alpha: 0.6 });
    this.graphics
      .rect(startX, pathY - 2, len, 2)
      .fill({ color: GRAVEYARD_DETAILS.PATH_EDGE_COLOR, alpha: 0.45 });
    this.graphics
      .rect(startX, pathY + pathH, len, 2)
      .fill({ color: GRAVEYARD_DETAILS.PATH_EDGE_COLOR, alpha: 0.45 });
    for (let i = 0; i < 6; i++) {
      this.graphics
        .ellipse(startX + 10 + i * 14 + this.rand() * 4, pathY + 5 + this.rand() * 12, 3, 2)
        .fill({ color: 0x1a1208, alpha: 0.3 });
    }
  }

  private renderDeadGrassPatches(): void {
    for (let i = 0; i < GRAVEYARD_DETAILS.DEAD_GRASS_COUNT; i++) {
      const x = this.graveyardX + this.rand() * this.graveyardWidth;
      const y = this.graveyardY + this.rand() * this.graveyardHeight;
      const size =
        GRAVEYARD_DETAILS.DEAD_GRASS_MIN_SIZE +
        this.rand() *
          (GRAVEYARD_DETAILS.DEAD_GRASS_MAX_SIZE - GRAVEYARD_DETAILS.DEAD_GRASS_MIN_SIZE);
      const points =
        GRAVEYARD_DETAILS.DEAD_GRASS_MIN_POINTS +
        Math.floor(
          this.rand() *
            (GRAVEYARD_DETAILS.DEAD_GRASS_MAX_POINTS - GRAVEYARD_DETAILS.DEAD_GRASS_MIN_POINTS)
        );

      this.graphics.moveTo(x, y);
      for (let j = 0; j < points; j++) {
        const angle = (j / points) * Math.PI * 2;
        const radius =
          size *
          (GRAVEYARD_DETAILS.DEAD_GRASS_MIN_RADIUS_FACTOR +
            this.rand() *
              (GRAVEYARD_DETAILS.DEAD_GRASS_MAX_RADIUS_FACTOR -
                GRAVEYARD_DETAILS.DEAD_GRASS_MIN_RADIUS_FACTOR));
        this.graphics.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      }
      this.graphics.fill({
        color: GRAVEYARD_DETAILS.DEAD_GRASS_COLOR,
        alpha:
          GRAVEYARD_DETAILS.DEAD_GRASS_MIN_ALPHA +
          this.rand() *
            (GRAVEYARD_DETAILS.DEAD_GRASS_MAX_ALPHA - GRAVEYARD_DETAILS.DEAD_GRASS_MIN_ALPHA),
      });
    }
  }

  private renderDisturbedEarth(): void {
    for (let i = 0; i < GRAVEYARD_DETAILS.DISTURBED_EARTH_COUNT; i++) {
      const x = this.graveyardX + this.rand() * this.graveyardWidth;
      const y = this.graveyardY + this.rand() * this.graveyardHeight;
      const size =
        GRAVEYARD_DETAILS.DISTURBED_EARTH_MIN_SIZE +
        this.rand() *
          (GRAVEYARD_DETAILS.DISTURBED_EARTH_MAX_SIZE - GRAVEYARD_DETAILS.DISTURBED_EARTH_MIN_SIZE);
      const points =
        GRAVEYARD_DETAILS.DISTURBED_EARTH_MIN_POINTS +
        Math.floor(
          this.rand() *
            (GRAVEYARD_DETAILS.DISTURBED_EARTH_MAX_POINTS -
              GRAVEYARD_DETAILS.DISTURBED_EARTH_MIN_POINTS)
        );

      this.graphics.moveTo(x, y);
      for (let j = 0; j < points; j++) {
        const angle = (j / points) * Math.PI * 2;
        const radius =
          size *
          (GRAVEYARD_DETAILS.DISTURBED_EARTH_MIN_RADIUS_FACTOR +
            this.rand() *
              (GRAVEYARD_DETAILS.DISTURBED_EARTH_MAX_RADIUS_FACTOR -
                GRAVEYARD_DETAILS.DISTURBED_EARTH_MIN_RADIUS_FACTOR));
        this.graphics.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      }
      this.graphics.fill({
        color: GRAVEYARD_DETAILS.DISTURBED_EARTH_COLOR,
        alpha:
          GRAVEYARD_DETAILS.DISTURBED_EARTH_MIN_ALPHA +
          this.rand() *
            (GRAVEYARD_DETAILS.DISTURBED_EARTH_MAX_ALPHA -
              GRAVEYARD_DETAILS.DISTURBED_EARTH_MIN_ALPHA),
      });
    }
  }

  private renderBonesAndDebris(): void {
    for (let i = 0; i < 10; i++) {
      // Debris clusters around the open graves, where the dead climbed out
      const pit = PITS[i % PITS.length];
      const x = this.graveyardX + pit.x + (this.rand() - 0.5) * 56;
      const y = this.graveyardY + pit.y + (this.rand() - 0.5) * 40;
      const kind = this.rand();

      if (kind < 0.35) {
        // Long bone
        const len = 6 + this.rand() * 8;
        const angle = this.rand() * Math.PI;
        const ex = x + Math.cos(angle) * len;
        const ey = y + Math.sin(angle) * len;
        this.graphics
          .moveTo(x, y)
          .lineTo(ex, ey)
          .stroke({
            width: 2,
            color: GRAVEYARD_DETAILS.BONES_COLOR,
            alpha: 0.7 + this.rand() * 0.25,
          });
        this.graphics.circle(x, y, 1.5).fill(GRAVEYARD_DETAILS.BONES_COLOR);
        this.graphics.circle(ex, ey, 1.5).fill(GRAVEYARD_DETAILS.BONES_COLOR);
      } else if (kind < 0.55) {
        // Small skull fragment
        this.graphics.ellipse(x, y, 3 + this.rand() * 2, 2.5 + this.rand()).fill({
          color: GRAVEYARD_DETAILS.BONES_COLOR,
          alpha: 0.75 + this.rand() * 0.2,
        });
        this.graphics.circle(x - 1, y - 0.5, 0.8).fill(0x1a1a1a);
        this.graphics.circle(x + 1, y - 0.5, 0.8).fill(0x1a1a1a);
      } else {
        // Rib / fragment
        const size =
          GRAVEYARD_DETAILS.BONES_MIN_SIZE +
          this.rand() * (GRAVEYARD_DETAILS.BONES_MAX_SIZE - GRAVEYARD_DETAILS.BONES_MIN_SIZE);
        this.graphics.ellipse(x, y, size, size * 0.45).fill({
          color: GRAVEYARD_DETAILS.BONES_COLOR,
          alpha:
            GRAVEYARD_DETAILS.BONES_MIN_ALPHA +
            this.rand() * (GRAVEYARD_DETAILS.BONES_MAX_ALPHA - GRAVEYARD_DETAILS.BONES_MIN_ALPHA),
        });
      }
    }

    // Coffin plank fragments
    for (let i = 0; i < 0; i++) {
      const x = this.graveyardX + 15 + this.rand() * (this.graveyardWidth - 30);
      const y = this.graveyardY + 30 + this.rand() * (this.graveyardHeight - 60);
      this.graphics
        .rect(x, y, 8 + this.rand() * 6, 2 + this.rand() * 2)
        .fill({ color: GRAVEYARD_DETAILS.COFFIN_COLOR, alpha: 0.8 });
    }
  }

  private renderDarkStains(): void {
    for (let i = 0; i < 6; i++) {
      const x = this.graveyardX + this.rand() * this.graveyardWidth;
      const y = this.graveyardY + this.rand() * this.graveyardHeight;
      const size =
        GRAVEYARD_DETAILS.STAINS_MIN_SIZE +
        this.rand() * (GRAVEYARD_DETAILS.STAINS_MAX_SIZE - GRAVEYARD_DETAILS.STAINS_MIN_SIZE);
      this.graphics.ellipse(x, y, size, size * (0.6 + this.rand() * 0.4)).fill({
        color: GRAVEYARD_DETAILS.STAINS_COLOR,
        alpha:
          GRAVEYARD_DETAILS.STAINS_MIN_ALPHA +
          this.rand() * (GRAVEYARD_DETAILS.STAINS_MAX_ALPHA - GRAVEYARD_DETAILS.STAINS_MIN_ALPHA),
      });
    }
  }

  private renderProps(): void {
    // Rusted shovel stuck in the ground
    const shovelX = this.graveyardX + 22;
    const shovelY = this.graveyardY + 134;
    this.graphics
      .moveTo(shovelX, shovelY)
      .lineTo(shovelX - 2, shovelY - 22)
      .stroke({ width: 2, color: 0x5a4a3a });
    this.graphics
      .moveTo(shovelX - 6, shovelY - 24)
      .lineTo(shovelX + 2, shovelY - 26)
      .lineTo(shovelX + 3, shovelY - 20)
      .lineTo(shovelX - 5, shovelY - 18)
      .fill(0x6a6a6a);
    this.graphics
      .ellipse(shovelX - 1, shovelY - 22, 2, 1)
      .fill({ color: GRAVEYARD_DETAILS.RUST_COLOR, alpha: 0.7 });

    // Wilted wreath near a stone
    const wx = this.graveyardX + 66;
    const wy = this.graveyardY + 76;
    this.graphics.circle(wx, wy, 6).stroke({ width: 2, color: 0x3a4a2a, alpha: 0.7 });
    this.graphics.circle(wx, wy, 4).stroke({ width: 1, color: 0x5a2a2a, alpha: 0.5 });
  }

  private renderDeadTrees(): void {
    // Corners only, so branches never cross the plots
    this.renderDeadTree(this.graveyardX + 14, this.graveyardY + 224, 0.75);
    this.renderDeadTree(this.graveyardX + 126, this.graveyardY + 16, 0.6);
  }

  private renderDeadTree(x: number, y: number, scale: number): void {
    const trunkW = 5 * scale;
    const trunkH = 38 * scale;

    // Shadow
    this.graphics
      .ellipse(x + 2, y + trunkH, trunkW * 2.2, trunkW)
      .fill({ color: GRAVEYARD_DETAILS.SHADOW_COLOR, alpha: 0.3 });

    // Gnarled trunk
    this.graphics
      .moveTo(x - trunkW / 2, y + trunkH)
      .lineTo(x - trunkW / 2 - 1, y + trunkH * 0.6)
      .lineTo(x - trunkW / 2 + 1, y + trunkH * 0.3)
      .lineTo(x - 1, y)
      .lineTo(x + trunkW / 2 + 1, y + trunkH * 0.25)
      .lineTo(x + trunkW / 2, y + trunkH * 0.55)
      .lineTo(x + trunkW / 2 - 1, y + trunkH)
      .fill(GRAVEYARD_DETAILS.DEAD_TREE_TRUNK_COLOR);
    this.graphics.stroke({ width: 1, color: GRAVEYARD_DETAILS.DEAD_TREE_TRUNK_BORDER_COLOR });

    // Bark lines
    for (let i = 0; i < 3; i++) {
      this.graphics
        .moveTo(x - trunkW * 0.3, y + trunkH * (0.25 + i * 0.2))
        .lineTo(x + trunkW * 0.3, y + trunkH * (0.3 + i * 0.2))
        .stroke({ width: 1, color: GRAVEYARD_DETAILS.DEAD_TREE_TRUNK_BORDER_COLOR, alpha: 0.5 });
    }

    const drawBranch = (fromX: number, fromY: number, toX: number, toY: number, width: number) => {
      this.graphics
        .moveTo(fromX, fromY)
        .lineTo(toX, toY)
        .stroke({
          width: width * scale,
          color: GRAVEYARD_DETAILS.DEAD_TREE_TRUNK_COLOR,
        });
    };

    drawBranch(x, y + trunkH * 0.2, x - 16 * scale, y - 8 * scale, 2.5);
    drawBranch(x, y + trunkH * 0.35, x + 14 * scale, y - 6 * scale, 2.2);
    drawBranch(x, y + trunkH * 0.55, x - 12 * scale, y + 4 * scale, 2);
    drawBranch(x, y + trunkH * 0.7, x + 10 * scale, y + 12 * scale, 1.5);
    drawBranch(x - 16 * scale, y - 8 * scale, x - 22 * scale, y - 14 * scale, 1.2);
    drawBranch(x + 14 * scale, y - 6 * scale, x + 20 * scale, y - 12 * scale, 1.2);

    // Broken limb on ground
    this.graphics
      .moveTo(x + 12 * scale, y + trunkH + 4)
      .lineTo(x + 22 * scale, y + trunkH + 7)
      .lineTo(x + 26 * scale, y + trunkH + 5)
      .stroke({ width: 2 * scale, color: GRAVEYARD_DETAILS.DEAD_TREE_TRUNK_COLOR });
  }

  private renderEerieGlow(): void {
    for (let i = 0; i < GRAVEYARD_DETAILS.GLOW_SPOT_COUNT; i++) {
      const glowX = this.graveyardX + 10 + this.rand() * (this.graveyardWidth - 20);
      const glowY = this.graveyardY + 10 + this.rand() * (this.graveyardHeight - 20);
      const size =
        GRAVEYARD_DETAILS.GLOW_MIN_SIZE +
        this.rand() * (GRAVEYARD_DETAILS.GLOW_MAX_SIZE - GRAVEYARD_DETAILS.GLOW_MIN_SIZE);
      this.graphics
        .circle(glowX, glowY, size)
        .fill({ color: GRAVEYARD_DETAILS.GLOW_COLOR, alpha: GRAVEYARD_DETAILS.GLOW_ALPHA });
      this.graphics
        .circle(glowX, glowY, size * 0.45)
        .fill({ color: GRAVEYARD_DETAILS.GLOW_COLOR, alpha: GRAVEYARD_DETAILS.GLOW_ALPHA * 1.4 });
    }
  }

  private renderOpenGraves(): void {
    // The three spawn pits; (x, y) here is the pit centre minus the mound offset
    for (const pit of PITS) {
      this.renderOpenGrave(this.graveyardX + pit.x, this.graveyardY + pit.y - 10);
    }
  }

  private renderOpenGrave(x: number, y: number): void {
    // Outer mound rim
    this.graphics
      .ellipse(x, y + 10, 22, 14)
      .fill({ color: GRAVEYARD_DETAILS.OPEN_GRAVE_DIRT_COLOR, alpha: 0.85 });

    // Dark pit with depth rings
    this.graphics.ellipse(x, y + 10, 14, 9).fill(GRAVEYARD_DETAILS.OPEN_GRAVE_HOLE_COLOR);
    this.graphics.ellipse(x, y + 11, 10, 6).fill({ color: 0x0a0a0a, alpha: 0.85 });
    this.graphics.stroke({ width: 1.5, color: GRAVEYARD_DETAILS.OPEN_GRAVE_BORDER_COLOR });

    // Sickly glow from within
    this.graphics.ellipse(x, y + 10, 8, 5).fill({
      color: GRAVEYARD_DETAILS.OPEN_GRAVE_GLOW_COLOR,
      alpha: GRAVEYARD_DETAILS.OPEN_GRAVE_GLOW_ALPHA,
    });

    // Dirt piles
    this.graphics.ellipse(x - 20, y + 8, 8, 5).fill(GRAVEYARD_DETAILS.OPEN_GRAVE_DIRT_COLOR);
    this.graphics.ellipse(x - 24, y + 14, 6, 4).fill(0x5a3a1a);
    this.graphics.ellipse(x + 20, y + 9, 8, 5).fill(GRAVEYARD_DETAILS.OPEN_GRAVE_DIRT_COLOR);
    this.graphics.ellipse(x + 24, y + 14, 5, 3).fill(0x5a3a1a);

    // Broken coffin planks
    this.graphics.rect(x - 10, y + 4, 9, 2.5).fill(GRAVEYARD_DETAILS.COFFIN_COLOR);
    this.graphics
      .moveTo(x + 4, y + 12)
      .lineTo(x + 12, y + 10)
      .lineTo(x + 11, y + 13)
      .fill(GRAVEYARD_DETAILS.COFFIN_COLOR);

    // Skeletal hand reaching out
    this.graphics.ellipse(x - 4, y + 7, 2.5, 2).fill(GRAVEYARD_DETAILS.BONES_COLOR);
    this.graphics.rect(x - 6, y + 3, 1.2, 5).fill(GRAVEYARD_DETAILS.BONES_COLOR);
    this.graphics.rect(x - 4, y + 2, 1.2, 6).fill(GRAVEYARD_DETAILS.BONES_COLOR);
    this.graphics.rect(x - 2, y + 3.5, 1.2, 4.5).fill(GRAVEYARD_DETAILS.BONES_COLOR);
    this.graphics.rect(x, y + 5, 1, 3).fill(GRAVEYARD_DETAILS.BONES_COLOR);
  }
}
