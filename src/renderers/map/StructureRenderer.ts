import type { Graphics } from 'pixi.js';
import type { MapData } from '../../managers/MapManager';
import type { Waypoint } from '../../managers/PathfindingManager';
import { ensurePathGraph, pathGraphToSegments } from '../../path/pathGraph';
import { HouseRenderer } from './HouseRenderer';
import { TreeRenderer } from './TreeRenderer';

/**
 * StructureRenderer composes the map's structures:
 * - Destroyed houses (HouseRenderer)
 * - Corner trees (TreeRenderer)
 * - Decorative elements (bushes, rocks, stumps, grass, bones) drawn here
 */
export class StructureRenderer {
  private mapContainer: Graphics;
  private houses: HouseRenderer;
  private trees: TreeRenderer;

  constructor(mapContainer: Graphics) {
    this.mapContainer = mapContainer;
    this.houses = new HouseRenderer(mapContainer);
    this.trees = new TreeRenderer(mapContainer);
  }

  /**
   * Render all structures on the map
   */
  public render(mapData: MapData): void {
    this.houses.render(mapData);
    this.trees.render(mapData);
    this.renderDecorativeElements(mapData);
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
