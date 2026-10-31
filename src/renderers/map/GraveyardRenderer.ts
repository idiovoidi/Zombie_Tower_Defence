import type { Graphics } from 'pixi.js';
import { GRAVEYARD_DETAILS } from '../../config/visualConstants';
import { createSeededRandom } from '../../utils/seededRandom';

interface Gravestone {
  x: number;
  y: number;
  type: string;
  size: number;
  tilt: number;
  fallen?: boolean;
}

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

  constructor(graphics: Graphics) {
    this.graphics = graphics;
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
    this.renderDisturbedEarth();
    this.renderBonesAndDebris();
    this.renderDarkStains();
    this.renderFence();
    this.renderGate();
    this.renderGravestones();
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
    // Worn dirt walkway leading to the gate
    const pathX = this.graveyardX + this.graveyardWidth * 0.55;
    const pathW = 18;
    this.graphics
      .rect(pathX, this.graveyardY + 20, pathW, this.graveyardHeight - 40)
      .fill({ color: GRAVEYARD_DETAILS.PATH_COLOR, alpha: 0.55 });
    this.graphics
      .rect(pathX - 2, this.graveyardY + 20, 2, this.graveyardHeight - 40)
      .fill({ color: GRAVEYARD_DETAILS.PATH_EDGE_COLOR, alpha: 0.4 });
    this.graphics
      .rect(pathX + pathW, this.graveyardY + 20, 2, this.graveyardHeight - 40)
      .fill({ color: GRAVEYARD_DETAILS.PATH_EDGE_COLOR, alpha: 0.4 });

    // Foot scuffs
    for (let i = 0; i < 8; i++) {
      const fy = this.graveyardY + 40 + i * 28 + this.rand() * 6;
      this.graphics
        .ellipse(pathX + 5 + this.rand() * 8, fy, 3, 2)
        .fill({ color: 0x1a1208, alpha: 0.35 });
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
    for (let i = 0; i < GRAVEYARD_DETAILS.BONES_COUNT; i++) {
      const x = this.graveyardX + 10 + this.rand() * (this.graveyardWidth - 20);
      const y = this.graveyardY + 10 + this.rand() * (this.graveyardHeight - 20);
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
        this.graphics
          .ellipse(x, y, 3 + this.rand() * 2, 2.5 + this.rand())
          .fill({
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
        this.graphics
          .ellipse(x, y, size, size * 0.45)
          .fill({
            color: GRAVEYARD_DETAILS.BONES_COLOR,
            alpha:
              GRAVEYARD_DETAILS.BONES_MIN_ALPHA +
              this.rand() * (GRAVEYARD_DETAILS.BONES_MAX_ALPHA - GRAVEYARD_DETAILS.BONES_MIN_ALPHA),
          });
      }
    }

    // Coffin plank fragments
    for (let i = 0; i < 4; i++) {
      const x = this.graveyardX + 15 + this.rand() * (this.graveyardWidth - 30);
      const y = this.graveyardY + 30 + this.rand() * (this.graveyardHeight - 60);
      this.graphics
        .rect(x, y, 8 + this.rand() * 6, 2 + this.rand() * 2)
        .fill({ color: GRAVEYARD_DETAILS.COFFIN_COLOR, alpha: 0.8 });
    }
  }

  private renderDarkStains(): void {
    for (let i = 0; i < GRAVEYARD_DETAILS.STAINS_COUNT; i++) {
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

  private renderFence(): void {
    const gateGapStart = GRAVEYARD_DETAILS.GATE_Y - this.graveyardY;
    const gateGapEnd = gateGapStart + GRAVEYARD_DETAILS.GATE_HEIGHT;
    const barSpacing = GRAVEYARD_DETAILS.FENCE_BAR_SPACING;
    const barWidth = GRAVEYARD_DETAILS.FENCE_BAR_WIDTH;
    const spikeH = GRAVEYARD_DETAILS.FENCE_SPIKE_HEIGHT;
    const railT = GRAVEYARD_DETAILS.FENCE_RAIL_THICKNESS;

    const drawSpikedRail = (
      x: number,
      y: number,
      length: number,
      horizontal: boolean,
      brokenEvery?: number
    ) => {
      // Backing rail
      if (horizontal) {
        this.graphics
          .rect(x, y, length, railT)
          .fill(GRAVEYARD_DETAILS.FENCE_COLOR);
        this.graphics
          .rect(x, y + 10, length, railT)
          .fill(GRAVEYARD_DETAILS.FENCE_COLOR);
      } else {
        this.graphics
          .rect(x, y, railT, length)
          .fill(GRAVEYARD_DETAILS.FENCE_COLOR);
        this.graphics
          .rect(x + 8, y, railT, length)
          .fill(GRAVEYARD_DETAILS.FENCE_COLOR);
      }

      const count = Math.floor(length / barSpacing);
      for (let i = 0; i <= count; i++) {
        const broken = brokenEvery !== undefined && i % brokenEvery === 3;
        if (horizontal) {
          const bx = x + i * barSpacing;
          const barH = broken ? 7 + (i % 3) : 14;
          this.graphics
            .rect(bx, y, barWidth, barH)
            .fill(GRAVEYARD_DETAILS.FENCE_BAR_COLOR);
          if (!broken) {
            this.graphics
              .moveTo(bx, y)
              .lineTo(bx + barWidth / 2, y - spikeH)
              .lineTo(bx + barWidth, y)
              .fill(GRAVEYARD_DETAILS.FENCE_BAR_COLOR);
          }
        } else {
        const by = y + i * barSpacing;
        if (broken) {
          // Bent / missing bar stub
          this.graphics
            .rect(x + 2, by, 6, barWidth)
            .fill(GRAVEYARD_DETAILS.FENCE_BAR_COLOR);
          continue;
        }
        // Side fence: short outward spikes along the rail
        this.graphics
          .rect(x, by, 12, barWidth)
          .fill(GRAVEYARD_DETAILS.FENCE_BAR_COLOR);
        this.graphics
          .moveTo(x + 12, by)
          .lineTo(x + 12 + spikeH, by + barWidth / 2)
          .lineTo(x + 12, by + barWidth)
          .fill(GRAVEYARD_DETAILS.FENCE_BAR_COLOR);
      }
      }

      // Rust flecks
      for (let i = 0; i < Math.max(3, Math.floor(length / 20)); i++) {
        const rx = horizontal ? x + this.rand() * length : x + this.rand() * 10;
        const ry = horizontal ? y + this.rand() * 12 : y + this.rand() * length;
        this.graphics
          .circle(rx, ry, 1.5)
          .fill({ color: GRAVEYARD_DETAILS.RUST_COLOR, alpha: GRAVEYARD_DETAILS.RUST_ALPHA });
      }
    };

    // Top fence
    drawSpikedRail(this.graveyardX, this.graveyardY, this.graveyardWidth, true, 7);
    // Bottom fence
    drawSpikedRail(
      this.graveyardX,
      this.graveyardY + this.graveyardHeight - 14,
      this.graveyardWidth,
      true,
      5
    );
    // Left fence (vertical bars along height)
    drawSpikedRail(this.graveyardX, this.graveyardY, this.graveyardHeight, false, 6);
    // Right fence above gate
    drawSpikedRail(
      this.graveyardX + this.graveyardWidth - 12,
      this.graveyardY,
      gateGapStart,
      false,
      8
    );
    // Right fence below gate
    drawSpikedRail(
      this.graveyardX + this.graveyardWidth - 12,
      this.graveyardY + gateGapEnd,
      this.graveyardHeight - gateGapEnd,
      false,
      8
    );

    // Corner / support posts
    for (let i = 0; i <= this.graveyardHeight; i += GRAVEYARD_DETAILS.FENCE_POST_SPACING) {
      this.graphics
        .rect(
          this.graveyardX - 3,
          this.graveyardY + i,
          GRAVEYARD_DETAILS.FENCE_POST_WIDTH,
          GRAVEYARD_DETAILS.FENCE_POST_HEIGHT
        )
        .fill(GRAVEYARD_DETAILS.FENCE_POST_COLOR);
      this.graphics.stroke({ width: 1, color: GRAVEYARD_DETAILS.FENCE_POST_BORDER_COLOR });

      if (i < gateGapStart || i > gateGapEnd) {
        this.graphics
          .rect(
            this.graveyardX + this.graveyardWidth - 6,
            this.graveyardY + i,
            GRAVEYARD_DETAILS.FENCE_POST_WIDTH,
            GRAVEYARD_DETAILS.FENCE_POST_HEIGHT
          )
          .fill(GRAVEYARD_DETAILS.FENCE_POST_COLOR);
        this.graphics.stroke({ width: 1, color: GRAVEYARD_DETAILS.FENCE_POST_BORDER_COLOR });
      }
    }

    // Dead vines draped on top fence
    for (let i = 0; i < 5; i++) {
      const vx = this.graveyardX + 15 + i * 25 + this.rand() * 8;
      this.graphics
        .moveTo(vx, this.graveyardY)
        .lineTo(vx + (this.rand() - 0.5) * 10, this.graveyardY + 12 + this.rand() * 10)
        .lineTo(vx + (this.rand() - 0.5) * 6, this.graveyardY + 22 + this.rand() * 8)
        .stroke({ width: 1.5, color: 0x3a4a2a, alpha: 0.55 });
    }
  }

  private renderGate(): void {
    const gateX = this.graveyardX + this.graveyardWidth - GRAVEYARD_DETAILS.GATE_WIDTH;
    const gateY = GRAVEYARD_DETAILS.GATE_Y;
    const gateWidth = GRAVEYARD_DETAILS.GATE_WIDTH;
    const gateHeight = GRAVEYARD_DETAILS.GATE_HEIGHT;

    // Stone pillars with caps
    const drawPillar = (px: number) => {
      this.graphics
        .rect(px, gateY, GRAVEYARD_DETAILS.GATE_PILLAR_WIDTH, gateHeight)
        .fill(GRAVEYARD_DETAILS.GATE_PILLAR_COLOR);
      this.graphics.stroke({ width: 2, color: GRAVEYARD_DETAILS.GATE_PILLAR_BORDER_COLOR });
      // Cap
      this.graphics
        .rect(px - 2, gateY - 4, GRAVEYARD_DETAILS.GATE_PILLAR_WIDTH + 4, 5)
        .fill(0x6a6a6a);
      this.graphics.stroke({ width: 1, color: GRAVEYARD_DETAILS.GATE_PILLAR_BORDER_COLOR });
      // Cracks
      this.graphics
        .moveTo(px + 2, gateY + 8)
        .lineTo(px + 5, gateY + 28)
        .lineTo(px + 3, gateY + 42)
        .stroke({
          width: 1,
          color: GRAVEYARD_DETAILS.GATE_CRACK_COLOR,
          alpha: GRAVEYARD_DETAILS.GATE_CRACK_ALPHA,
        });
      // Moss
      for (let i = 0; i < GRAVEYARD_DETAILS.GATE_MOSS_SPOTS; i++) {
        this.graphics
          .ellipse(px + 2 + this.rand() * 4, gateY + 18 + i * 14, 2.5, 1.5)
          .fill({
            color: GRAVEYARD_DETAILS.GATE_MOSS_COLOR,
            alpha: GRAVEYARD_DETAILS.GATE_MOSS_ALPHA,
          });
      }
    };

    drawPillar(gateX - GRAVEYARD_DETAILS.GATE_PILLAR_WIDTH);
    drawPillar(gateX + gateWidth);

    this.renderSkull(gateX - 4, gateY + 8);
    this.renderSkull(gateX + gateWidth + 4, gateY + 8);

    // Left iron gate (hanging inward) with vertical bars
    this.graphics
      .moveTo(gateX - GRAVEYARD_DETAILS.GATE_PILLAR_WIDTH, gateY + 5)
      .lineTo(gateX - 2, gateY + 12)
      .lineTo(gateX - 2, gateY + 48)
      .lineTo(gateX - GRAVEYARD_DETAILS.GATE_PILLAR_WIDTH, gateY + 52)
      .fill({
        color: GRAVEYARD_DETAILS.GATE_IRON_COLOR,
        alpha: GRAVEYARD_DETAILS.GATE_IRON_ALPHA,
      });
    this.graphics.stroke({ width: 2, color: GRAVEYARD_DETAILS.GATE_IRON_BORDER_COLOR });
    for (let i = 0; i < 4; i++) {
      this.graphics
        .moveTo(gateX - GRAVEYARD_DETAILS.GATE_PILLAR_WIDTH + 2, gateY + 12 + i * 9)
        .lineTo(gateX - 3, gateY + 14 + i * 9)
        .stroke({ width: 1.5, color: GRAVEYARD_DETAILS.GATE_IRON_BORDER_COLOR });
    }
    for (let i = 0; i < GRAVEYARD_DETAILS.GATE_RUST_SPOTS; i++) {
      this.graphics.circle(gateX - 5, gateY + 16 + i * 9, 2).fill({
        color: GRAVEYARD_DETAILS.RUST_COLOR,
        alpha: GRAVEYARD_DETAILS.GATE_RUST_ALPHA,
      });
    }

    // Right iron gate (swung open)
    this.graphics
      .moveTo(gateX + gateWidth + GRAVEYARD_DETAILS.GATE_PILLAR_WIDTH, gateY + 5)
      .lineTo(gateX + gateWidth + 22, gateY + 12)
      .lineTo(gateX + gateWidth + 22, gateY + 52)
      .lineTo(gateX + gateWidth + GRAVEYARD_DETAILS.GATE_PILLAR_WIDTH, gateY + 55)
      .fill({
        color: GRAVEYARD_DETAILS.GATE_IRON_COLOR,
        alpha: GRAVEYARD_DETAILS.GATE_IRON_ALPHA,
      });
    this.graphics.stroke({ width: 2, color: GRAVEYARD_DETAILS.GATE_IRON_BORDER_COLOR });
    for (let i = 0; i < 4; i++) {
      this.graphics
        .moveTo(gateX + gateWidth + 10, gateY + 16 + i * 9)
        .lineTo(gateX + gateWidth + 20, gateY + 18 + i * 9)
        .stroke({ width: 1.5, color: GRAVEYARD_DETAILS.GATE_IRON_BORDER_COLOR });
    }
    for (let i = 0; i < GRAVEYARD_DETAILS.GATE_RUST_SPOTS; i++) {
      this.graphics.circle(gateX + gateWidth + 14, gateY + 20 + i * 9, 2).fill({
        color: GRAVEYARD_DETAILS.RUST_COLOR,
        alpha: GRAVEYARD_DETAILS.GATE_RUST_ALPHA,
      });
    }

    // Weathered RIP sign with arch hint
    this.graphics
      .ellipse(gateX + gateWidth / 2, gateY - 2, 22, 8)
      .stroke({ width: 2, color: GRAVEYARD_DETAILS.GATE_IRON_BORDER_COLOR, alpha: 0.7 });
    this.graphics
      .rect(
        gateX + 10,
        gateY - 16,
        GRAVEYARD_DETAILS.GATE_SIGN_WIDTH,
        GRAVEYARD_DETAILS.GATE_SIGN_HEIGHT
      )
      .fill(GRAVEYARD_DETAILS.GATE_SIGN_COLOR);
    this.graphics.stroke({ width: 2, color: GRAVEYARD_DETAILS.GATE_SIGN_BORDER_COLOR });
    // Faded RIP lettering as ticks
    const sx = gateX + 14;
    const sy = gateY - 10;
    this.graphics
      .moveTo(sx, sy - 3)
      .lineTo(sx, sy + 3)
      .moveTo(sx - 2, sy - 3)
      .lineTo(sx + 2, sy - 3)
      .stroke({ width: 1.5, color: 0x8a7a5a, alpha: 0.7 });
    this.graphics
      .moveTo(sx + 7, sy - 3)
      .lineTo(sx + 7, sy + 3)
      .moveTo(sx + 5, sy)
      .lineTo(sx + 9, sy)
      .stroke({ width: 1.5, color: 0x8a7a5a, alpha: 0.7 });
    this.graphics
      .moveTo(sx + 12, sy - 3)
      .lineTo(sx + 12, sy + 3)
      .moveTo(sx + 12, sy - 3)
      .lineTo(sx + 15, sy - 3)
      .moveTo(sx + 12, sy)
      .lineTo(sx + 14, sy)
      .stroke({ width: 1.5, color: 0x8a7a5a, alpha: 0.7 });
    this.graphics
      .moveTo(gateX + 15, gateY - 15)
      .lineTo(gateX + 18, gateY - 4)
      .stroke({
        width: 1,
        color: GRAVEYARD_DETAILS.GATE_SIGN_CRACK_COLOR,
        alpha: GRAVEYARD_DETAILS.GATE_CRACK_ALPHA,
      });

    this.renderChain(gateX - GRAVEYARD_DETAILS.GATE_PILLAR_WIDTH, gateY + 5, -5, -6);
    this.renderChain(gateX + gateWidth + GRAVEYARD_DETAILS.GATE_PILLAR_WIDTH, gateY + 5, 11, 9);
  }

  private renderSkull(x: number, y: number): void {
    const size = GRAVEYARD_DETAILS.SKULL_SIZE;
    // Cranium
    this.graphics.ellipse(x, y, size, size * 0.9).fill(GRAVEYARD_DETAILS.SKULL_COLOR);
    this.graphics.stroke({ width: 1, color: GRAVEYARD_DETAILS.SKULL_BORDER_COLOR });
    // Jaw
    this.graphics
      .ellipse(x, y + size * 0.55, size * 0.65, size * 0.4)
      .fill(GRAVEYARD_DETAILS.SKULL_COLOR);
    // Eyes
    this.graphics.ellipse(x - 2.2, y - 0.5, 1.8, 2.2).fill(GRAVEYARD_DETAILS.SKULL_EYE_COLOR);
    this.graphics.ellipse(x + 2.2, y - 0.5, 1.8, 2.2).fill(GRAVEYARD_DETAILS.SKULL_EYE_COLOR);
    // Nose
    this.graphics
      .moveTo(x, y + 1)
      .lineTo(x - 1.2, y + 3.5)
      .lineTo(x + 1.2, y + 3.5)
      .fill(GRAVEYARD_DETAILS.SKULL_EYE_COLOR);
    // Teeth ticks
    for (let i = -1; i <= 1; i++) {
      this.graphics
        .moveTo(x + i * 1.8, y + size * 0.55)
        .lineTo(x + i * 1.8, y + size * 0.75)
        .stroke({ width: 1, color: GRAVEYARD_DETAILS.SKULL_EYE_COLOR, alpha: 0.8 });
    }
  }

  private renderChain(
    startX: number,
    startY: number,
    midOffsetX: number,
    linkOffsetX: number
  ): void {
    this.graphics
      .moveTo(startX, startY)
      .lineTo(startX + midOffsetX, startY + 10)
      .lineTo(startX, startY + 20)
      .stroke({ width: 2, color: GRAVEYARD_DETAILS.CHAIN_COLOR });
    for (let i = 0; i < GRAVEYARD_DETAILS.CHAIN_LINK_COUNT; i++) {
      this.graphics
        .ellipse(startX + linkOffsetX, startY + 5 + i * 8, 2.5, 3.5)
        .stroke({ width: 1.5, color: GRAVEYARD_DETAILS.GATE_IRON_BORDER_COLOR });
    }
  }

  private renderGravestones(): void {
    const gravestones: Gravestone[] = [
      { x: 40, y: 280, type: 'cross', size: 12, tilt: 0.1 },
      { x: 70, y: 275, type: 'headstone', size: 14, tilt: -0.08 },
      { x: 100, y: 285, type: 'cross', size: 10, tilt: 0.15 },
      { x: 130, y: 280, type: 'headstone', size: 13, tilt: -0.12 },

      { x: 35, y: 320, type: 'headstone', size: 15, tilt: 0.2 },
      { x: 65, y: 315, type: 'cross', size: 11, tilt: -0.1 },
      { x: 95, y: 325, type: 'monument', size: 18, tilt: 0.05 },
      { x: 125, y: 320, type: 'headstone', size: 12, tilt: 0.18 },

      { x: 40, y: 365, type: 'cross', size: 13, tilt: -0.15 },
      { x: 70, y: 370, type: 'headstone', size: 14, tilt: 0.1 },
      { x: 100, y: 360, type: 'cross', size: 10, tilt: -0.2, fallen: true },

      { x: 35, y: 410, type: 'headstone', size: 16, tilt: 0.12 },
      { x: 65, y: 405, type: 'cross', size: 11, tilt: -0.08 },
      { x: 95, y: 415, type: 'headstone', size: 13, tilt: 0.25 },
      { x: 125, y: 410, type: 'cross', size: 12, tilt: -0.15 },

      { x: 45, y: 455, type: 'monument', size: 17, tilt: 0.08 },
      { x: 75, y: 450, type: 'headstone', size: 14, tilt: -0.1 },
      { x: 105, y: 460, type: 'cross', size: 10, tilt: 0.15 },
      { x: 135, y: 455, type: 'headstone', size: 13, tilt: -0.18, fallen: true },

      { x: 50, y: 500, type: 'cross', size: 11, tilt: 0.2 },
      { x: 80, y: 495, type: 'headstone', size: 12, tilt: -0.12 },
      { x: 110, y: 505, type: 'cross', size: 10, tilt: 0.1 },
    ];

    for (const stone of gravestones) {
      this.renderGravestone(stone.x, stone.y, stone.type, stone.size, stone.tilt, stone.fallen);
    }
  }

  private renderGravestone(
    x: number,
    y: number,
    type: string,
    size: number,
    tilt: number,
    fallen = false
  ): void {
    if (fallen) {
      this.renderFallenStone(x, y, size, type);
      return;
    }

    if (type === 'cross') {
      this.renderCross(x, y, size, tilt);
    } else if (type === 'headstone') {
      this.renderHeadstone(x, y, size, tilt);
    } else if (type === 'monument') {
      this.renderMonument(x, y, size, tilt);
    }
  }

  private renderFallenStone(x: number, y: number, size: number, type: string): void {
    const color =
      type === 'cross' ? GRAVEYARD_DETAILS.CROSS_COLOR : GRAVEYARD_DETAILS.HEADSTONE_COLOR;
    // Toppled marker lying on the ground
    this.graphics
      .ellipse(x, y + size * 0.3, size * 0.7, size * 0.25)
      .fill({ color: GRAVEYARD_DETAILS.SHADOW_COLOR, alpha: 0.25 });
    this.graphics
      .rect(x - size * 0.6, y + size * 0.15, size * 1.2, size * 0.35)
      .fill(color);
    this.graphics.stroke({
      width: 1,
      color:
        type === 'cross'
          ? GRAVEYARD_DETAILS.CROSS_BORDER_COLOR
          : GRAVEYARD_DETAILS.HEADSTONE_BORDER_COLOR,
    });
    // Disturbed earth where it stood
    this.graphics
      .ellipse(x - size * 0.2, y + size * 0.55, 6, 3)
      .fill({ color: GRAVEYARD_DETAILS.DISTURBED_EARTH_COLOR, alpha: 0.7 });
  }

  private renderCross(x: number, y: number, size: number, tilt: number): void {
    const graphics = this.graphics;
    const crossWidth = size * 0.6;
    const crossHeight = size;
    const beamThickness = size * 0.15;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);

    const transform = (px: number, py: number) => ({
      x: x + px * cos - py * sin,
      y: y + px * sin + py * cos,
    });

    const drawBeam = (points: Array<{ x: number; y: number }>) => {
      const t = points.map(p => transform(p.x, p.y));
      graphics.moveTo(t[0].x, t[0].y);
      for (let i = 1; i < t.length; i++) {
        graphics.lineTo(t[i].x, t[i].y);
      }
      graphics.lineTo(t[0].x, t[0].y);
      graphics.fill({ color: GRAVEYARD_DETAILS.CROSS_COLOR });
      graphics.stroke({ width: 1, color: GRAVEYARD_DETAILS.CROSS_BORDER_COLOR });
    };

    drawBeam([
      { x: -beamThickness / 2, y: 0 },
      { x: beamThickness / 2, y: 0 },
      { x: beamThickness / 2, y: crossHeight },
      { x: -beamThickness / 2, y: crossHeight },
    ]);

    const hBeamY = crossHeight * 0.3;
    drawBeam([
      { x: -crossWidth / 2, y: hBeamY },
      { x: crossWidth / 2, y: hBeamY },
      { x: crossWidth / 2, y: hBeamY + beamThickness },
      { x: -crossWidth / 2, y: hBeamY + beamThickness },
    ]);

    // Wood grain
    const grain = transform(0, crossHeight * 0.5);
    graphics
      .moveTo(grain.x - 1, grain.y - 4)
      .lineTo(grain.x + 1, grain.y + 4)
      .stroke({ width: 1, color: GRAVEYARD_DETAILS.WOOD_GRAIN_COLOR, alpha: 0.5 });

    graphics.ellipse(x + 2, y + crossHeight + 2, size * 0.4, size * 0.2);
    graphics.fill({
      color: GRAVEYARD_DETAILS.SHADOW_COLOR,
      alpha: GRAVEYARD_DETAILS.SHADOW_ALPHA,
    });
  }

  private renderHeadstone(x: number, y: number, size: number, tilt: number): void {
    const graphics = this.graphics;
    const width = size * 0.8;
    const height = size;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);

    const transform = (px: number, py: number) => ({
      x: x + px * cos - py * sin,
      y: y + px * sin + py * cos,
    });

    // Pedestal base
    const base = [
      transform(-width * 0.55, height),
      transform(width * 0.55, height),
      transform(width * 0.55, height + 4),
      transform(-width * 0.55, height + 4),
    ];
    graphics.moveTo(base[0].x, base[0].y);
    for (let i = 1; i < base.length; i++) {
      graphics.lineTo(base[i].x, base[i].y);
    }
    graphics.fill({ color: GRAVEYARD_DETAILS.MONUMENT_BASE_COLOR });

    const points = [
      { x: -width / 2, y: height * 0.2 },
      { x: -width / 2, y: height },
      { x: width / 2, y: height },
      { x: width / 2, y: height * 0.2 },
    ];
    const transformedPoints = points.map(p => transform(p.x, p.y));

    graphics.moveTo(transformedPoints[0].x, transformedPoints[0].y);
    for (let i = 1; i < transformedPoints.length; i++) {
      graphics.lineTo(transformedPoints[i].x, transformedPoints[i].y);
    }
    graphics.lineTo(transformedPoints[0].x, transformedPoints[0].y);
    graphics.fill({ color: GRAVEYARD_DETAILS.HEADSTONE_COLOR });
    graphics.stroke({ width: 1, color: GRAVEYARD_DETAILS.HEADSTONE_BORDER_COLOR });

    const topCenter = transform(0, height * 0.2);
    graphics.arc(topCenter.x, topCenter.y, width / 2, Math.PI, 0);
    graphics.fill({ color: GRAVEYARD_DETAILS.HEADSTONE_COLOR });
    graphics.stroke({ width: 1, color: GRAVEYARD_DETAILS.HEADSTONE_BORDER_COLOR });

    // Weathered inscription lines
    for (let i = 0; i < 3; i++) {
      const a = transform(-width * 0.28, height * (0.4 + i * 0.15));
      const b = transform(width * 0.28, height * (0.4 + i * 0.15));
      graphics
        .moveTo(a.x, a.y)
        .lineTo(b.x, b.y)
        .stroke({ width: 1, color: 0x3a3a3a, alpha: 0.45 });
    }

    const crackStart = transform(-width * 0.2, height * 0.4);
    const crackEnd = transform(width * 0.1, height * 0.7);
    graphics.moveTo(crackStart.x, crackStart.y).lineTo(crackEnd.x, crackEnd.y);
    graphics.stroke({
      width: 1,
      color: GRAVEYARD_DETAILS.HEADSTONE_CRACK_COLOR,
      alpha: GRAVEYARD_DETAILS.GATE_CRACK_ALPHA,
    });

    for (let i = 0; i < 2; i++) {
      const moss = transform((this.rand() - 0.5) * width * 0.5, height * (0.5 + i * 0.2));
      graphics.circle(moss.x, moss.y, 2);
      graphics.fill({
        color: GRAVEYARD_DETAILS.GATE_MOSS_COLOR,
        alpha: GRAVEYARD_DETAILS.GATE_MOSS_ALPHA,
      });
    }

    graphics.ellipse(x + 3, y + height + 2, width * 0.5, width * 0.25);
    graphics.fill({
      color: GRAVEYARD_DETAILS.SHADOW_COLOR,
      alpha: GRAVEYARD_DETAILS.SHADOW_ALPHA,
    });
  }

  private renderMonument(x: number, y: number, size: number, tilt: number): void {
    const graphics = this.graphics;
    const width = size * 0.9;
    const height = size * 1.2;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);

    const transform = (px: number, py: number) => ({
      x: x + px * cos - py * sin,
      y: y + px * sin + py * cos,
    });

    const drawPoly = (pts: Array<{ x: number; y: number }>, fill: number, stroke: number) => {
      const t = pts.map(p => transform(p.x, p.y));
      graphics.moveTo(t[0].x, t[0].y);
      for (let i = 1; i < t.length; i++) {
        graphics.lineTo(t[i].x, t[i].y);
      }
      graphics.lineTo(t[0].x, t[0].y);
      graphics.fill({ color: fill });
      graphics.stroke({ width: 1, color: stroke });
    };

    drawPoly(
      [
        { x: -width / 2, y: height * 0.8 },
        { x: -width / 2, y: height },
        { x: width / 2, y: height },
        { x: width / 2, y: height * 0.8 },
      ],
      GRAVEYARD_DETAILS.MONUMENT_BASE_COLOR,
      GRAVEYARD_DETAILS.MONUMENT_BASE_BORDER_COLOR
    );

    drawPoly(
      [
        { x: -width * 0.4, y: height * 0.2 },
        { x: -width * 0.4, y: height * 0.8 },
        { x: width * 0.4, y: height * 0.8 },
        { x: width * 0.4, y: height * 0.2 },
      ],
      GRAVEYARD_DETAILS.HEADSTONE_COLOR,
      GRAVEYARD_DETAILS.HEADSTONE_BORDER_COLOR
    );

    drawPoly(
      [
        { x: -width * 0.4, y: height * 0.2 },
        { x: 0, y: 0 },
        { x: width * 0.4, y: height * 0.2 },
      ],
      GRAVEYARD_DETAILS.MONUMENT_BASE_COLOR,
      GRAVEYARD_DETAILS.MONUMENT_BASE_BORDER_COLOR
    );

    // Ornament diamond
    const ornament = transform(0, height * 0.45);
    graphics
      .moveTo(ornament.x, ornament.y - 3)
      .lineTo(ornament.x + 2.5, ornament.y)
      .lineTo(ornament.x, ornament.y + 3)
      .lineTo(ornament.x - 2.5, ornament.y)
      .fill({ color: 0x4a4a4a, alpha: 0.7 });

    graphics.ellipse(x + 4, y + height + 2, width * 0.6, width * 0.3);
    graphics.fill({
      color: GRAVEYARD_DETAILS.SHADOW_COLOR,
      alpha: GRAVEYARD_DETAILS.SHADOW_ALPHA,
    });
  }

  private renderProps(): void {
    // Rusted shovel stuck in the ground
    const shovelX = this.graveyardX + 48;
    const shovelY = this.graveyardY + 140;
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
    const wx = this.graveyardX + 100;
    const wy = this.graveyardY + 90;
    this.graphics
      .circle(wx, wy, 6)
      .stroke({ width: 2, color: 0x3a4a2a, alpha: 0.7 });
    this.graphics
      .circle(wx, wy, 4)
      .stroke({ width: 1, color: 0x5a2a2a, alpha: 0.5 });
  }

  private renderDeadTrees(): void {
    this.renderDeadTree(this.graveyardX + 25, this.graveyardY + 180, 1.0);
    this.renderDeadTree(this.graveyardX + 115, this.graveyardY + 220, 0.85);
    this.renderDeadTree(this.graveyardX + 55, this.graveyardY + 55, 0.7);
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

    const drawBranch = (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      width: number
    ) => {
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
    this.renderOpenGrave(this.graveyardX + 70, this.graveyardY + 120);
    this.renderOpenGrave(this.graveyardX + 110, this.graveyardY + 160);
    this.renderOpenGrave(this.graveyardX + 42, this.graveyardY + 200);
  }

  private renderOpenGrave(x: number, y: number): void {
    // Outer mound rim
    this.graphics
      .ellipse(x, y + 10, 22, 14)
      .fill({ color: GRAVEYARD_DETAILS.OPEN_GRAVE_DIRT_COLOR, alpha: 0.85 });

    // Dark pit with depth rings
    this.graphics.ellipse(x, y + 10, 14, 9).fill(GRAVEYARD_DETAILS.OPEN_GRAVE_HOLE_COLOR);
    this.graphics
      .ellipse(x, y + 11, 10, 6)
      .fill({ color: 0x0a0a0a, alpha: 0.85 });
    this.graphics.stroke({ width: 1.5, color: GRAVEYARD_DETAILS.OPEN_GRAVE_BORDER_COLOR });

    // Sickly glow from within
    this.graphics
      .ellipse(x, y + 10, 8, 5)
      .fill({
        color: GRAVEYARD_DETAILS.OPEN_GRAVE_GLOW_COLOR,
        alpha: GRAVEYARD_DETAILS.OPEN_GRAVE_GLOW_ALPHA,
      });

    // Dirt piles
    this.graphics.ellipse(x - 20, y + 8, 8, 5).fill(GRAVEYARD_DETAILS.OPEN_GRAVE_DIRT_COLOR);
    this.graphics.ellipse(x - 24, y + 14, 6, 4).fill(0x5a3a1a);
    this.graphics.ellipse(x + 20, y + 9, 8, 5).fill(GRAVEYARD_DETAILS.OPEN_GRAVE_DIRT_COLOR);
    this.graphics.ellipse(x + 24, y + 14, 5, 3).fill(0x5a3a1a);

    // Broken coffin planks
    this.graphics
      .rect(x - 10, y + 4, 9, 2.5)
      .fill(GRAVEYARD_DETAILS.COFFIN_COLOR);
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
