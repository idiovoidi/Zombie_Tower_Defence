import type { Graphics } from 'pixi.js';
import { COLORS } from '../../config/visualConstants';

/**
 * Camp perimeter: wooden fence, spikes and the open gate.
 */
export class CampPerimeterRenderer {
  private pathGraphics: Graphics;

  constructor(pathGraphics: Graphics) {
    this.pathGraphics = pathGraphics;
  }

  public render(campX: number, campY: number): void {
    this.renderFence(campX, campY);
    this.renderSpikes(campX, campY);
  }

  private renderFence(campX: number, campY: number): void {
    const g = this.pathGraphics;

    const drawFencePanel = (x: number, y: number, width: number, height: number) => {
      // Metal panel
      g.rect(x, y, width, height).fill({ color: COLORS.CAMP_FENCE, alpha: 0.92 });
      g.stroke({ width: 2, color: COLORS.CAMP_FENCE_OUTLINE });

      // Horizontal corrugation
      const barCount = Math.max(2, Math.floor(Math.max(width, height) / 6));
      for (let i = 1; i < barCount; i++) {
        if (height >= width) {
          g.moveTo(x, y + (i * height) / barCount)
            .lineTo(x + width, y + (i * height) / barCount)
            .stroke({ width: 1, color: COLORS.CAMP_FENCE_BAR, alpha: 0.45 });
        } else {
          g.moveTo(x + (i * width) / barCount, y)
            .lineTo(x + (i * width) / barCount, y + height)
            .stroke({ width: 1, color: COLORS.CAMP_FENCE_BAR, alpha: 0.45 });
        }
      }

      // Wooden plank patches over gaps
      if (width > height) {
        for (let i = 0; i < 3; i++) {
          const px = x + 8 + i * (width / 3.2);
          g.rect(px, y - 1, 5, height + 2).fill({ color: COLORS.CAMP_FENCE_WOOD, alpha: 0.7 });
          g.stroke({ width: 1, color: COLORS.CAMP_STAKE, alpha: 0.5 });
        }
      } else {
        for (let i = 0; i < 2; i++) {
          const py = y + 6 + i * (height / 2.5);
          g.rect(x - 1, py, width + 2, 4).fill({ color: COLORS.CAMP_FENCE_WOOD, alpha: 0.65 });
        }
      }

      // Rust streaks / bullet holes
      for (let i = 0; i < 3; i++) {
        const rx = x + 1 + ((i * 37) % Math.max(2, width - 2));
        const ry = y + 2 + ((i * 53) % Math.max(2, height - 4));
        g.moveTo(rx, ry)
          .lineTo(rx + (width > height ? 0 : 1), ry + Math.min(10, height * 0.35))
          .stroke({ width: 1.2, color: COLORS.CAMP_FENCE_RUST, alpha: 0.55 });
        g.circle(rx + 2, ry + 4, 1).fill({ color: COLORS.CAMP_GROUND_DARK, alpha: 0.7 });
      }

      // Barbed wire hint along top edge
      if (height <= 10 || width > height) {
        const topY = y;
        g.moveTo(x, topY)
          .lineTo(x + width, topY)
          .stroke({ width: 1, color: COLORS.CAMP_BARBED, alpha: 0.7 });
        for (let i = 0; i < Math.floor(width / 10); i++) {
          const bx = x + 5 + i * 10;
          g.moveTo(bx, topY)
            .lineTo(bx + 2, topY - 3)
            .lineTo(bx + 4, topY)
            .stroke({ width: 0.8, color: COLORS.CAMP_BARBED, alpha: 0.8 });
        }
      } else {
        // Vertical panel — barbs on outer edge
        const edgeX = x < campX ? x : x + width;
        g.moveTo(edgeX, y)
          .lineTo(edgeX, y + height)
          .stroke({ width: 1, color: COLORS.CAMP_BARBED, alpha: 0.65 });
      }
    };

    const gateHeight = 50;

    drawFencePanel(campX - 68, campY - 55, 6, campY - gateHeight / 2 - (campY - 55));
    drawFencePanel(campX - 68, campY + gateHeight / 2, 6, campY + 55 - (campY + gateHeight / 2));
    drawFencePanel(campX + 62, campY - 55, 6, 110);
    drawFencePanel(campX - 62, campY - 60, 124, 6);
    drawFencePanel(campX - 62, campY + 54, 124, 6);

    // Tin-can noise alarms on fence
    g.circle(campX - 65, campY - 40, 2.5).fill(COLORS.CAMP_TIN_CAN);
    g.circle(campX + 65, campY - 20, 2.5).fill(COLORS.CAMP_TIN_CAN);
    g.moveTo(campX - 65, campY - 40)
      .lineTo(campX - 65, campY - 48)
      .stroke({ width: 0.8, color: COLORS.CAMP_CLOTHESLINE, alpha: 0.7 });

    this.renderGate(campX, campY, gateHeight);
  }

  private renderSpikes(campX: number, campY: number): void {
    const g = this.pathGraphics;
    // Outward stakes near gate / left perimeter
    for (let i = 0; i < 6; i++) {
      const y = campY - 28 + i * 12;
      if (y > campY - 22 && y < campY + 22) {
        continue; // leave gate clear
      }
      g.moveTo(campX - 72, y)
        .lineTo(campX - 84, y - 3)
        .lineTo(campX - 72, y + 3)
        .fill({ color: COLORS.CAMP_SPIKE, alpha: 0.85 });
      g.stroke({ width: 1, color: COLORS.CAMP_STAKE, alpha: 0.6 });
    }
  }

  private renderGate(campX: number, campY: number, gateHeight: number): void {
    const g = this.pathGraphics;

    // Gate posts with caps (top-down square posts)
    g.rect(campX - 71, campY - gateHeight / 2 - 4, 6, 8).fill(COLORS.CAMP_FENCE);
    g.stroke({ width: 1, color: COLORS.CAMP_FENCE_OUTLINE });
    g.rect(campX - 71, campY + gateHeight / 2 - 4, 6, 8).fill(COLORS.CAMP_FENCE);
    g.stroke({ width: 1, color: COLORS.CAMP_FENCE_OUTLINE });
    g.rect(campX - 72, campY - gateHeight / 2 - 6, 8, 3).fill(COLORS.CAMP_FENCE_BAR);
    g.rect(campX - 72, campY + gateHeight / 2 + 3, 8, 3).fill(COLORS.CAMP_FENCE_BAR);

    const hingeX = campX - 68;
    const topHingeY = campY - gateHeight / 2;
    const botHingeY = campY + gateHeight / 2;
    // Leaf length ≈ half the opening; thickness is the door's top-down face width
    const leafLen = gateHeight * 0.42;
    const thickness = 7;

    // Top leaf — hinged at north post, swung open westward (flat on ground plane)
    this.drawOpenGateLeaf(hingeX, topHingeY, leafLen, thickness, 'top');
    // Bottom leaf — hinged at south post, swung open westward
    this.drawOpenGateLeaf(hingeX, botHingeY, leafLen, thickness, 'bottom');
  }

  /**
   * Top-down open gate leaf: a flat metal panel on the ground plane,
   * hinged at the fence and swung outward along -X (toward the path approach).
   */
  private drawOpenGateLeaf(
    hingeX: number,
    hingeY: number,
    leafLen: number,
    thickness: number,
    side: 'top' | 'bottom'
  ): void {
    const g = this.pathGraphics;
    // Slight outward splay so leaves don't look perfectly parallel
    const splay = side === 'top' ? -3 : 3;
    const hingeTowardCenter = side === 'top' ? thickness : -thickness;

    // Panel corners (parallelogram on the ground)
    const h0x = hingeX;
    const h0y = hingeY;
    const h1x = hingeX;
    const h1y = hingeY + hingeTowardCenter;
    const t1x = hingeX - leafLen;
    const t1y = hingeY + hingeTowardCenter + splay;
    const t0x = hingeX - leafLen;
    const t0y = hingeY + splay;

    // Soft ground shadow under the leaf
    g.moveTo(h0x + 1, h0y + 2)
      .lineTo(t0x + 1, t0y + 3)
      .lineTo(t1x + 1, t1y + 3)
      .lineTo(h1x + 1, h1y + 2)
      .fill({ color: COLORS.CAMP_SHADOW, alpha: 0.22 });

    // Door face
    g.moveTo(h0x, h0y)
      .lineTo(t0x, t0y)
      .lineTo(t1x, t1y)
      .lineTo(h1x, h1y)
      .fill({ color: COLORS.CAMP_GATE, alpha: 0.95 });
    g.stroke({ width: 1.5, color: COLORS.CAMP_GATE_OUTLINE });

    // Crossbars across the face (perpendicular to leaf length)
    for (const t of [0.25, 0.5, 0.75]) {
      const ax = h0x + (t0x - h0x) * t;
      const ay = h0y + (t0y - h0y) * t;
      const bx = h1x + (t1x - h1x) * t;
      const by = h1y + (t1y - h1y) * t;
      g.moveTo(ax, ay)
        .lineTo(bx, by)
        .stroke({ width: 1.2, color: COLORS.CAMP_GATE_OUTLINE, alpha: 0.75 });
    }

    // Long ribs along the leaf
    const midHx = (h0x + h1x) / 2;
    const midHy = (h0y + h1y) / 2;
    const midTx = (t0x + t1x) / 2;
    const midTy = (t0y + t1y) / 2;
    g.moveTo(midHx, midHy)
      .lineTo(midTx, midTy)
      .stroke({ width: 1, color: COLORS.CAMP_FENCE_BAR, alpha: 0.55 });

    // Hinge knuckles
    g.circle(h0x, h0y, 1.8).fill(COLORS.CAMP_FENCE_OUTLINE);
    g.circle(h1x, h1y, 1.8).fill(COLORS.CAMP_FENCE_OUTLINE);

    // Latch stub on free edge
    g.rect(t0x - 1, (t0y + t1y) / 2 - 1.5, 3, 3).fill(COLORS.CAMP_FENCE_BAR);
  }
}
