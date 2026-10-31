import type { Graphics } from 'pixi.js';
import { COLORS } from '../../config/visualConstants';
import type { MapData } from '../../managers/MapManager';
import { createSeededRandom } from '../../utils/seededRandom';
import { HouseDetailRenderer, type HouseStyle } from './HouseDetailRenderer';

/**
 * Draws the ruined houses along the top edge of the map
 * (cottage / townhouse / farmhouse styles with collapse, rubble, soot and smoke).
 */
export class HouseRenderer {
  private mapContainer: Graphics;
  private details: HouseDetailRenderer;

  constructor(mapContainer: Graphics) {
    this.mapContainer = mapContainer;
    this.details = new HouseDetailRenderer(mapContainer);
  }

  /**
   * Render destroyed houses along the top of the map (spread across map width).
   */
  public render(mapData: MapData): void {
    const scaleX = mapData.width / 1024;
    const houses: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      destroyed: number;
      style: HouseStyle;
    }> = [
      { x: 120 * scaleX, y: 20, width: 75, height: 65, destroyed: 0.8, style: 'cottage' },
      { x: 280 * scaleX, y: 45, width: 85, height: 70, destroyed: 0.6, style: 'townhouse' },
      { x: 480 * scaleX, y: 15, width: 70, height: 60, destroyed: 0.9, style: 'cottage' },
      { x: 650 * scaleX, y: 35, width: 80, height: 68, destroyed: 0.7, style: 'farmhouse' },
      { x: 920 * scaleX, y: 50, width: 72, height: 62, destroyed: 0.75, style: 'cottage' },
    ];

    if (mapData.width > 1200) {
      houses.push({
        x: mapData.width - 160,
        y: 30,
        width: 78,
        height: 64,
        destroyed: 0.7,
        style: 'farmhouse',
      });
    }

    for (const house of houses) {
      this.renderDestroyedHouse(
        house.x,
        house.y,
        house.width,
        house.height,
        house.destroyed,
        house.style
      );
    }
  }

  /**
   * Render a single destroyed house with architectural style
   */
  private renderDestroyedHouse(
    x: number,
    y: number,
    width: number,
    height: number,
    destroyedLevel: number,
    style: HouseStyle = 'cottage'
  ): void {
    const rand = createSeededRandom(Math.floor(x * 97 + y * 53 + destroyedLevel * 1000));
    const wallHeight = height * (1 - destroyedLevel * 0.4);
    const wallThickness = style === 'townhouse' ? 6 : 5;
    const frontWallHeight = wallHeight * (style === 'townhouse' ? 0.92 : 0.88);
    const frontWallColor = COLORS.HOUSE_WALL;
    const backWallColor =
      style === 'townhouse' ? COLORS.HOUSE_WALL_TOWNHOUSE : COLORS.HOUSE_WALL_BACK;
    const sideWallColor = COLORS.HOUSE_WALL_SIDE;
    const foundationHeight = style === 'farmhouse' ? 8 : 6;
    const baseY = y + height;

    // Ground shadow for depth
    this.mapContainer
      .ellipse(x + width * 0.5, baseY + foundationHeight + 4, width * 0.55, 10)
      .fill({ color: COLORS.HOUSE_SHADOW, alpha: 0.28 });

    // Foundation
    this.mapContainer.rect(x - 2, baseY, width + 4, foundationHeight).fill(COLORS.HOUSE_FOUNDATION);
    this.mapContainer.stroke({ width: 1, color: COLORS.HOUSE_FOUNDATION_OUTLINE });

    for (let i = 0; i < 2; i++) {
      const crackX = x + width * (0.28 + i * 0.4);
      this.mapContainer
        .moveTo(crackX, baseY)
        .lineTo(crackX + (rand() - 0.5) * 5, baseY + foundationHeight)
        .stroke({ width: 1, color: COLORS.HOUSE_CRACK, alpha: 0.55 });
    }

    // Farmhouse porch steps
    if (style === 'farmhouse') {
      this.mapContainer.rect(x + width * 0.38, baseY + 1, width * 0.24, 4).fill(0x6a6a6a);
      this.mapContainer.rect(x + width * 0.4, baseY + 4, width * 0.2, 3).fill(0x5a5a5a);
    }

    // Interior floor visible through collapse gap
    this.mapContainer
      .rect(
        x + wallThickness,
        baseY - wallHeight * 0.85,
        width - wallThickness * 2,
        wallHeight * 0.7
      )
      .fill({ color: COLORS.HOUSE_INTERIOR, alpha: 0.85 });

    // Back wall
    this.drawJaggedWall(
      x,
      baseY - wallHeight,
      width,
      wallHeight,
      backWallColor,
      COLORS.HOUSE_WALL_OUTLINE,
      destroyedLevel,
      rand,
      0.35
    );

    // Left side wall
    if (destroyedLevel < 0.85) {
      const leftWallHeight = wallHeight * (1 - destroyedLevel * 0.25);
      this.drawJaggedWall(
        x,
        baseY - leftWallHeight,
        wallThickness,
        leftWallHeight,
        sideWallColor,
        COLORS.HOUSE_WALL_OUTLINE,
        destroyedLevel,
        rand,
        0.45
      );
    }

    // Right side wall (more damaged)
    if (destroyedLevel < 0.75) {
      const rightWallHeight = wallHeight * (1 - destroyedLevel * 0.4);
      this.drawJaggedWall(
        x + width - wallThickness,
        baseY - rightWallHeight,
        wallThickness,
        rightWallHeight,
        sideWallColor,
        COLORS.HOUSE_WALL_OUTLINE,
        destroyedLevel,
        rand,
        0.55
      );
    }

    // Front wall sections with doorway gap
    if (destroyedLevel < 0.8) {
      const leftSectionWidth = width * (style === 'cottage' ? 0.3 : 0.32);
      this.drawJaggedWall(
        x + wallThickness,
        baseY - frontWallHeight,
        leftSectionWidth,
        frontWallHeight,
        frontWallColor,
        COLORS.HOUSE_WALL_OUTLINE,
        destroyedLevel,
        rand,
        0.4
      );

      const rightSectionStart = x + width * (style === 'cottage' ? 0.66 : 0.63);
      const rightSectionWidth = x + width - wallThickness - rightSectionStart;
      this.drawJaggedWall(
        rightSectionStart,
        baseY - frontWallHeight,
        rightSectionWidth,
        frontWallHeight,
        frontWallColor,
        COLORS.HOUSE_WALL_OUTLINE,
        destroyedLevel,
        rand,
        0.5
      );

      if (style === 'townhouse' || style === 'farmhouse') {
        this.drawBrickTexture(
          x + wallThickness,
          x + wallThickness + leftSectionWidth,
          baseY - frontWallHeight,
          frontWallHeight,
          style === 'townhouse' ? 6 : 4
        );
        this.drawBrickTexture(
          rightSectionStart,
          rightSectionStart + rightSectionWidth,
          baseY - frontWallHeight,
          frontWallHeight,
          style === 'townhouse' ? 6 : 4
        );
      }

      // Moss patches on lower walls
      for (let i = 0; i < 3; i++) {
        const mx = x + width * (0.15 + rand() * 0.7);
        const my = baseY - 6 - rand() * 10;
        this.mapContainer
          .ellipse(mx, my, 4 + rand() * 4, 2 + rand() * 2)
          .fill({ color: COLORS.HOUSE_MOSS, alpha: 0.35 + rand() * 0.2 });
      }
    }

    // Style accents
    if (style === 'cottage' || style === 'farmhouse') {
      this.details.drawChimney(x, baseY, width, wallHeight, destroyedLevel, style, rand);
    }
    if (style === 'farmhouse' && destroyedLevel < 0.85) {
      // Collapsed porch posts
      const postY = baseY - frontWallHeight * 0.55;
      this.mapContainer
        .rect(x + width * 0.22, postY, 3, frontWallHeight * 0.55)
        .fill(COLORS.HOUSE_DOOR);
      this.mapContainer
        .moveTo(x + width * 0.78, postY)
        .lineTo(x + width * 0.82, baseY - 2)
        .stroke({ width: 3, color: COLORS.HOUSE_DOOR });
    }

    // Collapsed roof with exposed beams
    if (destroyedLevel < 0.92) {
      this.details.drawCollapsedRoof(
        x,
        baseY,
        width,
        wallHeight,
        wallThickness,
        destroyedLevel,
        style,
        rand
      );
    }

    // Windows
    if (destroyedLevel < 0.75) {
      this.details.drawBrokenWindow(
        x + width * 0.16,
        baseY - frontWallHeight * 0.68,
        style === 'townhouse' ? 14 : 15,
        style === 'townhouse' ? 18 : 18,
        rand
      );
      if (destroyedLevel < 0.7 && style !== 'cottage') {
        this.details.drawBrokenWindow(
          x + width * 0.7,
          baseY - frontWallHeight * 0.68,
          14,
          style === 'townhouse' ? 16 : 18,
          rand
        );
      }
      if (style === 'townhouse' && destroyedLevel < 0.65) {
        // Upper story hint
        this.details.drawBrokenWindow(
          x + width * 0.4,
          baseY - frontWallHeight * 0.92,
          12,
          12,
          rand
        );
      }
    }

    // Door
    if (destroyedLevel < 0.8) {
      this.details.drawBrokenDoor(x, baseY, width, frontWallHeight, destroyedLevel);
    }

    // Rubble & debris
    this.details.drawHouseRubble(x, baseY, width, destroyedLevel, frontWallColor, rand);

    // Burn marks & soot
    if (destroyedLevel > 0.6) {
      this.details.drawBurnMarks(x, baseY, width, wallHeight, destroyedLevel, rand);
    }

    // Residual smoke
    if (destroyedLevel > 0.75) {
      const smokeX = x + width * 0.5;
      const smokeBaseY = baseY - wallHeight - 8;
      for (let i = 0; i < 5; i++) {
        const sx = smokeX + (rand() - 0.5) * 18;
        const sy = smokeBaseY - i * 11;
        const smokeSize = 5 + i * 1.3;
        const drift = Math.sin(i * 0.7) * 7;
        this.mapContainer
          .ellipse(sx + drift, sy, smokeSize * 1.3, smokeSize * 0.85)
          .fill({ color: COLORS.HOUSE_SMOKE, alpha: 0.38 - i * 0.06 });
      }
    }

    // Wall cracks
    if (destroyedLevel > 0.5) {
      for (let i = 0; i < 3; i++) {
        const crackX = x + width * (0.18 + i * 0.28);
        const crackY = baseY - wallHeight;
        this.mapContainer
          .moveTo(crackX, crackY + 2)
          .lineTo(crackX + (rand() - 0.5) * 10, crackY + wallHeight * (0.45 + rand() * 0.25))
          .lineTo(crackX + (rand() - 0.5) * 6, crackY + wallHeight * 0.75)
          .stroke({ width: 1.5, color: COLORS.HOUSE_CRACK, alpha: 0.55 });
      }
    }

    // Impact marks
    if (destroyedLevel > 0.6) {
      for (let i = 0; i < 5; i++) {
        const holeX = x + wallThickness + rand() * (width - wallThickness * 2);
        const holeY = baseY - wallHeight * (0.2 + rand() * 0.7);
        const holeSize = 1.5 + rand() * 2;
        this.mapContainer
          .circle(holeX, holeY, holeSize)
          .fill({ color: COLORS.HOUSE_BURN_MARK, alpha: 0.75 });
        for (let j = 0; j < 3; j++) {
          const angle = (j / 3) * Math.PI * 2 + rand();
          const crackLength = 3 + rand() * 3;
          this.mapContainer
            .moveTo(holeX, holeY)
            .lineTo(holeX + Math.cos(angle) * crackLength, holeY + Math.sin(angle) * crackLength)
            .stroke({ width: 1, color: COLORS.HOUSE_CRACK, alpha: 0.45 });
        }
      }
    }
  }

  private drawJaggedWall(
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number,
    strokeColor: number,
    destroyedLevel: number,
    rand: () => number,
    jagStrength: number
  ): void {
    const topPoints = 4 + Math.floor(destroyedLevel * 3);
    const path: number[] = [x, y + height, x, y];

    for (let i = 0; i <= topPoints; i++) {
      const t = i / topPoints;
      const px = x + t * width;
      const dip = destroyedLevel * jagStrength * height * (0.08 + rand() * 0.18);
      const py = y + (i === 0 || i === topPoints ? rand() * dip * 0.4 : dip);
      path.push(px, py);
    }
    path.push(x + width, y + height);

    this.mapContainer.poly(path).fill(fillColor);
    this.mapContainer.poly(path).stroke({ width: 1.5, color: strokeColor });
  }

  private drawBrickTexture(
    startX: number,
    endX: number,
    startY: number,
    sectionHeight: number,
    rowCount: number
  ): void {
    for (let i = 1; i < rowCount; i++) {
      const lineY = startY + (i * sectionHeight) / rowCount;
      this.mapContainer
        .moveTo(startX + 1, lineY)
        .lineTo(endX - 1, lineY)
        .stroke({ width: 1, color: COLORS.HOUSE_BRICK_LINE, alpha: 0.35 });
      // Offset vertical mortar marks
      const brickWidth = 8;
      const offset = i % 2 === 0 ? 0 : brickWidth / 2;
      for (let bx = startX + offset; bx < endX - 2; bx += brickWidth) {
        this.mapContainer
          .moveTo(bx, lineY)
          .lineTo(bx, lineY + sectionHeight / rowCount)
          .stroke({ width: 1, color: COLORS.HOUSE_BRICK_LINE, alpha: 0.22 });
      }
    }
  }
}
