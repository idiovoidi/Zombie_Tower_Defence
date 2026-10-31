import type { Graphics } from 'pixi.js';
import { GRAVEYARD_DETAILS } from '../../config/visualConstants';

interface Gravestone {
  x: number;
  y: number;
  type: string;
  size: number;
  tilt: number;
  fallen?: boolean;
}

/**
 * Gravestones in the graveyard: crosses, headstones, monuments and fallen stones.
 */
export class GravestoneRenderer {
  private graphics: Graphics;
  private rand: () => number = Math.random;

  constructor(graphics: Graphics) {
    this.graphics = graphics;
  }

  /** @param rand Shared seeded generator so output stays deterministic across sub-renderers. */
  public render(rand: () => number): void {
    this.rand = rand;
    this.renderGravestones();
  }

  private renderGravestones(): void {
    const gravestones: Gravestone[] = [
      { x: 40, y: 280, type: 'cross', size: 12, tilt: 0.1 },
      { x: 70, y: 275, type: 'headstone', size: 14, tilt: -0.08 },
      { x: 100, y: 285, type: 'cross', size: 10, tilt: 0.15 },
      { x: 130, y: 280, type: 'headstone', size: 13, tilt: -0.12 },

      { x: 35, y: 320, type: 'headstone', size: 15, tilt: 0.2 },
      { x: 65, y: 315, type: 'cross', size: 11, tilt: -0.1 },
      { x: 95, y: 325, type: 'monument', size: 18, tilt: 0.05 },
      { x: 125, y: 320, type: 'headstone', size: 12, tilt: 0.18 },

      { x: 40, y: 365, type: 'cross', size: 13, tilt: -0.15 },
      { x: 70, y: 370, type: 'headstone', size: 14, tilt: 0.1 },
      { x: 100, y: 360, type: 'cross', size: 10, tilt: -0.2, fallen: true },

      { x: 35, y: 410, type: 'headstone', size: 16, tilt: 0.12 },
      { x: 65, y: 405, type: 'cross', size: 11, tilt: -0.08 },
      { x: 95, y: 415, type: 'headstone', size: 13, tilt: 0.25 },
      { x: 125, y: 410, type: 'cross', size: 12, tilt: -0.15 },

      { x: 45, y: 455, type: 'monument', size: 17, tilt: 0.08 },
      { x: 75, y: 450, type: 'headstone', size: 14, tilt: -0.1 },
      { x: 105, y: 460, type: 'cross', size: 10, tilt: 0.15 },
      { x: 135, y: 455, type: 'headstone', size: 13, tilt: -0.18, fallen: true },

      { x: 50, y: 500, type: 'cross', size: 11, tilt: 0.2 },
      { x: 80, y: 495, type: 'headstone', size: 12, tilt: -0.12 },
      { x: 110, y: 505, type: 'cross', size: 10, tilt: 0.1 },
    ];

    for (const stone of gravestones) {
      this.renderGravestone(stone.x, stone.y, stone.type, stone.size, stone.tilt, stone.fallen);
    }
  }

  private renderGravestone(
    x: number,
    y: number,
    type: string,
    size: number,
    tilt: number,
    fallen = false
  ): void {
    if (fallen) {
      this.renderFallenStone(x, y, size, type);
      return;
    }

    if (type === 'cross') {
      this.renderCross(x, y, size, tilt);
    } else if (type === 'headstone') {
      this.renderHeadstone(x, y, size, tilt);
    } else if (type === 'monument') {
      this.renderMonument(x, y, size, tilt);
    }
  }

  private renderFallenStone(x: number, y: number, size: number, type: string): void {
    const color =
      type === 'cross' ? GRAVEYARD_DETAILS.CROSS_COLOR : GRAVEYARD_DETAILS.HEADSTONE_COLOR;
    // Toppled marker lying on the ground
    this.graphics
      .ellipse(x, y + size * 0.3, size * 0.7, size * 0.25)
      .fill({ color: GRAVEYARD_DETAILS.SHADOW_COLOR, alpha: 0.25 });
    this.graphics.rect(x - size * 0.6, y + size * 0.15, size * 1.2, size * 0.35).fill(color);
    this.graphics.stroke({
      width: 1,
      color:
        type === 'cross'
          ? GRAVEYARD_DETAILS.CROSS_BORDER_COLOR
          : GRAVEYARD_DETAILS.HEADSTONE_BORDER_COLOR,
    });
    // Disturbed earth where it stood
    this.graphics
      .ellipse(x - size * 0.2, y + size * 0.55, 6, 3)
      .fill({ color: GRAVEYARD_DETAILS.DISTURBED_EARTH_COLOR, alpha: 0.7 });
  }

  private renderCross(x: number, y: number, size: number, tilt: number): void {
    const graphics = this.graphics;
    const crossWidth = size * 0.6;
    const crossHeight = size;
    const beamThickness = size * 0.15;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);

    const transform = (px: number, py: number) => ({
      x: x + px * cos - py * sin,
      y: y + px * sin + py * cos,
    });

    const drawBeam = (points: Array<{ x: number; y: number }>) => {
      const t = points.map(p => transform(p.x, p.y));
      graphics.moveTo(t[0].x, t[0].y);
      for (let i = 1; i < t.length; i++) {
        graphics.lineTo(t[i].x, t[i].y);
      }
      graphics.lineTo(t[0].x, t[0].y);
      graphics.fill({ color: GRAVEYARD_DETAILS.CROSS_COLOR });
      graphics.stroke({ width: 1, color: GRAVEYARD_DETAILS.CROSS_BORDER_COLOR });
    };

    drawBeam([
      { x: -beamThickness / 2, y: 0 },
      { x: beamThickness / 2, y: 0 },
      { x: beamThickness / 2, y: crossHeight },
      { x: -beamThickness / 2, y: crossHeight },
    ]);

    const hBeamY = crossHeight * 0.3;
    drawBeam([
      { x: -crossWidth / 2, y: hBeamY },
      { x: crossWidth / 2, y: hBeamY },
      { x: crossWidth / 2, y: hBeamY + beamThickness },
      { x: -crossWidth / 2, y: hBeamY + beamThickness },
    ]);

    // Wood grain
    const grain = transform(0, crossHeight * 0.5);
    graphics
      .moveTo(grain.x - 1, grain.y - 4)
      .lineTo(grain.x + 1, grain.y + 4)
      .stroke({ width: 1, color: GRAVEYARD_DETAILS.WOOD_GRAIN_COLOR, alpha: 0.5 });

    graphics.ellipse(x + 2, y + crossHeight + 2, size * 0.4, size * 0.2);
    graphics.fill({
      color: GRAVEYARD_DETAILS.SHADOW_COLOR,
      alpha: GRAVEYARD_DETAILS.SHADOW_ALPHA,
    });
  }

  private renderHeadstone(x: number, y: number, size: number, tilt: number): void {
    const graphics = this.graphics;
    const width = size * 0.8;
    const height = size;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);

    const transform = (px: number, py: number) => ({
      x: x + px * cos - py * sin,
      y: y + px * sin + py * cos,
    });

    // Pedestal base
    const base = [
      transform(-width * 0.55, height),
      transform(width * 0.55, height),
      transform(width * 0.55, height + 4),
      transform(-width * 0.55, height + 4),
    ];
    graphics.moveTo(base[0].x, base[0].y);
    for (let i = 1; i < base.length; i++) {
      graphics.lineTo(base[i].x, base[i].y);
    }
    graphics.fill({ color: GRAVEYARD_DETAILS.MONUMENT_BASE_COLOR });

    const points = [
      { x: -width / 2, y: height * 0.2 },
      { x: -width / 2, y: height },
      { x: width / 2, y: height },
      { x: width / 2, y: height * 0.2 },
    ];
    const transformedPoints = points.map(p => transform(p.x, p.y));

    graphics.moveTo(transformedPoints[0].x, transformedPoints[0].y);
    for (let i = 1; i < transformedPoints.length; i++) {
      graphics.lineTo(transformedPoints[i].x, transformedPoints[i].y);
    }
    graphics.lineTo(transformedPoints[0].x, transformedPoints[0].y);
    graphics.fill({ color: GRAVEYARD_DETAILS.HEADSTONE_COLOR });
    graphics.stroke({ width: 1, color: GRAVEYARD_DETAILS.HEADSTONE_BORDER_COLOR });

    const topCenter = transform(0, height * 0.2);
    graphics.arc(topCenter.x, topCenter.y, width / 2, Math.PI, 0);
    graphics.fill({ color: GRAVEYARD_DETAILS.HEADSTONE_COLOR });
    graphics.stroke({ width: 1, color: GRAVEYARD_DETAILS.HEADSTONE_BORDER_COLOR });

    // Weathered inscription lines
    for (let i = 0; i < 3; i++) {
      const a = transform(-width * 0.28, height * (0.4 + i * 0.15));
      const b = transform(width * 0.28, height * (0.4 + i * 0.15));
      graphics.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x3a3a3a, alpha: 0.45 });
    }

    const crackStart = transform(-width * 0.2, height * 0.4);
    const crackEnd = transform(width * 0.1, height * 0.7);
    graphics.moveTo(crackStart.x, crackStart.y).lineTo(crackEnd.x, crackEnd.y);
    graphics.stroke({
      width: 1,
      color: GRAVEYARD_DETAILS.HEADSTONE_CRACK_COLOR,
      alpha: GRAVEYARD_DETAILS.GATE_CRACK_ALPHA,
    });

    for (let i = 0; i < 2; i++) {
      const moss = transform((this.rand() - 0.5) * width * 0.5, height * (0.5 + i * 0.2));
      graphics.circle(moss.x, moss.y, 2);
      graphics.fill({
        color: GRAVEYARD_DETAILS.GATE_MOSS_COLOR,
        alpha: GRAVEYARD_DETAILS.GATE_MOSS_ALPHA,
      });
    }

    graphics.ellipse(x + 3, y + height + 2, width * 0.5, width * 0.25);
    graphics.fill({
      color: GRAVEYARD_DETAILS.SHADOW_COLOR,
      alpha: GRAVEYARD_DETAILS.SHADOW_ALPHA,
    });
  }

  private renderMonument(x: number, y: number, size: number, tilt: number): void {
    const graphics = this.graphics;
    const width = size * 0.9;
    const height = size * 1.2;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);

    const transform = (px: number, py: number) => ({
      x: x + px * cos - py * sin,
      y: y + px * sin + py * cos,
    });

    const drawPoly = (pts: Array<{ x: number; y: number }>, fill: number, stroke: number) => {
      const t = pts.map(p => transform(p.x, p.y));
      graphics.moveTo(t[0].x, t[0].y);
      for (let i = 1; i < t.length; i++) {
        graphics.lineTo(t[i].x, t[i].y);
      }
      graphics.lineTo(t[0].x, t[0].y);
      graphics.fill({ color: fill });
      graphics.stroke({ width: 1, color: stroke });
    };

    drawPoly(
      [
        { x: -width / 2, y: height * 0.8 },
        { x: -width / 2, y: height },
        { x: width / 2, y: height },
        { x: width / 2, y: height * 0.8 },
      ],
      GRAVEYARD_DETAILS.MONUMENT_BASE_COLOR,
      GRAVEYARD_DETAILS.MONUMENT_BASE_BORDER_COLOR
    );

    drawPoly(
      [
        { x: -width * 0.4, y: height * 0.2 },
        { x: -width * 0.4, y: height * 0.8 },
        { x: width * 0.4, y: height * 0.8 },
        { x: width * 0.4, y: height * 0.2 },
      ],
      GRAVEYARD_DETAILS.HEADSTONE_COLOR,
      GRAVEYARD_DETAILS.HEADSTONE_BORDER_COLOR
    );

    drawPoly(
      [
        { x: -width * 0.4, y: height * 0.2 },
        { x: 0, y: 0 },
        { x: width * 0.4, y: height * 0.2 },
      ],
      GRAVEYARD_DETAILS.MONUMENT_BASE_COLOR,
      GRAVEYARD_DETAILS.MONUMENT_BASE_BORDER_COLOR
    );

    // Ornament diamond
    const ornament = transform(0, height * 0.45);
    graphics
      .moveTo(ornament.x, ornament.y - 3)
      .lineTo(ornament.x + 2.5, ornament.y)
      .lineTo(ornament.x, ornament.y + 3)
      .lineTo(ornament.x - 2.5, ornament.y)
      .fill({ color: 0x4a4a4a, alpha: 0.7 });

    graphics.ellipse(x + 4, y + height + 2, width * 0.6, width * 0.3);
    graphics.fill({
      color: GRAVEYARD_DETAILS.SHADOW_COLOR,
      alpha: GRAVEYARD_DETAILS.SHADOW_ALPHA,
    });
  }
}
