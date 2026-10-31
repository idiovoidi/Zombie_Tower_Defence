import type { Graphics } from 'pixi.js';
import { COLORS } from '../../config/visualConstants';
import type { MapData } from '../../managers/MapManager';
import type { Waypoint } from '../../managers/PathfindingManager';
import { ensurePathGraph, pathGraphToSegments } from '../../path/pathGraph';
import { createSeededRandom } from '../../utils/seededRandom';

type HouseStyle = 'cottage' | 'townhouse' | 'farmhouse';

/**
 * StructureRenderer handles all structure rendering including:
 * - Destroyed houses
 * - Trees (dead and pine)
 * - Decorative elements (bushes, rocks, stumps, grass, bones)
 */
export class StructureRenderer {
  private mapContainer: Graphics;

  constructor(mapContainer: Graphics) {
    this.mapContainer = mapContainer;
  }

  /**
   * Render all structures on the map
   */
  public render(mapData: MapData): void {
    this.renderDestroyedHouses(mapData);
    this.renderCornerTrees(mapData);
    this.renderDecorativeElements(mapData);
  }

  /**
   * Render destroyed houses along the top of the map (spread across map width).
   */
  private renderDestroyedHouses(mapData: MapData): void {
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
      this.drawChimney(x, baseY, width, wallHeight, destroyedLevel, style, rand);
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
      this.drawCollapsedRoof(
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
      this.drawBrokenWindow(
        x + width * 0.16,
        baseY - frontWallHeight * 0.68,
        style === 'townhouse' ? 14 : 15,
        style === 'townhouse' ? 18 : 18,
        rand
      );
      if (destroyedLevel < 0.7 && style !== 'cottage') {
        this.drawBrokenWindow(
          x + width * 0.7,
          baseY - frontWallHeight * 0.68,
          14,
          style === 'townhouse' ? 16 : 18,
          rand
        );
      }
      if (style === 'townhouse' && destroyedLevel < 0.65) {
        // Upper story hint
        this.drawBrokenWindow(x + width * 0.4, baseY - frontWallHeight * 0.92, 12, 12, rand);
      }
    }

    // Door
    if (destroyedLevel < 0.8) {
      this.drawBrokenDoor(x, baseY, width, frontWallHeight, destroyedLevel);
    }

    // Rubble & debris
    this.drawHouseRubble(x, baseY, width, destroyedLevel, frontWallColor, rand);

    // Burn marks & soot
    if (destroyedLevel > 0.6) {
      this.drawBurnMarks(x, baseY, width, wallHeight, destroyedLevel, rand);
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

  private drawChimney(
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

  private drawCollapsedRoof(
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

  private drawBrokenWindow(
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

  private drawBrokenDoor(
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

  private drawHouseRubble(
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

  private drawBurnMarks(
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

  /**
   * Render trees around the corners of the map
   */
  private renderCornerTrees(mapData: MapData): void {
    // Top-left corner trees
    this.renderTree(80, 80, 35, 'dead');
    this.renderTree(120, 60, 28, 'dead');
    this.renderTree(50, 120, 32, 'dead');

    // Top-right corner trees
    this.renderTree(mapData.width - 80, 80, 38, 'pine');
    this.renderTree(mapData.width - 120, 50, 30, 'pine');
    this.renderTree(mapData.width - 50, 110, 35, 'dead');

    // Bottom-left corner trees
    this.renderTree(70, mapData.height - 80, 40, 'dead');
    this.renderTree(110, mapData.height - 60, 32, 'pine');
    this.renderTree(40, mapData.height - 120, 36, 'dead');

    // Bottom-right corner trees
    this.renderTree(mapData.width - 90, mapData.height - 70, 42, 'pine');
    this.renderTree(mapData.width - 60, mapData.height - 110, 35, 'dead');
    this.renderTree(mapData.width - 130, mapData.height - 90, 38, 'pine');
  }

  /**
   * Render a single tree (dead or pine)
   */
  private renderTree(x: number, y: number, height: number, type: 'dead' | 'pine'): void {
    if (type === 'dead') {
      // Dead/bare tree
      const trunkWidth = height * 0.15;
      const trunkHeight = height * 0.6;

      // Trunk
      this.mapContainer.rect(x - trunkWidth / 2, y, trunkWidth, trunkHeight).fill(0x4a3a2a);
      this.mapContainer
        .rect(x - trunkWidth / 2, y, trunkWidth, trunkHeight)
        .stroke({ width: 1, color: 0x2a1a1a });

      // Bark texture
      for (let i = 0; i < 4; i++) {
        const barkY = y + (i / 4) * trunkHeight;
        this.mapContainer
          .moveTo(x - trunkWidth / 2, barkY)
          .lineTo(x + trunkWidth / 2, barkY)
          .stroke({ width: 1, color: 0x3a2a1a, alpha: 0.5 });
      }

      // Bare branches
      const branchCount = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < branchCount; i++) {
        const branchY = y + trunkHeight * (0.2 + (i / branchCount) * 0.6);
        const branchLength = height * (0.3 + Math.random() * 0.2);
        const branchAngle = (Math.random() - 0.5) * 0.8;
        const side = i % 2 === 0 ? 1 : -1;

        const endX = x + side * Math.cos(branchAngle) * branchLength;
        const endY = branchY - Math.sin(Math.abs(branchAngle)) * branchLength * 0.5;

        this.mapContainer
          .moveTo(x, branchY)
          .lineTo(endX, endY)
          .stroke({ width: 2 + Math.random(), color: 0x4a3a2a });

        // Small twigs
        if (Math.random() > 0.5) {
          const twigLength = branchLength * 0.3;
          const twigAngle = branchAngle + (Math.random() - 0.5) * 0.5;
          const twigEndX = endX + Math.cos(twigAngle) * twigLength;
          const twigEndY = endY - Math.sin(Math.abs(twigAngle)) * twigLength * 0.5;
          this.mapContainer
            .moveTo(endX, endY)
            .lineTo(twigEndX, twigEndY)
            .stroke({ width: 1, color: 0x4a3a2a, alpha: 0.8 });
        }
      }

      // Shadow
      this.mapContainer
        .ellipse(x, y + trunkHeight, trunkWidth * 1.5, trunkWidth * 0.8)
        .fill({ color: 0x1a1a1a, alpha: 0.3 });
    } else {
      // Pine/evergreen tree
      const trunkWidth = height * 0.12;
      const trunkHeight = height * 0.4;

      // Trunk
      this.mapContainer.rect(x - trunkWidth / 2, y, trunkWidth, trunkHeight).fill(0x5a4a3a);
      this.mapContainer
        .rect(x - trunkWidth / 2, y, trunkWidth, trunkHeight)
        .stroke({ width: 1, color: 0x3a2a1a });

      // Pine foliage (triangular layers)
      const foliageLayers = 4;
      for (let i = 0; i < foliageLayers; i++) {
        const layerY = y - height * 0.15 - i * height * 0.15;
        const layerWidth = height * (0.6 - i * 0.1);
        const layerHeight = height * 0.2;

        // Triangle for pine layer
        this.mapContainer
          .moveTo(x, layerY)
          .lineTo(x - layerWidth / 2, layerY + layerHeight)
          .lineTo(x + layerWidth / 2, layerY + layerHeight)
          .lineTo(x, layerY)
          .fill({ color: 0x2a4a2a, alpha: 0.9 });

        // Darker outline
        this.mapContainer
          .moveTo(x, layerY)
          .lineTo(x - layerWidth / 2, layerY + layerHeight)
          .lineTo(x + layerWidth / 2, layerY + layerHeight)
          .lineTo(x, layerY)
          .stroke({ width: 1, color: 0x1a3a1a });

        // Texture details
        for (let j = 0; j < 3; j++) {
          const detailX = x + (Math.random() - 0.5) * layerWidth * 0.6;
          const detailY = layerY + layerHeight * (0.3 + Math.random() * 0.5);
          this.mapContainer.circle(detailX, detailY, 2).fill({ color: 0x1a3a1a, alpha: 0.6 });
        }
      }

      // Shadow
      this.mapContainer
        .ellipse(x, y + trunkHeight, height * 0.4, height * 0.15)
        .fill({ color: 0x1a1a1a, alpha: 0.3 });
    }
  }

  /**
   * Render decorative elements (bushes, rocks, stumps, grass, bones)
   */
  private renderDecorativeElements(mapData: MapData): void {
    const referenceArea = 1024 * 768;
    const areaScale = (mapData.width * mapData.height) / referenceArea;
    const decorCount = Math.max(25, Math.round(25 * areaScale));

    // Add apocalyptic decorative elements with organic shapes
    for (let i = 0; i < decorCount; i++) {
      const x = 20 + Math.random() * Math.max(1, mapData.width - 40);
      const y = 20 + Math.random() * Math.max(1, mapData.height - 40);

      // Only place decorations away from the path and not at the top (where houses are)
      if (y > 150 && this.isAwayFromPath(x, y, mapData)) {
        const decorType = Math.random();

        if (decorType < 0.3) {
          // Dead bushes/shrubs (organic blob shapes)
          const size = 10 + Math.random() * 15;
          const points = 6 + Math.floor(Math.random() * 4);

          this.mapContainer.moveTo(x, y);
          for (let j = 0; j < points; j++) {
            const angle = (j / points) * Math.PI * 2;
            const radius = size * (0.6 + Math.random() * 0.6);
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            this.mapContainer.lineTo(px, py);
          }
          this.mapContainer.fill({ color: 0x4a3a2a, alpha: 0.7 });
        } else if (decorType < 0.5) {
          // Rocks/debris (irregular polygons)
          const size = 8 + Math.random() * 12;
          const points = 4 + Math.floor(Math.random() * 3);

          this.mapContainer.moveTo(x, y);
          for (let j = 0; j < points; j++) {
            const angle = (j / points) * Math.PI * 2 + Math.random() * 0.3;
            const radius = size * (0.7 + Math.random() * 0.5);
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            this.mapContainer.lineTo(px, py);
          }
          this.mapContainer.fill(0x6a6a6a);
          this.mapContainer.stroke({ width: 1, color: 0x4a4a4a });
        } else if (decorType < 0.7) {
          // Dead tree stumps (organic trunk shape)
          const width = 5 + Math.random() * 4;
          const height = 10 + Math.random() * 8;

          // Irregular trunk
          this.mapContainer
            .moveTo(x - width / 2, y + height)
            .lineTo(x - width / 2 - 1, y + height * 0.6)
            .lineTo(x - width / 2, y + height * 0.3)
            .lineTo(x, y)
            .lineTo(x + width / 2, y + height * 0.3)
            .lineTo(x + width / 2 + 1, y + height * 0.6)
            .lineTo(x + width / 2, y + height)
            .fill(0x5a4a3a);

          // Broken branch
          this.mapContainer
            .moveTo(x, y + height * 0.4)
            .lineTo(x - 10, y + height * 0.3)
            .stroke({ width: 2, color: 0x5a4a3a });
        } else {
          // Withered grass patches (organic clumps)
          const size = 12 + Math.random() * 18;
          const points = 8 + Math.floor(Math.random() * 5);

          this.mapContainer.moveTo(x, y);
          for (let j = 0; j < points; j++) {
            const angle = (j / points) * Math.PI * 2;
            const radius = size * (0.5 + Math.random() * 0.7);
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            this.mapContainer.lineTo(px, py);
          }
          this.mapContainer.fill({ color: 0x3a4a2a, alpha: 0.6 });
        }
      }
    }

    // Add some scattered bones/skulls for extra apocalyptic feel
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * mapData.width;
      const y = Math.random() * mapData.height;

      if (y > 150 && this.isAwayFromPath(x, y, mapData)) {
        // Small skull (slightly irregular)
        this.mapContainer
          .moveTo(x - 4, y)
          .lineTo(x - 3, y - 3)
          .lineTo(x, y - 4)
          .lineTo(x + 3, y - 3)
          .lineTo(x + 4, y)
          .lineTo(x + 3, y + 3)
          .lineTo(x - 3, y + 3)
          .fill(0xf5f5dc);
        this.mapContainer.circle(x - 2, y - 1, 1.5).fill(0x1a1a1a); // Eye socket
        this.mapContainer.circle(x + 2, y - 1, 1.5).fill(0x1a1a1a); // Eye socket
      }
    }
  }

  /**
   * Check if a point is away from all path segments (including branches).
   */
  private isAwayFromPath(x: number, y: number, mapData: MapData): boolean {
    const segments = pathGraphToSegments(ensurePathGraph(mapData));
    if (segments.length === 0) {
      return this.isAwayFromPolyline(x, y, mapData.waypoints);
    }
    for (const seg of segments) {
      const distance = this.distanceToLineSegment(x, y, seg.a.x, seg.a.y, seg.b.x, seg.b.y);
      if (distance < 50) {
        return false;
      }
    }
    return true;
  }

  private isAwayFromPolyline(x: number, y: number, waypoints: Waypoint[]): boolean {
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const distance = this.distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
      if (distance < 50) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate distance from a point to a line segment
   */
  private distanceToLineSegment(
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx: number;
    let yy: number;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
