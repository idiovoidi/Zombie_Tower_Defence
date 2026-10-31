import type { Graphics } from 'pixi.js';
import { COLORS } from '../../config/visualConstants';
import type { Waypoint } from '../../managers/PathfindingManager';
import { createSeededRandom } from '../../utils/seededRandom';
import { CampAnimationRenderer } from './CampAnimationRenderer';
import { CampPerimeterRenderer } from './CampPerimeterRenderer';
import { CampPropsRenderer } from './CampPropsRenderer';

/**
 * CampRenderer handles all survivor camp rendering including:
 * - Static camp structures (tents, fences, sandbags, etc.)
 * - Animated elements (campfire, survivors)
 * - Camp decorations and details
 */
export class CampRenderer {
  private pathGraphics: Graphics;
  private perimeter: CampPerimeterRenderer;
  private props: CampPropsRenderer;
  private animation: CampAnimationRenderer;
  private campX = 0;
  private campY = 0;
  private campAnimationTime = 0;

  constructor(pathGraphics: Graphics, campAnimationContainer: Graphics) {
    this.pathGraphics = pathGraphics;
    this.perimeter = new CampPerimeterRenderer(pathGraphics);
    this.props = new CampPropsRenderer(pathGraphics);
    this.animation = new CampAnimationRenderer(campAnimationContainer);
  }

  public render(endpoint: Waypoint): void {
    const campX = endpoint.x;
    const campY = endpoint.y;
    this.campX = campX;
    this.campY = campY;
    this.renderStaticCampElements(campX, campY);
  }

  public updateAnimations(deltaTime: number): void {
    if (this.campX === 0 || this.campY === 0) {
      return;
    }
    this.campAnimationTime += deltaTime * 0.001;
    this.animation.render(this.campX, this.campY, this.campAnimationTime);
  }

  public getCampPosition(): { x: number; y: number } {
    return { x: this.campX, y: this.campY };
  }

  private renderStaticCampElements(campX: number, campY: number): void {
    this.renderGround(campX, campY);
    this.perimeter.render(campX, campY);
    this.props.render(campX, campY);
  }

  private renderGround(campX: number, campY: number): void {
    const g = this.pathGraphics;
    // Soft outer cleared ring
    g.circle(campX, campY, 78).fill({ color: COLORS.CAMP_GROUND, alpha: 0.28 });
    // Compacted earth pad
    g.ellipse(campX, campY + 2, 68, 62).fill({ color: COLORS.CAMP_GROUND, alpha: 0.55 });
    g.ellipse(campX, campY + 2, 52, 46).fill({ color: COLORS.CAMP_GROUND_DARK, alpha: 0.25 });

    const seed = Math.floor(campX * 13 + campY * 17);
    const rand = createSeededRandom(seed);

    // Foot traffic trails toward gate / tents / fire
    const trails: Array<[number, number, number, number]> = [
      [campX - 55, campY, campX - 10, campY + 8],
      [campX - 20, campY - 25, campX, campY + 28],
      [campX + 30, campY + 10, campX, campY + 30],
      [campX - 40, campY - 35, campX - 20, campY - 5],
    ];
    for (const [x0, y0, x1, y1] of trails) {
      g.moveTo(x0, y0)
        .lineTo(x1, y1)
        .stroke({ width: 5, color: COLORS.CAMP_FOOTPRINT, alpha: 0.18, cap: 'round' });
    }

    // Wear mottles, mud, ash, debris
    for (let i = 0; i < 28; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * 58;
      const x = campX + Math.cos(angle) * dist;
      const y = campY + Math.sin(angle) * dist * 0.9;
      const kind = rand();
      if (kind < 0.45) {
        g.ellipse(x, y, 3 + rand() * 5, 2 + rand() * 3).fill({
          color: COLORS.CAMP_GROUND_DARK,
          alpha: 0.12 + rand() * 0.15,
        });
      } else if (kind < 0.65) {
        g.ellipse(x, y, 4 + rand() * 6, 2 + rand() * 3).fill({
          color: COLORS.CAMP_MUD,
          alpha: 0.2 + rand() * 0.15,
        });
      } else if (kind < 0.8) {
        g.circle(x, y, 2 + rand() * 3).fill({ color: COLORS.CAMP_ASH, alpha: 0.2 });
      } else {
        g.rect(x, y, 2 + rand() * 3, 1 + rand() * 2).fill({
          color: COLORS.CAMP_DEBRIS,
          alpha: 0.4,
        });
      }
    }

    // Old blood stain near gate (past attacks)
    g.ellipse(campX - 50, campY + 8, 8, 4).fill({ color: 0x4a1010, alpha: 0.22 });
  }
}
