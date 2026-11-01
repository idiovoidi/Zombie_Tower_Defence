import type { Graphics } from 'pixi.js';
import { GRAVEYARD_DETAILS } from '../../config/visualConstants';

/**
 * Wrought-iron fence, stone gate pillars with skulls, broken gates, RIP sign
 * and rusty chains around the graveyard.
 */
export class GraveyardFenceRenderer {
  private graphics: Graphics;
  private graveyardX = GRAVEYARD_DETAILS.X;
  private graveyardY = GRAVEYARD_DETAILS.Y;
  private graveyardWidth = GRAVEYARD_DETAILS.WIDTH;
  private graveyardHeight = GRAVEYARD_DETAILS.HEIGHT;
  private rand: () => number = Math.random;

  constructor(graphics: Graphics) {
    this.graphics = graphics;
  }

  /** @param rand Shared seeded generator so output stays deterministic across sub-renderers. */
  public render(rand: () => number): void {
    this.rand = rand;
    this.renderFence();
    this.renderGate();
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
        this.graphics.rect(x, y, length, railT).fill(GRAVEYARD_DETAILS.FENCE_COLOR);
        this.graphics.rect(x, y + 10, length, railT).fill(GRAVEYARD_DETAILS.FENCE_COLOR);
      } else {
        this.graphics.rect(x, y, railT, length).fill(GRAVEYARD_DETAILS.FENCE_COLOR);
        this.graphics.rect(x + 8, y, railT, length).fill(GRAVEYARD_DETAILS.FENCE_COLOR);
      }

      const count = Math.floor(length / barSpacing);
      for (let i = 0; i <= count; i++) {
        const broken = brokenEvery !== undefined && i % brokenEvery === 3;
        if (horizontal) {
          const bx = x + i * barSpacing;
          const barH = broken ? 7 + (i % 3) : 14;
          this.graphics.rect(bx, y, barWidth, barH).fill(GRAVEYARD_DETAILS.FENCE_BAR_COLOR);
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
            this.graphics.rect(x + 2, by, 6, barWidth).fill(GRAVEYARD_DETAILS.FENCE_BAR_COLOR);
            continue;
          }
          // Side fence: short outward spikes along the rail
          this.graphics.rect(x, by, 12, barWidth).fill(GRAVEYARD_DETAILS.FENCE_BAR_COLOR);
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
        this.graphics.ellipse(px + 2 + this.rand() * 4, gateY + 18 + i * 14, 2.5, 1.5).fill({
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
}
