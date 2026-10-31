import type { Graphics } from 'pixi.js';
import { COLORS } from '../../config/visualConstants';

export type HouseStyle = 'cottage' | 'townhouse' | 'farmhouse';

/**
 * Props and weathering for a ruined house: chimney, collapsed roof, broken
 * windows and door, rubble and burn marks. Called by HouseRenderer.
 */
export class HouseDetailRenderer {
  private mapContainer: Graphics;

  constructor(mapContainer: Graphics) {
    this.mapContainer = mapContainer;
  }

  public drawChimney(
    x: number,
    baseY: number,
    width: number,
    wallHeight: number,
    destroyedLevel: number,
    style: HouseStyle,
    rand: () => number
  ): void {
    const chimneyW = style === 'farmhouse' ? 10 : 8;
    const chimneyH = 14 + (1 - destroyedLevel) * 10;
    const cx = x + width * (style === 'farmhouse' ? 0.78 : 0.72);
    const cy = baseY - wallHeight - chimneyH * 0.35;

    this.mapContainer.rect(cx, cy, chimneyW, chimneyH).fill(COLORS.HOUSE_CHIMNEY);
    this.mapContainer.stroke({ width: 1, color: COLORS.HOUSE_WALL_OUTLINE });
    // Broken top
    this.mapContainer
      .moveTo(cx, cy)
      .lineTo(cx + chimneyW * 0.35, cy - 3)
      .lineTo(cx + chimneyW * 0.7, cy + 1)
      .lineTo(cx + chimneyW, cy - 2)
      .stroke({ width: 2, color: COLORS.HOUSE_CHIMNEY_SOOT });
    this.mapContainer
      .ellipse(cx + chimneyW / 2, cy + 2, chimneyW * 0.35, 2)
      .fill({ color: COLORS.HOUSE_CHIMNEY_SOOT, alpha: 0.7 });
    // Fallen bricks near chimney
    for (let i = 0; i < 2; i++) {
      this.mapContainer
        .rect(cx + chimneyW + 2 + i * 5, baseY - wallHeight + rand() * 8, 4, 3)
        .fill(COLORS.HOUSE_CHIMNEY);
    }
  }

  public drawCollapsedRoof(
    x: number,
    baseY: number,
    width: number,
    wallHeight: number,
    wallThickness: number,
    destroyedLevel: number,
    style: HouseStyle,
    rand: () => number
  ): void {
    const roofColor = style === 'farmhouse' ? COLORS.HOUSE_ROOF_FARM : COLORS.HOUSE_ROOF;
    const roofPeakHeight = style === 'townhouse' ? 16 : style === 'farmhouse' ? 14 : 11;
    const roofTop = baseY - wallHeight;

    // Exposed rafters under sagging roof
    for (let i = 0; i < 3; i++) {
      const bx = x + width * (0.25 + i * 0.2);
      this.mapContainer
        .moveTo(bx, roofTop + 4)
        .lineTo(bx + (rand() - 0.5) * 8, roofTop - roofPeakHeight * (0.4 + rand() * 0.3))
        .stroke({ width: 2, color: COLORS.HOUSE_ROOF_BEAM, alpha: 0.7 });
    }

    this.mapContainer
      .moveTo(x + wallThickness, roofTop)
      .lineTo(x + width * 0.32, roofTop - roofPeakHeight)
      .lineTo(x + width * 0.55, roofTop - roofPeakHeight * 0.55)
      .lineTo(x + width * 0.78, roofTop + 4)
      .lineTo(x + width - wallThickness, roofTop + wallHeight * 0.35)
      .lineTo(x + wallThickness + 4, roofTop + 8)
      .fill({ color: roofColor, alpha: 0.92 });
    this.mapContainer.stroke({ width: 2, color: COLORS.HOUSE_WALL_OUTLINE });

    // Shingle / board lines
    for (let i = 0; i < 4; i++) {
      const lineY = roofTop - roofPeakHeight * 0.75 + i * 4;
      this.mapContainer
        .moveTo(x + width * 0.3, lineY)
        .lineTo(x + width * 0.72, lineY + 3)
        .stroke({ width: 1, color: 0x6a3a2a, alpha: 0.45 });
    }

    if (destroyedLevel > 0.65) {
      const holeX = x + width * 0.52;
      const holeY = roofTop - roofPeakHeight * 0.35;
      this.mapContainer
        .moveTo(holeX, holeY)
        .lineTo(holeX + 9, holeY + 2)
        .lineTo(holeX + 7, holeY + 9)
        .lineTo(holeX - 3, holeY + 7)
        .fill({ color: COLORS.HOUSE_INTERIOR, alpha: 0.85 });
    }
  }

  public drawBrokenWindow(
    x: number,
    y: number,
    windowWidth: number,
    windowHeight: number,
    rand: () => number
  ): void {
    this.mapContainer
      .rect(x - 2, y - 2, windowWidth + 4, windowHeight + 4)
      .fill(COLORS.HOUSE_WINDOW_FRAME);
    this.mapContainer.rect(x, y, windowWidth, windowHeight).fill(COLORS.HOUSE_WINDOW);

    // Pane divider
    this.mapContainer
      .moveTo(x + windowWidth / 2, y)
      .lineTo(x + windowWidth / 2, y + windowHeight)
      .stroke({ width: 2, color: COLORS.HOUSE_WINDOW_FRAME });
    this.mapContainer
      .moveTo(x, y + windowHeight / 2)
      .lineTo(x + windowWidth, y + windowHeight / 2)
      .stroke({ width: 2, color: COLORS.HOUSE_WINDOW_FRAME });

    // Glass shards
    for (let i = 0; i < 3; i++) {
      const sx = x + rand() * windowWidth;
      const sy = y + rand() * windowHeight;
      this.mapContainer
        .moveTo(sx, sy)
        .lineTo(sx + 3 + rand() * 4, sy + rand() * 5)
        .lineTo(sx - 1 + rand() * 3, sy + 4 + rand() * 4)
        .fill({ color: COLORS.HOUSE_WINDOW_GLASS, alpha: 0.35 + rand() * 0.25 });
    }
  }

  public drawBrokenDoor(
    x: number,
    baseY: number,
    width: number,
    frontWallHeight: number,
    destroyedLevel: number
  ): void {
    const doorX = x + width * 0.42;
    const doorY = baseY - frontWallHeight * 0.82;
    const doorWidth = 18;
    const doorHeight = frontWallHeight * 0.72;
    const tiltOffset = destroyedLevel > 0.7 ? 7 : 3;

    this.mapContainer
      .rect(doorX - 3, doorY - 2, doorWidth + 6, doorHeight + 2)
      .fill(COLORS.HOUSE_DOOR_FRAME);
    this.mapContainer.stroke({ width: 1, color: 0x3a2a1a });

    // Dark interior behind ajar door
    this.mapContainer
      .rect(doorX, doorY, doorWidth, doorHeight)
      .fill({ color: COLORS.HOUSE_INTERIOR, alpha: 0.95 });

    this.mapContainer
      .moveTo(doorX, doorY)
      .lineTo(doorX + doorWidth, doorY + tiltOffset)
      .lineTo(doorX + doorWidth - 3, doorY + doorHeight)
      .lineTo(doorX - 3, doorY + doorHeight - tiltOffset)
      .fill(COLORS.HOUSE_DOOR);
    this.mapContainer.stroke({ width: 2, color: COLORS.HOUSE_DOOR_FRAME });

    for (let i = 1; i < 3; i++) {
      const plankX = doorX + (i * doorWidth) / 3;
      this.mapContainer
        .moveTo(plankX, doorY)
        .lineTo(plankX + (i * tiltOffset) / 3, doorY + doorHeight - tiltOffset)
        .stroke({ width: 1, color: COLORS.HOUSE_DOOR_PLANK, alpha: 0.65 });
    }

    if (destroyedLevel < 0.75) {
      this.mapContainer
        .circle(doorX + doorWidth * 0.78, doorY + doorHeight * 0.5, 2)
        .fill(0x3a3a3a);
    }
  }

  public drawHouseRubble(
    x: number,
    baseY: number,
    width: number,
    destroyedLevel: number,
    frontWallColor: number,
    rand: () => number
  ): void {
    const rubbleCount = Math.floor(12 + destroyedLevel * 16);
    const rubbleColors = [
      COLORS.HOUSE_RUBBLE_DARK,
      COLORS.HOUSE_RUBBLE_MID,
      COLORS.HOUSE_RUBBLE,
      0x696969,
    ];

    for (let i = 0; i < rubbleCount; i++) {
      const rx = x - 6 + rand() * (width + 12);
      const ry = baseY + 5 + rand() * 16;
      const size = 3 + rand() * 7;
      const points = 3 + Math.floor(rand() * 4);
      const rubblePath: number[] = [];
      for (let j = 0; j < points; j++) {
        const angle = (j / points) * Math.PI * 2 + rand() * 0.35;
        const radius = size * (0.55 + rand() * 0.65);
        rubblePath.push(rx + Math.cos(angle) * radius, ry + Math.sin(angle) * radius);
      }

      if (size > 5) {
        this.mapContainer
          .ellipse(rx + 1, ry + size * 0.45, size * 0.75, size * 0.35)
          .fill({ color: COLORS.HOUSE_SHADOW, alpha: 0.25 });
      }
      this.mapContainer
        .poly(rubblePath)
        .fill(rubbleColors[Math.floor(rand() * rubbleColors.length)]);
    }

    if (destroyedLevel > 0.7) {
      for (let i = 0; i < 3; i++) {
        const debrisX = x + width * (0.18 + i * 0.28);
        const debrisY = baseY + 7 + rand() * 4;
        this.mapContainer
          .rect(debrisX, debrisY, 7 + rand() * 6, 3 + rand() * 4)
          .fill(frontWallColor);
        this.mapContainer.stroke({ width: 1, color: COLORS.HOUSE_WALL_OUTLINE });
      }
    }
  }

  public drawBurnMarks(
    x: number,
    baseY: number,
    width: number,
    wallHeight: number,
    destroyedLevel: number,
    rand: () => number
  ): void {
    const burnX1 = x + width * 0.25;
    const burnY1 = baseY - wallHeight * 0.55;
    for (let i = 0; i < 6; i++) {
      this.mapContainer
        .ellipse(
          burnX1 + (rand() - 0.5) * 14,
          burnY1 + (rand() - 0.5) * 14,
          8 + rand() * 10,
          6 + rand() * 8
        )
        .fill({ color: COLORS.HOUSE_BURN_MARK, alpha: 0.32 - i * 0.03 });
    }

    if (destroyedLevel > 0.7) {
      const burnX2 = x + width * 0.72;
      const burnY2 = baseY - wallHeight * 0.38;
      for (let i = 0; i < 4; i++) {
        this.mapContainer
          .ellipse(
            burnX2 + (rand() - 0.5) * 12,
            burnY2 + (rand() - 0.5) * 10,
            6 + rand() * 7,
            4 + rand() * 6
          )
          .fill({ color: COLORS.HOUSE_BURN_MARK, alpha: 0.28 - i * 0.04 });
      }
    }

    for (let i = 0; i < 3; i++) {
      const streakX = x + width * (0.2 + rand() * 0.55);
      const streakY = baseY - wallHeight * (0.35 + rand() * 0.35);
      this.mapContainer
        .moveTo(streakX, streakY)
        .lineTo(streakX + (rand() - 0.5) * 3, streakY + 12 + rand() * 12)
        .stroke({ width: 2 + rand() * 2, color: COLORS.HOUSE_CRACK, alpha: 0.4 });
    }
  }
}
