import type { Graphics } from 'pixi.js';
import { COLORS } from '../../config/visualConstants';
import type { Waypoint } from '../../managers/PathfindingManager';
import { createSeededRandom } from '../../utils/seededRandom';

/**
 * CampRenderer handles all survivor camp rendering including:
 * - Static camp structures (tents, fences, sandbags, etc.)
 * - Animated elements (campfire, survivors)
 * - Camp decorations and details
 */
export class CampRenderer {
  private pathGraphics: Graphics;
  private campAnimationContainer: Graphics;
  private campX = 0;
  private campY = 0;
  private campAnimationTime = 0;

  constructor(pathGraphics: Graphics, campAnimationContainer: Graphics) {
    this.pathGraphics = pathGraphics;
    this.campAnimationContainer = campAnimationContainer;
  }

  public render(endpoint: Waypoint): void {
    const campX = endpoint.x;
    const campY = endpoint.y;
    this.campX = campX;
    this.campY = campY;
    this.renderStaticCampElements(campX, campY);
  }

  public updateAnimations(deltaTime: number): void {
    if (this.campX === 0 || this.campY === 0) {
      return;
    }
    this.campAnimationTime += deltaTime * 0.001;
    this.campAnimationContainer.clear();
    this.renderAnimatedCampElements(this.campX, this.campY);
  }

  public getCampPosition(): { x: number; y: number } {
    return { x: this.campX, y: this.campY };
  }

  private renderStaticCampElements(campX: number, campY: number): void {
    this.renderGround(campX, campY);
    this.renderFence(campX, campY);
    this.renderSpikes(campX, campY);
    this.renderTents(campX, campY);
    this.renderSandbags(campX, campY);
    this.renderSupplyCrates(campX, campY);
    this.renderWatchtower(campX, campY);
    this.renderCampfireStatic(campX, campY);
    this.renderLaundryLine(campX, campY);
    this.renderWarningSign(campX, campY);
    this.renderGenerator(campX, campY);
    this.renderPicnicTable(campX, campY);
    this.renderStringLights(campX, campY);
    this.renderPersonalItems(campX, campY);
    this.renderMemorial(campX, campY);
  }

  private renderGround(campX: number, campY: number): void {
    const g = this.pathGraphics;
    // Soft outer cleared ring
    g.circle(campX, campY, 78).fill({ color: COLORS.CAMP_GROUND, alpha: 0.28 });
    // Compacted earth pad
    g.ellipse(campX, campY + 2, 68, 62).fill({ color: COLORS.CAMP_GROUND, alpha: 0.55 });
    g.ellipse(campX, campY + 2, 52, 46).fill({ color: COLORS.CAMP_GROUND_DARK, alpha: 0.25 });

    const seed = Math.floor(campX * 13 + campY * 17);
    const rand = createSeededRandom(seed);

    // Foot traffic trails toward gate / tents / fire
    const trails: Array<[number, number, number, number]> = [
      [campX - 55, campY, campX - 10, campY + 8],
      [campX - 20, campY - 25, campX, campY + 28],
      [campX + 30, campY + 10, campX, campY + 30],
      [campX - 40, campY - 35, campX - 20, campY - 5],
    ];
    for (const [x0, y0, x1, y1] of trails) {
      g.moveTo(x0, y0)
        .lineTo(x1, y1)
        .stroke({ width: 5, color: COLORS.CAMP_FOOTPRINT, alpha: 0.18, cap: 'round' });
    }

    // Wear mottles, mud, ash, debris
    for (let i = 0; i < 28; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * 58;
      const x = campX + Math.cos(angle) * dist;
      const y = campY + Math.sin(angle) * dist * 0.9;
      const kind = rand();
      if (kind < 0.45) {
        g.ellipse(x, y, 3 + rand() * 5, 2 + rand() * 3).fill({
          color: COLORS.CAMP_GROUND_DARK,
          alpha: 0.12 + rand() * 0.15,
        });
      } else if (kind < 0.65) {
        g.ellipse(x, y, 4 + rand() * 6, 2 + rand() * 3).fill({
          color: COLORS.CAMP_MUD,
          alpha: 0.2 + rand() * 0.15,
        });
      } else if (kind < 0.8) {
        g.circle(x, y, 2 + rand() * 3).fill({ color: COLORS.CAMP_ASH, alpha: 0.2 });
      } else {
        g.rect(x, y, 2 + rand() * 3, 1 + rand() * 2).fill({
          color: COLORS.CAMP_DEBRIS,
          alpha: 0.4,
        });
      }
    }

    // Old blood stain near gate (past attacks)
    g.ellipse(campX - 50, campY + 8, 8, 4).fill({ color: 0x4a1010, alpha: 0.22 });
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
    drawFencePanel(
      campX - 68,
      campY + gateHeight / 2,
      6,
      campY + 55 - (campY + gateHeight / 2)
    );
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

  private renderTents(campX: number, campY: number): void {
    const g = this.pathGraphics;

    // Command tent shadow
    g.ellipse(campX, campY + 12, 34, 10).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.2 });

    // Main command tent base
    g.roundRect(campX - 32, campY - 10, 64, 35, 2)
      .fill(COLORS.CAMP_TENT_BASE)
      .stroke({ width: 2, color: COLORS.CAMP_TENT_OUTLINE });

    // Peaked roof
    g.moveTo(campX - 36, campY - 10)
      .lineTo(campX, campY - 34)
      .lineTo(campX + 36, campY - 10)
      .fill(COLORS.CAMP_TENT_ROOF);
    g.stroke({ width: 2, color: COLORS.CAMP_TENT_ROOF_OUTLINE });

    // Roof seams / folds
    g.moveTo(campX, campY - 34)
      .lineTo(campX, campY - 10)
      .stroke({ width: 2, color: COLORS.CAMP_TENT_OUTLINE });
    g.moveTo(campX - 18, campY - 10)
      .lineTo(campX - 8, campY - 26)
      .stroke({ width: 1, color: COLORS.CAMP_TENT_STITCH, alpha: 0.6 });
    g.moveTo(campX + 18, campY - 10)
      .lineTo(campX + 8, campY - 26)
      .stroke({ width: 1, color: COLORS.CAMP_TENT_STITCH, alpha: 0.6 });

    // Camo / repair patches
    g.rect(campX - 26, campY - 4, 10, 7).fill({ color: COLORS.CAMP_TENT_PATCH, alpha: 0.65 });
    g.rect(campX + 12, campY + 2, 9, 6).fill({ color: COLORS.CAMP_TENT_CAMO, alpha: 0.7 });
    g.rect(campX - 8, campY - 22, 7, 5).fill({ color: COLORS.CAMP_TENT_PATCH, alpha: 0.5 });

    // Rolled side vents
    g.ellipse(campX - 32, campY + 2, 3, 6).fill({ color: COLORS.CAMP_TENT_FLAP, alpha: 0.8 });
    g.ellipse(campX + 32, campY + 2, 3, 6).fill({ color: COLORS.CAMP_TENT_FLAP, alpha: 0.8 });

    // Entrance flap (parted)
    g.rect(campX - 11, campY + 14, 9, 11).fill(COLORS.CAMP_TENT_FLAP);
    g.rect(campX + 2, campY + 14, 9, 11).fill(COLORS.CAMP_TENT_FLAP);
    g.stroke({ width: 1.5, color: COLORS.CAMP_TENT_ROOF_OUTLINE });
    g.rect(campX - 2, campY + 14, 4, 11).fill({ color: COLORS.CAMP_GROUND_DARK, alpha: 0.7 });

    // Guy lines + stakes + sandbag weights
    g.moveTo(campX - 36, campY - 10)
      .lineTo(campX - 48, campY + 6)
      .stroke({ width: 1.2, color: COLORS.CAMP_ROPE });
    g.moveTo(campX + 36, campY - 10)
      .lineTo(campX + 48, campY + 6)
      .stroke({ width: 1.2, color: COLORS.CAMP_ROPE });
    g.rect(campX - 50, campY + 5, 3, 8).fill(COLORS.CAMP_STAKE);
    g.rect(campX + 47, campY + 5, 3, 8).fill(COLORS.CAMP_STAKE);
    g.roundRect(campX - 52, campY + 10, 8, 5, 1).fill(COLORS.CAMP_SANDBAG);
    g.roundRect(campX + 44, campY + 10, 8, 5, 1).fill(COLORS.CAMP_SANDBAG);

    // Medical tent
    g.ellipse(campX - 37, campY - 28, 16, 6).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.15 });
    g.moveTo(campX - 52, campY - 40)
      .lineTo(campX - 37, campY - 52)
      .lineTo(campX - 22, campY - 40)
      .fill(COLORS.CAMP_MEDICAL_TENT_ROOF);
    g.stroke({ width: 2, color: COLORS.CAMP_MEDICAL_TENT_OUTLINE });
    g.roundRect(campX - 50, campY - 40, 28, 18, 1)
      .fill(COLORS.CAMP_MEDICAL_TENT_WALL)
      .stroke({ width: 1, color: COLORS.CAMP_MEDICAL_TENT_OUTLINE });
    // Red cross
    g.rect(campX - 40, campY - 35, 6, 2.5).fill(COLORS.CAMP_RED_CROSS);
    g.rect(campX - 38.5, campY - 37.5, 2.5, 7).fill(COLORS.CAMP_RED_CROSS);
    // Blood stain near entrance
    g.ellipse(campX - 36, campY - 20, 5, 2.5).fill({ color: 0x5a1010, alpha: 0.3 });
    // Quarantine tick mark
    g.rect(campX - 48, campY - 38, 4, 3).fill({ color: 0xffcc00, alpha: 0.7 });

    // Supply tent
    g.ellipse(campX + 37, campY - 28, 16, 6).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.15 });
    g.moveTo(campX + 22, campY - 40)
      .lineTo(campX + 37, campY - 52)
      .lineTo(campX + 52, campY - 40)
      .fill(COLORS.CAMP_SUPPLY_TENT_ROOF);
    g.stroke({ width: 2, color: COLORS.CAMP_SUPPLY_TENT_OUTLINE });
    g.roundRect(campX + 24, campY - 40, 26, 18, 1)
      .fill(COLORS.CAMP_SUPPLY_TENT_WALL)
      .stroke({ width: 1, color: COLORS.CAMP_SUPPLY_TENT_OUTLINE });
    // Bulge / overstuff hint
    g.ellipse(campX + 50, campY - 32, 4, 7).fill({
      color: COLORS.CAMP_SUPPLY_TENT_WALL,
      alpha: 0.9,
    });
    // Padlock
    g.rect(campX + 35, campY - 24, 4, 3).fill(COLORS.CAMP_GENERATOR);
    g.circle(campX + 37, campY - 24, 1.5).fill(COLORS.CAMP_FENCE_OUTLINE);
  }

  private renderSandbags(campX: number, campY: number): void {
    const g = this.pathGraphics;
    const drawSandbag = (x: number, y: number, scale = 1) => {
      g.roundRect(x, y, 12 * scale, 8 * scale, 2)
        .fill(COLORS.CAMP_SANDBAG)
        .stroke({ width: 1, color: COLORS.CAMP_SANDBAG_OUTLINE });
      g.ellipse(x + 6 * scale, y + 2 * scale, 4 * scale, 1.5 * scale).fill({
        color: COLORS.CAMP_SANDBAG_OUTLINE,
        alpha: 0.25,
      });
    };

    // Left nest (stacked)
    drawSandbag(campX - 60, campY + 28);
    drawSandbag(campX - 48, campY + 28);
    drawSandbag(campX - 54, campY + 36);
    // Right nest
    drawSandbag(campX + 36, campY + 28);
    drawSandbag(campX + 48, campY + 28);
    drawSandbag(campX + 42, campY + 36);
    // Gate flanking bags
    drawSandbag(campX - 64, campY - 18, 0.9);
    drawSandbag(campX - 64, campY + 12, 0.9);
  }

  private renderSupplyCrates(campX: number, campY: number): void {
    const g = this.pathGraphics;
    const drawCrate = (x: number, y: number) => {
      g.ellipse(x + 7, y + 14, 8, 3).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.2 });
      g.rect(x, y, 14, 14)
        .fill(COLORS.CAMP_CRATE)
        .stroke({ width: 2, color: COLORS.CAMP_CRATE_OUTLINE });
      g.moveTo(x, y + 7)
        .lineTo(x + 14, y + 7)
        .stroke({ width: 1, color: COLORS.CAMP_CRATE_OUTLINE });
      g.moveTo(x + 7, y)
        .lineTo(x + 7, y + 14)
        .stroke({ width: 1, color: COLORS.CAMP_CRATE_OUTLINE });
      // Metal band
      g.rect(x - 0.5, y + 3, 15, 2).fill({ color: COLORS.CAMP_CRATE_BAND, alpha: 0.7 });
    };

    drawCrate(campX - 56, campY - 50);
    drawCrate(campX - 56, campY - 34);
    drawCrate(campX - 40, campY - 50);
    drawCrate(campX + 40, campY - 48);
  }

  private renderWatchtower(campX: number, campY: number): void {
    const g = this.pathGraphics;
    // Legs with shadow
    g.ellipse(campX - 52, campY + 12, 10, 4).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.18 });
    g.rect(campX - 60, campY - 35, 4, 45).fill(COLORS.CAMP_WATCHTOWER_WOOD);
    g.rect(campX - 46, campY - 35, 4, 45).fill(COLORS.CAMP_WATCHTOWER_WOOD);
    g.rect(campX - 60, campY - 35, 4, 45).stroke({
      width: 1,
      color: COLORS.CAMP_LOG_OUTLINE,
      alpha: 0.5,
    });

    // Cross braces
    g.moveTo(campX - 58, campY - 30)
      .lineTo(campX - 48, campY - 10)
      .stroke({ width: 2, color: COLORS.CAMP_WATCHTOWER_WOOD });
    g.moveTo(campX - 48, campY - 30)
      .lineTo(campX - 58, campY - 10)
      .stroke({ width: 2, color: COLORS.CAMP_WATCHTOWER_WOOD });
    g.moveTo(campX - 58, campY - 5)
      .lineTo(campX - 48, campY + 8)
      .stroke({ width: 1.5, color: COLORS.CAMP_WATCHTOWER_WOOD, alpha: 0.8 });

    // Platform + planks
    g.rect(campX - 64, campY - 40, 26, 8)
      .fill(COLORS.CAMP_WATCHTOWER_PLATFORM)
      .stroke({ width: 2, color: COLORS.CAMP_WATCHTOWER_WOOD });
    for (let i = 0; i < 4; i++) {
      g.moveTo(campX - 62 + i * 6, campY - 40)
        .lineTo(campX - 62 + i * 6, campY - 32)
        .stroke({ width: 1, color: COLORS.CAMP_WATCHTOWER_WOOD, alpha: 0.4 });
    }

    // Railing posts
    g.rect(campX - 64, campY - 44, 26, 2).fill(COLORS.CAMP_WATCHTOWER_RAILING);
    g.rect(campX - 64, campY - 46, 2, 6).fill(COLORS.CAMP_WATCHTOWER_RAILING);
    g.rect(campX - 40, campY - 46, 2, 6).fill(COLORS.CAMP_WATCHTOWER_RAILING);

    // Ladder
    g.moveTo(campX - 44, campY + 8)
      .lineTo(campX - 44, campY - 32)
      .stroke({ width: 2, color: COLORS.CAMP_WATCHTOWER_WOOD });
    g.moveTo(campX - 40, campY + 8)
      .lineTo(campX - 40, campY - 32)
      .stroke({ width: 2, color: COLORS.CAMP_WATCHTOWER_WOOD });
    for (let i = 0; i < 5; i++) {
      g.moveTo(campX - 44, campY + 4 - i * 8)
        .lineTo(campX - 40, campY + 4 - i * 8)
        .stroke({ width: 1.5, color: COLORS.CAMP_WATCHTOWER_WOOD });
    }

    // Radio antenna
    g.moveTo(campX - 66, campY - 40)
      .lineTo(campX - 66, campY - 60)
      .stroke({ width: 2, color: COLORS.CAMP_RADIO_ANTENNA });
    g.circle(campX - 66, campY - 60, 2.5).fill(COLORS.CAMP_RADIO_LIGHT);
    g.circle(campX - 66, campY - 60, 4).fill({ color: COLORS.CAMP_RADIO_LIGHT, alpha: 0.25 });
  }

  private renderCampfireStatic(campX: number, campY: number): void {
    const g = this.pathGraphics;
    g.ellipse(campX, campY + 34, 16, 8).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.2 });

    // Irregular stone ring
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const rx = 12 + (i % 3) * 0.8;
      const ry = 6 + (i % 2) * 0.6;
      const x = campX + Math.cos(angle) * rx;
      const y = campY + 32 + Math.sin(angle) * ry;
      g.ellipse(x, y, 3.2, 2.4)
        .fill(COLORS.CAMP_FIRE_RING_STONE)
        .stroke({ width: 1, color: COLORS.CAMP_FIRE_RING_OUTLINE });
    }

    g.ellipse(campX, campY + 32, 10, 5).fill({ color: COLORS.CAMP_FIRE_PIT, alpha: 0.75 });
    // Charred wood in pit
    g.moveTo(campX - 5, campY + 31)
      .lineTo(campX + 4, campY + 33)
      .stroke({ width: 2, color: COLORS.CAMP_ASH, alpha: 0.8 });
    g.moveTo(campX + 3, campY + 30)
      .lineTo(campX - 2, campY + 34)
      .stroke({ width: 1.5, color: COLORS.CAMP_GROUND_DARK, alpha: 0.7 });

    // Seating logs with bark detail
    g.moveTo(campX - 24, campY + 40)
      .lineTo(campX - 8, campY + 37)
      .lineTo(campX - 8, campY + 43)
      .lineTo(campX - 24, campY + 45)
      .fill(COLORS.CAMP_LOG)
      .stroke({ width: 1, color: COLORS.CAMP_LOG_OUTLINE });
    g.moveTo(campX + 8, campY + 37)
      .lineTo(campX + 24, campY + 40)
      .lineTo(campX + 24, campY + 45)
      .lineTo(campX + 8, campY + 43)
      .fill(COLORS.CAMP_LOG)
      .stroke({ width: 1, color: COLORS.CAMP_LOG_OUTLINE });
  }

  private renderLaundryLine(campX: number, campY: number): void {
    const g = this.pathGraphics;
    g.moveTo(campX - 22, campY - 26)
      .lineTo(campX + 22, campY - 26)
      .stroke({ width: 1, color: COLORS.CAMP_CLOTHESLINE });
    // Clothes with hangers / folds
    g.rect(campX - 12, campY - 26, 7, 9).fill({ color: COLORS.CAMP_CLOTHES_BLUE, alpha: 0.75 });
    g.moveTo(campX - 12, campY - 22)
      .lineTo(campX - 5, campY - 22)
      .stroke({ width: 1, color: 0x2a4a8a, alpha: 0.5 });
    g.rect(campX + 2, campY - 26, 7, 10).fill({ color: COLORS.CAMP_CLOTHES_GREEN, alpha: 0.75 });
    g.rect(campX + 12, campY - 26, 5, 7).fill({ color: 0x8b4513, alpha: 0.65 });
  }

  private renderWarningSign(campX: number, campY: number): void {
    const g = this.pathGraphics;
    g.ellipse(campX, campY - 48, 40, 6).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.12 });
    g.roundRect(campX - 40, campY - 60, 80, 18, 1)
      .fill(COLORS.CAMP_SIGN)
      .stroke({ width: 2.5, color: COLORS.CAMP_SIGN_OUTLINE });
    g.rect(campX - 38, campY - 58, 6, 14).fill({ color: COLORS.CAMP_SIGN_STRIPE, alpha: 0.85 });
    g.rect(campX + 32, campY - 58, 6, 14).fill({ color: COLORS.CAMP_SIGN_STRIPE, alpha: 0.85 });
    g.roundRect(campX - 30, campY - 56, 60, 11, 1)
      .fill({ color: COLORS.CAMP_SIGN_SAFE_ZONE, alpha: 0.75 })
      .stroke({ width: 1.5, color: COLORS.CAMP_SIGN_SAFE_ZONE_OUTLINE });
    // Hand-painted SAFE ticks
    g.moveTo(campX - 18, campY - 50)
      .lineTo(campX - 14, campY - 46)
      .lineTo(campX - 8, campY - 52)
      .stroke({ width: 1.5, color: 0xffffff, alpha: 0.7 });
    for (const [nx, ny] of [
      [-36, -56],
      [36, -56],
      [-36, -44],
      [36, -44],
    ] as const) {
      g.circle(campX + nx, campY + ny, 1.5).fill(COLORS.CAMP_SIGN_NAIL);
    }
  }

  private renderGenerator(campX: number, campY: number): void {
    const g = this.pathGraphics;
    g.ellipse(campX + 54, campY + 28, 10, 4).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.18 });
    g.roundRect(campX + 46, campY + 18, 14, 12, 1)
      .fill(COLORS.CAMP_GENERATOR)
      .stroke({ width: 2, color: COLORS.CAMP_GENERATOR_OUTLINE });
    g.rect(campX + 48, campY + 20, 10, 3).fill({ color: COLORS.CAMP_FENCE_BAR, alpha: 0.6 });
    g.rect(campX + 52, campY + 14, 3, 5).fill(COLORS.CAMP_GENERATOR_EXHAUST);
    // Exhaust puff hint (static)
    g.circle(campX + 53.5, campY + 12, 2).fill({ color: COLORS.CAMP_ASH, alpha: 0.35 });
    g.roundRect(campX + 46, campY + 32, 7, 9, 1)
      .fill(COLORS.CAMP_FUEL_CAN)
      .stroke({ width: 1, color: COLORS.CAMP_FUEL_CAN_OUTLINE });
    g.rect(campX + 48, campY + 31, 3, 2).fill(COLORS.CAMP_GENERATOR_OUTLINE);
  }

  private renderPicnicTable(campX: number, campY: number): void {
    const g = this.pathGraphics;
    g.ellipse(campX, campY + 18, 14, 4).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.15 });
    g.rect(campX - 13, campY + 11, 26, 4).fill(COLORS.CAMP_TABLE);
    g.stroke({ width: 1, color: COLORS.CAMP_TABLE_LEG });
    g.rect(campX - 11, campY + 15, 2, 7).fill(COLORS.CAMP_TABLE_LEG);
    g.rect(campX + 9, campY + 15, 2, 7).fill(COLORS.CAMP_TABLE_LEG);
    // Bench
    g.rect(campX - 12, campY + 20, 24, 2).fill({ color: COLORS.CAMP_TABLE, alpha: 0.8 });
    g.circle(campX - 6, campY + 12, 2).fill(COLORS.CAMP_CUP);
    g.rect(campX + 2, campY + 11, 5, 2.5).fill(COLORS.CAMP_BOOK);
    g.rect(campX + 8, campY + 12, 3, 2).fill(0x2a4a2a); // ration tin
  }

  private renderStringLights(campX: number, campY: number): void {
    const g = this.pathGraphics;
    g.moveTo(campX - 52, campY - 12)
      .quadraticCurveTo(campX - 25, campY - 4, campX, campY - 9)
      .quadraticCurveTo(campX + 25, campY - 4, campX + 52, campY - 12)
      .stroke({ width: 1, color: COLORS.CAMP_CLOTHESLINE });
    for (let i = -40; i <= 40; i += 16) {
      const y = campY - 8 + Math.abs(i) * 0.04;
      g.circle(campX + i, y, 2.2).fill({ color: COLORS.CAMP_LIGHT_BULB, alpha: 0.75 });
      g.circle(campX + i, y, 4).fill({ color: COLORS.CAMP_LIGHT_BULB, alpha: 0.18 });
    }
  }

  private renderPersonalItems(campX: number, campY: number): void {
    const g = this.pathGraphics;
    // Backpack
    g.roundRect(campX - 28, campY - 2, 7, 9, 1)
      .fill(COLORS.CAMP_BACKPACK)
      .stroke({ width: 1, color: COLORS.CAMP_BACKPACK_OUTLINE });
    g.rect(campX - 27, campY, 5, 2).fill({ color: COLORS.CAMP_BACKPACK_OUTLINE, alpha: 0.6 });
    // Boots
    g.roundRect(campX + 18, campY - 4, 5, 7, 1).fill(COLORS.CAMP_BOOTS);
    g.roundRect(campX + 25, campY - 4, 5, 7, 1).fill(COLORS.CAMP_BOOTS);
    g.rect(campX + 18, campY + 2, 5, 1.5).fill(COLORS.CAMP_GROUND_DARK);
    g.rect(campX + 25, campY + 2, 5, 1.5).fill(COLORS.CAMP_GROUND_DARK);
    // Guitar
    g.ellipse(campX - 32, campY - 32, 4.5, 6.5).fill(COLORS.CAMP_GUITAR_BODY);
    g.rect(campX - 33, campY - 40, 2, 14).fill(COLORS.CAMP_GUITAR_NECK);
    g.circle(campX - 32, campY - 32, 1.5).fill({ color: COLORS.CAMP_GROUND_DARK, alpha: 0.5 });
    // Helmet on crate
    g.ellipse(campX - 48, campY - 52, 4, 2.5).fill(COLORS.CAMP_FENCE);
    g.ellipse(campX - 48, campY - 53, 3, 1.5).fill(COLORS.CAMP_FENCE_BAR);
  }

  private renderMemorial(campX: number, campY: number): void {
    const g = this.pathGraphics;
    g.rect(campX + 58, campY + 40, 2.5, 12).fill(COLORS.CAMP_MEMORIAL_CROSS);
    g.rect(campX + 54, campY + 43, 10.5, 2.5).fill(COLORS.CAMP_MEMORIAL_CROSS);
    g.circle(campX + 59, campY + 53, 2.2).fill({ color: COLORS.CAMP_FLOWER_RED, alpha: 0.7 });
    g.circle(campX + 62, campY + 53, 2).fill({ color: COLORS.CAMP_FLOWER_YELLOW, alpha: 0.7 });
    g.circle(campX + 56, campY + 52, 1.5).fill({ color: 0xffffff, alpha: 0.5 });
  }

  private renderAnimatedCampElements(campX: number, campY: number): void {
    const flicker1 = Math.sin(this.campAnimationTime * 8) * 0.5 + 0.5;
    const flicker2 = Math.sin(this.campAnimationTime * 10 + 1) * 0.5 + 0.5;
    const flicker3 = Math.sin(this.campAnimationTime * 12 + 2) * 0.5 + 0.5;

    // Warm glow under fire
    this.campAnimationContainer
      .ellipse(campX, campY + 34, 14 + flicker1 * 2, 7)
      .fill({ color: COLORS.FIRE_OUTER, alpha: 0.12 + flicker1 * 0.06 });

    this.campAnimationContainer
      .ellipse(campX, campY + 32, 8 + flicker1, 4)
      .fill({ color: COLORS.FIRE_OUTER, alpha: 0.9 });
    this.campAnimationContainer
      .ellipse(campX, campY + 30, 6 + flicker2 * 0.5, 3)
      .fill({ color: COLORS.FIRE_MIDDLE, alpha: 0.9 });
    this.campAnimationContainer
      .ellipse(campX, campY + 28, 4 + flicker3 * 0.3, 2)
      .fill({ color: COLORS.FIRE_INNER, alpha: 0.95 });
    this.campAnimationContainer
      .ellipse(campX, campY + 27, 2, 1)
      .fill({ color: COLORS.FIRE_CORE, alpha: 1 });

    // Ember sparks
    for (let i = 0; i < 3; i++) {
      const t = this.campAnimationTime * (2 + i) + i * 2;
      const ex = campX + Math.sin(t) * (4 + i * 2);
      const ey = campY + 26 - ((t * 8 + i * 10) % 18);
      this.campAnimationContainer
        .circle(ex, ey, 1)
        .fill({ color: COLORS.FIRE_MIDDLE, alpha: 0.5 + flicker2 * 0.3 });
    }

    // Soft pulsing string-light glow
    const lightPulse = 0.15 + Math.sin(this.campAnimationTime * 3) * 0.05;
    for (let i = -40; i <= 40; i += 16) {
      this.campAnimationContainer
        .circle(campX + i, campY - 8 + Math.abs(i) * 0.04, 5)
        .fill({ color: COLORS.CAMP_LIGHT_BULB, alpha: lightPulse });
    }

    this.renderAnimatedSurvivors(campX, campY);
  }

  private renderAnimatedSurvivors(campX: number, campY: number): void {
    const a = this.campAnimationContainer;
    const breathe = Math.sin(this.campAnimationTime * 2) * 0.3;
    const breathe2 = Math.sin(this.campAnimationTime * 2.3 + 1) * 0.3;
    const sway = Math.sin(this.campAnimationTime * 1.5) * 0.5;
    const headTurn = Math.sin(this.campAnimationTime * 0.8) * 1;
    const headTurn2 = Math.sin(this.campAnimationTime * 0.9 + 2) * 1;

    const drawSurvivor = (
      x: number,
      y: number,
      bodyColor: number,
      opts?: { weapon?: boolean; rifle?: boolean; armband?: boolean }
    ) => {
      a.ellipse(x, y + 10, 4, 2).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.25 });
      a.circle(x, y, 4).fill(COLORS.SURVIVOR_SKIN);
      a.roundRect(x - 3, y + 4, 6, 8, 1).fill(bodyColor);
      // Legs
      a.rect(x - 2.5, y + 11, 2, 4).fill(COLORS.CAMP_BOOTS);
      a.rect(x + 0.5, y + 11, 2, 4).fill(COLORS.CAMP_BOOTS);
      if (opts?.rifle) {
        a.rect(x - 0.5, y - 6, 1.2, 8).fill(COLORS.SURVIVOR_RIFLE);
      }
      if (opts?.weapon) {
        a.rect(x + 2, y + 2, 1.2, 6).fill(COLORS.SURVIVOR_WEAPON);
      }
      if (opts?.armband) {
        a.rect(x - 3, y + 6, 4, 2).fill(COLORS.SURVIVOR_ARMBAND);
      }
    };

    // Watchtower guard
    drawSurvivor(campX - 51 + headTurn2 * 0.5, campY - 38 + breathe * 0.1, COLORS.SURVIVOR_BROWN_CLOTHES, {
      rifle: true,
    });

    // Sitting by fire
    a.ellipse(campX - 18, campY + 42, 5, 2).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.2 });
    a.circle(campX - 18, campY + 36 + breathe * 0.2, 4).fill(COLORS.SURVIVOR_SKIN);
    a.roundRect(campX - 21, campY + 40, 6, 5 + breathe * 0.5, 1).fill(COLORS.SURVIVOR_BLUE_CLOTHES);

    // Standing guard
    drawSurvivor(campX + 25 + headTurn, campY + 18 + sway * 0.3, COLORS.SURVIVOR_BROWN_CLOTHES, {
      weapon: true,
    });

    // Working on crate
    const workBob = Math.abs(Math.sin(this.campAnimationTime * 3)) * 2;
    drawSurvivor(campX - 48, campY - 38 - workBob, COLORS.SURVIVOR_GRAY_CLOTHES);

    // Medic
    drawSurvivor(
      campX - 32 + headTurn * 0.3,
      campY - 28 + breathe2 * 0.15,
      COLORS.SURVIVOR_WHITE_CLOTHES,
      { armband: true }
    );
  }
}
