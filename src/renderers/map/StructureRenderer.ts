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
          // Boulders: ground shadow, shaded body, lit upper-left facet, cracks and moss
          const size = 7 + Math.random() * 11;
          const points = 5 + Math.floor(Math.random() * 3);
          const g = this.mapContainer;
          const outline: number[] = [];
          for (let j = 0; j < points; j++) {
            const angle = (j / points) * Math.PI * 2 + Math.random() * 0.3;
            const radius = size * (0.75 + Math.random() * 0.35);
            outline.push(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * 0.78);
          }
          const trace = (dx: number, dy: number, k: number): void => {
            g.moveTo(x + dx + (outline[0] - x) * k, y + dy + (outline[1] - y) * k);
            for (let j = 2; j < outline.length; j += 2) {
              g.lineTo(x + dx + (outline[j] - x) * k, y + dy + (outline[j + 1] - y) * k);
            }
            g.closePath();
          };
          g.ellipse(x + size * 0.3, y + size * 0.55, size * 1.05, size * 0.35).fill({
            color: 0x0a0f08,
            alpha: 0.3,
          });
          trace(0, 0, 1);
          g.fill(0x4e4e4a);
          g.stroke({ width: 1, color: 0x2e2e2a, alpha: 0.8 });
          trace(-size * 0.12, -size * 0.14, 0.7);
          g.fill({ color: 0x7a7a72, alpha: 0.85 });
          trace(-size * 0.2, -size * 0.22, 0.35);
          g.fill({ color: 0x9a9a90, alpha: 0.6 });
          g.moveTo(x + size * 0.1, y - size * 0.2)
            .lineTo(x + size * 0.25, y + size * 0.05)
            .lineTo(x + size * 0.15, y + size * 0.25)
            .stroke({ width: 0.8, color: 0x2e2e2a, alpha: 0.6 });
          if (size > 12 && Math.random() < 0.6) {
            g.ellipse(x + size * 0.2, y - size * 0.45, size * 0.4, size * 0.16).fill({
              color: 0x4a6a2a,
              alpha: 0.65,
            });
          }
        } else if (decorType < 0.7) {
          // Dead tree stumps: root flare, bark shading, cut top with growth rings
          const width = 6 + Math.random() * 5;
          const height = 8 + Math.random() * 7;
          const g = this.mapContainer;
          g.ellipse(x + 2, y + height, width * 0.95, width * 0.32).fill({
            color: 0x0a0f08,
            alpha: 0.3,
          });
          g.moveTo(x - width * 0.75, y + height)
            .lineTo(x - width * 0.4, y + height * 0.7)
            .lineTo(x - width / 2, y + 1)
            .lineTo(x + width / 2, y + 1)
            .lineTo(x + width * 0.4, y + height * 0.7)
            .lineTo(x + width * 0.75, y + height)
            .closePath()
            .fill(0x5a4630);
          g.moveTo(x + width * 0.1, y + 1)
            .lineTo(x + width * 0.4, y + height * 0.7)
            .lineTo(x + width * 0.75, y + height)
            .lineTo(x + width * 0.2, y + height)
            .closePath()
            .fill({ color: 0x2a1c10, alpha: 0.45 });
          g.ellipse(x, y + 1, width / 2, width * 0.22).fill(0x8a7048);
          g.ellipse(x, y + 1, width * 0.3, width * 0.12).stroke({
            width: 0.6,
            color: 0x5a4630,
            alpha: 0.8,
          });
          g.ellipse(x, y + 1, width * 0.12, width * 0.05).fill(0x5a4630);
          // Broken branch
          g.moveTo(x - width / 2, y + height * 0.4)
            .lineTo(x - width / 2 - 8, y + height * 0.25)
            .stroke({ width: 2, color: 0x5a4630 });
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
