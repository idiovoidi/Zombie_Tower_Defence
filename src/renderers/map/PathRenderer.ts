import type { Graphics } from 'pixi.js';
import { COLORS, PATH } from '../../config/visualConstants';
import type { MapData } from '../../managers/MapManager';
import type { Waypoint } from '../../managers/PathfindingManager';
import { ensurePathGraph, pathGraphToSegments } from '../../path/pathGraph';
import { createSeededRandom, hashString } from '../../utils/seededRandom';

/**
 * PathRenderer
 *
 * Layered worn dirt road:
 * - Soft grass/dirt shoulder blend
 * - Dark packed border
 * - Main dirt surface + lighter scuffs
 * - Packed center bed + dual ruts
 * - Seeded mottling, pebbles, footprints, mud, cracks
 * - Organic edge blobs
 *
 * Supports branching graphs by stroking every edge segment.
 */
export class PathRenderer {
  private graphics: Graphics;
  private rand: () => number = Math.random;

  constructor(graphics: Graphics) {
    this.graphics = graphics;
  }

  public render(mapData: MapData): void {
    const polylines = this.getPathPolylines(mapData);
    if (polylines.length === 0) {
      return;
    }

    this.rand = createSeededRandom(
      hashString(mapData.name) ^ (mapData.width * 17 + mapData.height * 41 + 0x50a7)
    );

    const pathWidth = PATH.WIDTH;

    for (const line of polylines) {
      this.renderShoulder(line, pathWidth);
    }
    for (const line of polylines) {
      this.renderPathBorder(line, pathWidth);
    }
    for (const line of polylines) {
      this.renderMainPath(line, pathWidth);
    }
    for (const line of polylines) {
      this.renderSurfaceScuffs(line, pathWidth);
    }
    for (const line of polylines) {
      this.renderCenterTrack(line, pathWidth);
    }
    for (const line of polylines) {
      this.renderTireTracks(line, pathWidth);
    }
    for (const line of polylines) {
      this.renderPathTexture(line, pathWidth);
    }
    for (const line of polylines) {
      this.renderEdgeDetail(line, pathWidth);
    }
    for (const line of polylines) {
      this.renderEdgeWear(line, pathWidth);
    }
  }

  /** Each graph edge as a 2-point polyline (or legacy single polyline). */
  private getPathPolylines(mapData: MapData): Waypoint[][] {
    const graph = ensurePathGraph(mapData);
    const segments = pathGraphToSegments(graph);
    if (segments.length > 0) {
      return segments.map(seg => [seg.a, seg.b]);
    }
    if (mapData.waypoints.length >= 2) {
      return [mapData.waypoints];
    }
    return [];
  }

  private drawPathLine(waypoints: Waypoint[], cornerRadius: number): void {
    this.graphics.moveTo(waypoints[0].x, waypoints[0].y);

    for (let i = 0; i < waypoints.length; i++) {
      const prev = i > 0 ? waypoints[i - 1] : null;
      const curr = waypoints[i];
      const next = i < waypoints.length - 1 ? waypoints[i + 1] : null;

      if (!prev) {
        this.graphics.moveTo(curr.x, curr.y);
      } else if (!next) {
        this.graphics.lineTo(curr.x, curr.y);
      } else {
        const v1x = curr.x - prev.x;
        const v1y = curr.y - prev.y;
        const v2x = next.x - curr.x;
        const v2y = next.y - curr.y;

        const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

        const n1x = v1x / len1;
        const n1y = v1y / len1;
        const n2x = v2x / len2;
        const n2y = v2y / len2;

        const curveStart = Math.min(cornerRadius, len1 / 2);
        const curveEnd = Math.min(cornerRadius, len2 / 2);

        const startX = curr.x - n1x * curveStart;
        const startY = curr.y - n1y * curveStart;
        const endX = curr.x + n2x * curveEnd;
        const endY = curr.y + n2y * curveEnd;

        this.graphics.lineTo(startX, startY);
        this.graphics.quadraticCurveTo(curr.x, curr.y, endX, endY);
      }
    }
  }

  private renderShoulder(waypoints: Waypoint[], pathWidth: number): void {
    this.drawPathLine(waypoints, PATH.CORNER_RADIUS);
    this.graphics.stroke({
      width: pathWidth + PATH.OUTER_BORDER_WIDTH + PATH.SHOULDER_WIDTH,
      color: COLORS.PATH_SHOULDER,
      cap: 'round',
      join: 'round',
      alpha: PATH.SHOULDER_ALPHA,
    });
  }

  private renderPathBorder(waypoints: Waypoint[], pathWidth: number): void {
    this.drawPathLine(waypoints, PATH.CORNER_RADIUS);
    this.graphics.stroke({
      width: pathWidth + PATH.OUTER_BORDER_WIDTH,
      color: COLORS.PATH_OUTER,
      cap: 'round',
      join: 'round',
    });
  }

  private renderMainPath(waypoints: Waypoint[], pathWidth: number): void {
    this.drawPathLine(waypoints, PATH.CORNER_RADIUS);
    this.graphics.stroke({
      width: pathWidth,
      color: COLORS.PATH_DIRT,
      cap: 'round',
      join: 'round',
    });
  }

  private renderSurfaceScuffs(waypoints: Waypoint[], pathWidth: number): void {
    this.drawPathLine(waypoints, PATH.CORNER_RADIUS);
    this.graphics.stroke({
      width: pathWidth * PATH.SURFACE_LIGHT_FACTOR,
      color: COLORS.PATH_DIRT_LIGHT,
      cap: 'round',
      join: 'round',
      alpha: PATH.SURFACE_LIGHT_ALPHA,
    });
  }

  private renderCenterTrack(waypoints: Waypoint[], pathWidth: number): void {
    this.drawPathLine(waypoints, PATH.CORNER_RADIUS);
    this.graphics.stroke({
      width: pathWidth * PATH.INNER_WIDTH_FACTOR,
      color: COLORS.PATH_INNER,
      cap: 'round',
      join: 'round',
      alpha: PATH.INNER_ALPHA,
    });
  }

  private renderTireTracks(waypoints: Waypoint[], pathWidth: number): void {
    const trackOffset = pathWidth * PATH.TRACK_OFFSET_FACTOR;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const curr = waypoints[i];
      const next = waypoints[i + 1];

      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) {
        continue;
      }
      const nx = -dy / len;
      const ny = dx / len;

      // Draw ruts as short wobbling segments for organic wear
      const steps = Math.max(2, Math.floor(len / 18));
      for (const side of [1, -1] as const) {
        for (let s = 0; s < steps; s++) {
          const t0 = s / steps;
          const t1 = (s + 1) / steps;
          const wobble0 = (this.rand() - 0.5) * PATH.TRACK_WOBBLE;
          const wobble1 = (this.rand() - 0.5) * PATH.TRACK_WOBBLE;
          const x0 = curr.x + dx * t0 + nx * (trackOffset * side + wobble0);
          const y0 = curr.y + dy * t0 + ny * (trackOffset * side + wobble0);
          const x1 = curr.x + dx * t1 + nx * (trackOffset * side + wobble1);
          const y1 = curr.y + dy * t1 + ny * (trackOffset * side + wobble1);
          this.graphics.moveTo(x0, y0).lineTo(x1, y1).stroke({
            width: PATH.TRACK_WIDTH + this.rand() * 0.8,
            color: COLORS.PATH_TRACK,
            alpha: PATH.TRACK_ALPHA * (0.75 + this.rand() * 0.35),
            cap: 'round',
          });
        }
      }
    }
  }

  private renderPathTexture(waypoints: Waypoint[], pathWidth: number): void {
    for (let i = 0; i < waypoints.length - 1; i++) {
      const curr = waypoints[i];
      const next = waypoints[i + 1];

      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) {
        continue;
      }
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const steps = Math.floor(len / PATH.DIRT_STEP_SIZE);

      for (let j = 0; j < steps; j++) {
        const t = (j + 0.5) / steps;
        const x = curr.x + dx * t;
        const y = curr.y + dy * t;

        // Dirt mottling
        if (this.rand() < PATH.DIRT_PATCH_CHANCE) {
          const size =
            PATH.DIRT_PATCH_MIN_SIZE +
            this.rand() * (PATH.DIRT_PATCH_MAX_SIZE - PATH.DIRT_PATCH_MIN_SIZE);
          const off = (this.rand() - 0.5) * pathWidth * PATH.DIRT_PATCH_OFFSET_FACTOR;
          const light = this.rand() > 0.5;
          this.graphics
            .ellipse(x + nx * off, y + ny * off, size, size * (0.5 + this.rand() * 0.4))
            .fill({
              color: light ? COLORS.PATH_DIRT_LIGHT : COLORS.PATH_INNER,
              alpha:
                PATH.DIRT_PATCH_MIN_ALPHA +
                this.rand() * (PATH.DIRT_PATCH_MAX_ALPHA - PATH.DIRT_PATCH_MIN_ALPHA),
            });
        }

        // Pebbles with contact shadow
        if (this.rand() < PATH.ROCK_CHANCE) {
          const size =
            PATH.ROCK_MIN_SIZE + this.rand() * (PATH.ROCK_MAX_SIZE - PATH.ROCK_MIN_SIZE);
          const off = (this.rand() - 0.5) * pathWidth * PATH.ROCK_OFFSET_FACTOR;
          const px = x + nx * off;
          const py = y + ny * off;
          this.graphics
            .ellipse(px + 0.6, py + 0.6, size * 0.9, size * 0.5)
            .fill({ color: COLORS.PATH_ROCK_SHADOW, alpha: 0.35 });
          this.graphics.ellipse(px, py, size, size * 0.7).fill({
            color: COLORS.PATH_ROCK,
            alpha: PATH.ROCK_MIN_ALPHA + this.rand() * (PATH.ROCK_MAX_ALPHA - PATH.ROCK_MIN_ALPHA),
          });
        }

        // Footprints oriented along travel direction
        if (this.rand() < PATH.FOOTPRINT_CHANCE) {
          const off = (this.rand() - 0.5) * pathWidth * PATH.FOOTPRINT_OFFSET_FACTOR;
          const fx = x + nx * off;
          const fy = y + ny * off;
          const angle = Math.atan2(uy, ux);
          this.drawOrientedFootprint(fx, fy, angle);
        }

        // Mud puddle patches
        if (this.rand() < PATH.MUD_CHANCE) {
          const rx = PATH.MUD_MIN_RX + this.rand() * (PATH.MUD_MAX_RX - PATH.MUD_MIN_RX);
          const off = (this.rand() - 0.5) * pathWidth * 0.3;
          this.graphics
            .ellipse(x + nx * off, y + ny * off, rx, rx * 0.45)
            .fill({ color: COLORS.PATH_MUD, alpha: PATH.MUD_ALPHA });
        }

        // Hairline cracks along path
        if (this.rand() < PATH.CRACK_CHANCE) {
          const off = (this.rand() - 0.5) * pathWidth * 0.25;
          const cx = x + nx * off;
          const cy = y + ny * off;
          const crackLen = PATH.CRACK_LENGTH * (0.6 + this.rand() * 0.6);
          const sway = (this.rand() - 0.5) * 4;
          this.graphics
            .moveTo(cx - ux * crackLen * 0.5, cy - uy * crackLen * 0.5)
            .lineTo(cx + nx * sway, cy + ny * sway)
            .lineTo(cx + ux * crackLen * 0.5, cy + uy * crackLen * 0.5)
            .stroke({ width: 1, color: COLORS.PATH_CRACK, alpha: 0.4 });
        }
      }
    }
  }

  private drawOrientedFootprint(x: number, y: number, angle: number): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const hw = PATH.FOOTPRINT_WIDTH / 2;
    const hh = PATH.FOOTPRINT_HEIGHT / 2;
    // Approximate rotated ellipse as a diamond-ish oval via 4 points + fill ellipse
    // Pixi ellipse isn't rotatable easily; draw as small poly aligned to direction
    const pts: number[] = [];
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const lx = Math.cos(a) * hw;
      const ly = Math.sin(a) * hh;
      pts.push(x + lx * cos - ly * sin, y + lx * sin + ly * cos);
    }
    this.graphics.poly(pts).fill({
      color: COLORS.PATH_FOOTPRINT,
      alpha:
        PATH.FOOTPRINT_MIN_ALPHA +
        this.rand() * (PATH.FOOTPRINT_MAX_ALPHA - PATH.FOOTPRINT_MIN_ALPHA),
    });
  }

  private renderEdgeDetail(waypoints: Waypoint[], pathWidth: number): void {
    const edgeDist = pathWidth * 0.48;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const curr = waypoints[i];
      const next = waypoints[i + 1];
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) {
        continue;
      }
      const nx = -dy / len;
      const ny = dx / len;
      const steps = Math.floor(len / 16);

      for (let j = 0; j < steps; j++) {
        if (this.rand() > PATH.EDGE_BLOB_CHANCE) {
          continue;
        }
        const t = (j + this.rand()) / steps;
        const side = this.rand() > 0.5 ? 1 : -1;
        const x = curr.x + dx * t + nx * edgeDist * side;
        const y = curr.y + dy * t + ny * edgeDist * side;
        const size = PATH.EDGE_BLOB_SIZE * (0.6 + this.rand() * 0.8);
        this.graphics
          .ellipse(x, y, size, size * 0.55)
          .fill({
            color: this.rand() > 0.5 ? COLORS.PATH_OUTER : COLORS.PATH_SHOULDER,
            alpha: PATH.EDGE_BLOB_ALPHA,
          });
      }
    }
  }

  private renderEdgeWear(waypoints: Waypoint[], pathWidth: number): void {
    this.drawPathLine(waypoints, PATH.CORNER_RADIUS);
    this.graphics.stroke({
      width: pathWidth + PATH.HIGHLIGHT_BORDER_WIDTH,
      color: COLORS.PATH_HIGHLIGHT,
      cap: 'round',
      join: 'round',
      alpha: PATH.HIGHLIGHT_ALPHA,
    });
  }
}
