import type { Graphics } from 'pixi.js';
import { COLORS } from '../../config/visualConstants';

/**
 * Static camp props: tents, sandbags, crates, watchtower, campfire pit, laundry,
 * signage, generator, picnic table, string lights, personal items and memorial.
 */
export class CampPropsRenderer {
  private pathGraphics: Graphics;

  constructor(pathGraphics: Graphics) {
    this.pathGraphics = pathGraphics;
  }

  public render(campX: number, campY: number): void {
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

    // Two crates beside the picnic table, clear of the sign, tents and fence
    drawCrate(campX + 19, campY + 6);
    drawCrate(campX + 33, campY + 6);
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
    g.roundRect(campX + 18, campY - 6, 5, 7, 1).fill(COLORS.CAMP_BOOTS);
    g.roundRect(campX + 25, campY - 6, 5, 7, 1).fill(COLORS.CAMP_BOOTS);
    g.rect(campX + 18, campY, 5, 1.5).fill(COLORS.CAMP_GROUND_DARK);
    g.rect(campX + 25, campY, 5, 1.5).fill(COLORS.CAMP_GROUND_DARK);
    // Guitar lying by the backpack
    g.ellipse(campX - 38, campY + 4, 6.5, 4.5).fill(COLORS.CAMP_GUITAR_BODY);
    g.rect(campX - 46, campY + 2.5, 8, 2).fill(COLORS.CAMP_GUITAR_NECK);
    g.circle(campX - 38, campY + 4, 1.5).fill({ color: COLORS.CAMP_GROUND_DARK, alpha: 0.5 });
    // Helmet on a crate
    g.ellipse(campX + 26, campY + 5, 4, 2.5).fill(COLORS.CAMP_FENCE);
    g.ellipse(campX + 26, campY + 4, 3, 1.5).fill(COLORS.CAMP_FENCE_BAR);
  }

  private renderMemorial(campX: number, campY: number): void {
    const g = this.pathGraphics;
    g.rect(campX + 58, campY + 40, 2.5, 12).fill(COLORS.CAMP_MEMORIAL_CROSS);
    g.rect(campX + 54, campY + 43, 10.5, 2.5).fill(COLORS.CAMP_MEMORIAL_CROSS);
    g.circle(campX + 59, campY + 53, 2.2).fill({ color: COLORS.CAMP_FLOWER_RED, alpha: 0.7 });
    g.circle(campX + 62, campY + 53, 2).fill({ color: COLORS.CAMP_FLOWER_YELLOW, alpha: 0.7 });
    g.circle(campX + 56, campY + 52, 1.5).fill({ color: 0xffffff, alpha: 0.5 });
  }
}
