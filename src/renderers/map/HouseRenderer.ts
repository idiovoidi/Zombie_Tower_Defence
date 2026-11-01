import type { Graphics } from 'pixi.js';
import type { MapData } from '../../managers/MapManager';
import { createSeededRandom } from '../../utils/seededRandom';

export type HouseStyle = 'cottage' | 'townhouse' | 'farmhouse';

interface HouseSpec {
  width: number;
  height: number;
  style: HouseStyle;
  /** Which side of the roof has caved in. */
  collapse: 1 | -1;
  /** 0..1, how much of the roof is gone. */
  damage: number;
}

interface StylePalette {
  wall: number;
  wallDark: number;
  trim: number;
  roof: number;
  roofDark: number;
  roofLine: number;
}

const INTERIOR = 0x15110c;
const OUTLINE = 0x2a1d12;
const BEAM = 0x5a3e28;
const STONE = 0x6a6a64;
const STONE_DARK = 0x45453f;

const PALETTES: Record<HouseStyle, StylePalette> = {
  cottage: {
    wall: 0xb39a80,
    wallDark: 0x8f7861,
    trim: 0x5a4330,
    roof: 0x94502a,
    roofDark: 0x6a3a1e,
    roofLine: 0x4a2814,
  },
  townhouse: {
    wall: 0x8c5e4a,
    wallDark: 0x6a4636,
    trim: 0x3e3028,
    roof: 0x4e4e58,
    roofDark: 0x383842,
    roofLine: 0x26262e,
  },
  farmhouse: {
    wall: 0x9c7c56,
    wallDark: 0x7a5e3e,
    trim: 0x4a3622,
    roof: 0x7e4a3a,
    roofDark: 0x5c362a,
    roofLine: 0x3e2218,
  },
};

/**
 * Draws the ruined houses along the top edge of the map.
 *
 * Every house is built the same way, front-on and lit from the upper left:
 * stone foundation, front wall, gable roof with one caved-in side, a few openings,
 * and a single rubble pile where the roof fell. Style only changes materials and layout.
 */
export class HouseRenderer {
  private g: Graphics;

  constructor(mapContainer: Graphics) {
    this.g = mapContainer;
  }

  public render(mapData: MapData): void {
    // One street: shared ground line, even spacing, clear of the HUD at the top corners.
    const groundLine = 112;
    const slots = mapData.width > 1200 ? 6 : 5;
    const firstX = 130;
    const lastX = mapData.width - 285;
    const pitch = (lastX - firstX) / (slots - 1);
    const specs: HouseSpec[] = [
      { width: 74, height: 64, style: 'cottage', collapse: 1, damage: 0.8 },
      { width: 84, height: 70, style: 'townhouse', collapse: -1, damage: 0.55 },
      { width: 72, height: 62, style: 'cottage', collapse: -1, damage: 0.9 },
      { width: 80, height: 68, style: 'farmhouse', collapse: 1, damage: 0.65 },
      { width: 74, height: 64, style: 'cottage', collapse: 1, damage: 0.75 },
      { width: 78, height: 66, style: 'farmhouse', collapse: -1, damage: 0.7 },
    ];
    specs.slice(0, slots).forEach((spec, i) => {
      this.drawHouse(firstX + i * pitch, groundLine, spec, i);
    });
  }

  private drawHouse(x: number, groundY: number, spec: HouseSpec, index: number): void {
    const g = this.g;
    const rand = createSeededRandom(index * 7919 + 13);
    const pal = PALETTES[spec.style];
    const { width: W, height: H, collapse: d } = spec;
    const cx = x + W / 2;

    const foundH = 5;
    const baseY = groundY - foundH; // top of foundation = bottom of wall
    const roofH = H * (spec.style === 'townhouse' ? 0.3 : 0.4);
    const wallH = H - roofH - foundH;
    const wallTop = baseY - wallH;
    const apexY = wallTop - roofH;
    const eaveY = wallTop + 2;
    const overhang = 4;

    // --- Ground shadow (light from the upper left)
    g.ellipse(cx + W * 0.12, groundY + 2, W * 0.62, 6).fill({ color: 0x000000, alpha: 0.28 });

    // --- Foundation
    g.rect(x - 2, baseY, W + 4, foundH).fill(STONE);
    g.rect(x - 2, baseY, W + 4, foundH).stroke({ width: 1, color: STONE_DARK });
    for (let bx = x + 6; bx < x + W - 2; bx += 11) {
      g.moveTo(bx, baseY)
        .lineTo(bx, baseY + foundH)
        .stroke({ width: 1, color: STONE_DARK, alpha: 0.6 });
    }

    // --- Front wall
    g.rect(x, wallTop, W, wallH).fill(pal.wall);
    this.drawWallTexture(spec.style, x, wallTop, W, wallH, pal);
    // Shade the side the light doesn't reach, and the base where dirt splashes up
    g.rect(x + W * 0.72, wallTop, W * 0.28, wallH).fill({ color: 0x000000, alpha: 0.12 });
    g.rect(x, baseY - 4, W, 4).fill({ color: 0x2a1d12, alpha: 0.22 });
    g.rect(x, wallTop, W, wallH).stroke({ width: 1.5, color: OUTLINE });
    // Corner posts
    g.rect(x, wallTop, 3, wallH).fill(pal.trim);
    g.rect(x + W - 3, wallTop, 3, wallH).fill(pal.trim);

    // --- Openings: door plus windows on a fixed, symmetric layout
    const doorW = W * 0.2;
    const doorH = wallH * 0.66;
    const winW = W * 0.17;
    const winH = wallH * (spec.style === 'townhouse' ? 0.24 : 0.3);
    const doorU = spec.style === 'townhouse' ? 0.5 : 0.5;
    const doorX = x + W * doorU - doorW / 2;
    const winY = baseY - wallH * (spec.style === 'townhouse' ? 0.55 : 0.68);

    this.drawDoor(doorX, baseY, doorW, doorH, pal, d);
    for (const u of [0.2, 0.8]) {
      this.drawWindow(x + W * u - winW / 2, winY, winW, winH, pal, rand() < 0.5);
    }
    if (spec.style === 'townhouse') {
      // Upper storey
      for (const u of [0.2, 0.5, 0.8]) {
        this.drawWindow(x + W * u - winW / 2, wallTop + 4, winW, winH * 0.8, pal, rand() < 0.5);
      }
    }
    if (spec.style === 'farmhouse') {
      this.drawPorch(doorX, baseY, doorW, doorH, pal);
    }

    // --- Roof with one caved-in side, then chimney on the intact side
    this.drawRoof(cx, W, apexY, eaveY, overhang, spec, pal);
    this.drawChimney(cx, W, apexY, eaveY, overhang, (d === 1 ? -1 : 1) as 1 | -1);

    // --- Soot above the openings nearest the collapse, not random blobs
    const sootX = x + W * (d === 1 ? 0.8 : 0.2) - winW / 2;
    g.rect(sootX + 1, winY - wallH * 0.22, winW - 2, wallH * 0.22).fill({
      color: 0x000000,
      alpha: 0.28,
    });

    // --- Rubble pile on the collapsed side, resting on the ground
    this.drawRubble(cx + d * W * 0.38, groundY, W * 0.4, rand);

    // --- Lit left edge, so all houses share one light direction
    g.rect(x + 3, wallTop + 2, 1.5, wallH - 6).fill({ color: 0xffffff, alpha: 0.12 });

    // --- A single thin smoke plume from the hole in the roof
    if (spec.damage >= 0.7) {
      const sx = cx + d * W * 0.2;
      for (let i = 0; i < 4; i++) {
        g.ellipse(sx + Math.sin(i * 0.9) * 4, apexY + roofH * 0.3 - i * 9, 4 + i * 1.2, 3 + i).fill(
          { color: 0x8a8a8a, alpha: 0.3 - i * 0.06 }
        );
      }
    }
  }

  private drawWallTexture(
    style: HouseStyle,
    x: number,
    y: number,
    w: number,
    h: number,
    pal: StylePalette
  ): void {
    const g = this.g;
    if (style === 'townhouse') {
      const rows = 7;
      for (let r = 1; r < rows; r++) {
        const ly = y + (r * h) / rows;
        g.moveTo(x + 3, ly)
          .lineTo(x + w - 3, ly)
          .stroke({ width: 1, color: pal.wallDark, alpha: 0.7 });
        for (let bx = x + 3 + (r % 2 ? 0 : 4); bx < x + w - 3; bx += 8) {
          g.moveTo(bx, ly)
            .lineTo(bx, ly + h / rows)
            .stroke({ width: 1, color: pal.wallDark, alpha: 0.45 });
        }
      }
    } else if (style === 'farmhouse') {
      for (let bx = x + 7; bx < x + w - 3; bx += 7) {
        g.moveTo(bx, y)
          .lineTo(bx, y + h)
          .stroke({ width: 1, color: pal.wallDark, alpha: 0.7 });
      }
    } else {
      // Plaster: a few horizontal courses and one flaked patch
      for (let r = 1; r < 4; r++) {
        g.moveTo(x + 3, y + (r * h) / 4)
          .lineTo(x + w - 3, y + (r * h) / 4)
          .stroke({ width: 1, color: pal.wallDark, alpha: 0.3 });
      }
    }
  }

  private drawDoor(
    x: number,
    baseY: number,
    w: number,
    h: number,
    pal: StylePalette,
    swing: 1 | -1
  ): void {
    const g = this.g;
    const top = baseY - h;
    g.rect(x - 2, top - 2, w + 4, h + 2).fill(pal.trim);
    g.rect(x, top, w, h).fill(INTERIOR);
    // Door leaf hanging open from the hinge side
    const leafW = w * 0.55;
    const lx = swing === 1 ? x : x + w - leafW;
    g.rect(lx, top + 1, leafW, h - 1).fill(0x6a4a2e);
    g.rect(lx, top + 1, leafW, h - 1).stroke({ width: 1, color: OUTLINE });
    g.moveTo(lx + leafW / 2, top + 1)
      .lineTo(lx + leafW / 2, baseY)
      .stroke({ width: 1, color: OUTLINE, alpha: 0.6 });
    // Step
    g.rect(x - 3, baseY - 1, w + 6, 2).fill(STONE_DARK);
  }

  private drawWindow(
    x: number,
    y: number,
    w: number,
    h: number,
    pal: StylePalette,
    glassless: boolean
  ): void {
    const g = this.g;
    g.rect(x - 2, y - 2, w + 4, h + 4).fill(pal.trim);
    g.rect(x, y, w, h).fill(INTERIOR);
    if (!glassless) {
      // Remaining shards in two opposite corners
      g.poly([x, y, x + w * 0.45, y, x, y + h * 0.4]).fill({ color: 0x8fb0c0, alpha: 0.55 });
      g.poly([x + w, y + h, x + w * 0.55, y + h, x + w, y + h * 0.6]).fill({
        color: 0x8fb0c0,
        alpha: 0.55,
      });
    }
    g.moveTo(x + w / 2, y)
      .lineTo(x + w / 2, y + h)
      .stroke({ width: 1, color: pal.trim });
    g.moveTo(x, y + h / 2)
      .lineTo(x + w, y + h / 2)
      .stroke({ width: 1, color: pal.trim });
    g.rect(x - 3, y + h + 2, w + 6, 2).fill(pal.trim);
  }

  private drawPorch(
    doorX: number,
    baseY: number,
    doorW: number,
    doorH: number,
    pal: StylePalette
  ): void {
    const g = this.g;
    const top = baseY - doorH - 6;
    const left = doorX - 8;
    const right = doorX + doorW + 8;
    g.rect(left, top, 3, baseY - top).fill(pal.trim);
    g.rect(right - 3, top, 3, baseY - top).fill(pal.trim);
    g.rect(left - 2, top - 3, right - left + 4, 4).fill(pal.roofDark);
    g.rect(left - 2, top - 3, right - left + 4, 4).stroke({ width: 1, color: pal.roofLine });
  }

  private drawRoof(
    cx: number,
    W: number,
    apexY: number,
    eaveY: number,
    overhang: number,
    spec: HouseSpec,
    pal: StylePalette
  ): void {
    const g = this.g;
    const d = spec.collapse;
    const half = W / 2 + overhang;
    const slopeX = (t: number): number => cx + d * half * t; // collapsed-side slope point at t (0 apex..1 eave)
    const slopeY = (t: number): number => apexY + (eaveY - apexY) * t;
    const holeStart = 0.78 - spec.damage * 0.45; // how close to the ridge the cave-in starts
    const holeBottom = 0.28 + spec.damage * 0.18; // how far the hole reaches inwards at the eave

    // Exposed attic behind the hole
    g.poly([
      slopeX(holeStart),
      slopeY(holeStart),
      cx - d * half * 0.02,
      apexY + (eaveY - apexY) * 0.55,
      cx + d * half * 0.02,
      eaveY,
      slopeX(1),
      eaveY,
    ]).fill(INTERIOR);
    // Rafters running down the slope direction, snapped off at different lengths
    for (let i = 0; i < 3; i++) {
      const t0 = holeStart + 0.04 + i * 0.07;
      const t1 = Math.min(1, t0 + 0.22 + i * 0.1);
      g.moveTo(slopeX(t0), slopeY(t0) + 2 + i * 2)
        .lineTo(slopeX(t1), slopeY(t1))
        .stroke({ width: 2, color: BEAM });
    }

    // Intact roof: everything except the notch
    const notchInner = cx + d * half * (1 - holeBottom - 0.35);
    const roofPath: number[] = [
      cx,
      apexY,
      slopeX(holeStart),
      slopeY(holeStart),
      cx + d * half * 0.08,
      apexY + (eaveY - apexY) * 0.5,
      notchInner,
      apexY + (eaveY - apexY) * 0.72,
      cx + d * half * 0.3,
      eaveY,
      cx - d * half,
      eaveY,
    ];
    g.poly(roofPath).fill(pal.roof);

    // Shingle courses, limited to the intact area
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      const y = slopeY(t);
      const xFar = cx - d * half * t;
      const xNear = k <= 2 ? slopeX(Math.min(t, holeStart)) : cx + d * half * 0.06;
      g.moveTo(xFar, y).lineTo(xNear, y).stroke({ width: 1, color: pal.roofLine, alpha: 0.45 });
    }
    // Lit ridge on the left slope
    g.moveTo(cx, apexY + 1)
      .lineTo(cx - half + 3, eaveY - 1)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.12 });
    g.poly(roofPath).stroke({ width: 1.5, color: pal.roofLine });
    // Fascia
    g.moveTo(cx - d * half, eaveY)
      .lineTo(cx + d * half * 0.3, eaveY)
      .stroke({ width: 2, color: pal.roofDark });
  }

  private drawChimney(
    cx: number,
    W: number,
    apexY: number,
    eaveY: number,
    overhang: number,
    side: 1 | -1
  ): void {
    const g = this.g;
    const half = W / 2 + overhang;
    const cw = 8;
    const t = 0.55;
    const px = cx + side * half * t - cw / 2;
    const roofY = apexY + (eaveY - apexY) * t;
    const top = roofY - 11;
    g.rect(px, top, cw, 12).fill(0x6a5a4a);
    g.rect(px, top, cw, 12).stroke({ width: 1, color: OUTLINE });
    g.rect(px - 1, top - 2, cw + 2, 3).fill(0x4a3e34);
    g.rect(px + 1, top - 1, cw - 2, 1.5).fill(0x1a1612);
    g.moveTo(px + 1.5, top + 3)
      .lineTo(px + cw - 1.5, top + 3)
      .stroke({ width: 1, color: OUTLINE, alpha: 0.4 });
  }

  /** A single, compact pile that sits on the ground rather than scattering around the house. */
  private drawRubble(x: number, groundY: number, spread: number, rand: () => number): void {
    const g = this.g;
    g.ellipse(x, groundY + 1, spread * 1.1, 3).fill({ color: 0x000000, alpha: 0.22 });
    // Fallen beam
    g.moveTo(x - spread * 0.9, groundY - 1)
      .lineTo(x + spread * 0.6, groundY - 5)
      .stroke({ width: 2.5, color: BEAM });
    const colors = [STONE, 0x8a7a64, 0x7a5a3a, STONE_DARK];
    for (let i = 0; i < 6; i++) {
      const px = x + (i / 5 - 0.5) * spread * 1.6 + (rand() - 0.5) * 2;
      const size = 3.5 + rand() * 3 - Math.abs(i / 5 - 0.5) * 2;
      const py = groundY - size * 0.4;
      g.poly([
        px - size,
        py + size * 0.5,
        px - size * 0.4,
        py - size * 0.6,
        px + size * 0.7,
        py - size * 0.3,
        px + size,
        py + size * 0.5,
      ]).fill(colors[i % colors.length]);
    }
  }
}
