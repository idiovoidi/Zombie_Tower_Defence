import type { Graphics } from 'pixi.js';
import type { MapData } from '../../managers/MapManager';

/** Draws dead and pine trees clustered in the four corners of the map. */
export class TreeRenderer {
  private mapContainer: Graphics;

  constructor(mapContainer: Graphics) {
    this.mapContainer = mapContainer;
  }

  /**
   * Render trees around the corners of the map
   */
  public render(mapData: MapData): void {
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
}
