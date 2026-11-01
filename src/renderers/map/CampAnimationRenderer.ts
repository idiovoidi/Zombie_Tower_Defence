import type { Graphics } from 'pixi.js';
import { COLORS } from '../../config/visualConstants';

/** Animated camp elements: flickering campfire, embers, string-light glow and survivors. */
export class CampAnimationRenderer {
  private container: Graphics;
  private time = 0;

  constructor(container: Graphics) {
    this.container = container;
  }

  /** @param time Accumulated camp animation time in seconds. */
  public render(campX: number, campY: number, time: number): void {
    this.time = time;
    this.container.clear();
    this.renderAnimatedCampElements(campX, campY);
  }

  private renderAnimatedCampElements(campX: number, campY: number): void {
    const flicker1 = Math.sin(this.time * 8) * 0.5 + 0.5;
    const flicker2 = Math.sin(this.time * 10 + 1) * 0.5 + 0.5;
    const flicker3 = Math.sin(this.time * 12 + 2) * 0.5 + 0.5;

    // Warm glow under fire
    this.container
      .ellipse(campX, campY + 34, 14 + flicker1 * 2, 7)
      .fill({ color: COLORS.FIRE_OUTER, alpha: 0.12 + flicker1 * 0.06 });

    this.container
      .ellipse(campX, campY + 32, 8 + flicker1, 4)
      .fill({ color: COLORS.FIRE_OUTER, alpha: 0.9 });
    this.container
      .ellipse(campX, campY + 30, 6 + flicker2 * 0.5, 3)
      .fill({ color: COLORS.FIRE_MIDDLE, alpha: 0.9 });
    this.container
      .ellipse(campX, campY + 28, 4 + flicker3 * 0.3, 2)
      .fill({ color: COLORS.FIRE_INNER, alpha: 0.95 });
    this.container.ellipse(campX, campY + 27, 2, 1).fill({ color: COLORS.FIRE_CORE, alpha: 1 });

    // Ember sparks
    for (let i = 0; i < 3; i++) {
      const t = this.time * (2 + i) + i * 2;
      const ex = campX + Math.sin(t) * (4 + i * 2);
      const ey = campY + 26 - ((t * 8 + i * 10) % 18);
      this.container
        .circle(ex, ey, 1)
        .fill({ color: COLORS.FIRE_MIDDLE, alpha: 0.5 + flicker2 * 0.3 });
    }

    // Soft pulsing string-light glow
    const lightPulse = 0.15 + Math.sin(this.time * 3) * 0.05;
    for (let i = -40; i <= 40; i += 16) {
      this.container
        .circle(campX + i, campY - 8 + Math.abs(i) * 0.04, 5)
        .fill({ color: COLORS.CAMP_LIGHT_BULB, alpha: lightPulse });
    }

    this.renderAnimatedSurvivors(campX, campY);
  }

  private renderAnimatedSurvivors(campX: number, campY: number): void {
    const a = this.container;
    const breathe = Math.sin(this.time * 2) * 0.3;
    const breathe2 = Math.sin(this.time * 2.3 + 1) * 0.3;
    const sway = Math.sin(this.time * 1.5) * 0.5;
    const headTurn = Math.sin(this.time * 0.8) * 1;
    const headTurn2 = Math.sin(this.time * 0.9 + 2) * 1;

    const drawSurvivor = (
      x: number,
      y: number,
      bodyColor: number,
      opts?: { weapon?: boolean; rifle?: boolean; armband?: boolean }
    ) => {
      a.ellipse(x, y + 10, 4, 2).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.25 });
      a.circle(x, y, 4).fill(COLORS.SURVIVOR_SKIN);
      a.roundRect(x - 3, y + 4, 6, 8, 1).fill(bodyColor);
      // Legs
      a.rect(x - 2.5, y + 11, 2, 4).fill(COLORS.CAMP_BOOTS);
      a.rect(x + 0.5, y + 11, 2, 4).fill(COLORS.CAMP_BOOTS);
      if (opts?.rifle) {
        a.rect(x - 0.5, y - 6, 1.2, 8).fill(COLORS.SURVIVOR_RIFLE);
      }
      if (opts?.weapon) {
        a.rect(x + 2, y + 2, 1.2, 6).fill(COLORS.SURVIVOR_WEAPON);
      }
      if (opts?.armband) {
        a.rect(x - 3, y + 6, 4, 2).fill(COLORS.SURVIVOR_ARMBAND);
      }
    };

    // Watchtower guard
    drawSurvivor(
      campX - 51 + headTurn2 * 0.5,
      campY - 38 + breathe * 0.1,
      COLORS.SURVIVOR_BROWN_CLOTHES,
      {
        rifle: true,
      }
    );

    // Sitting by fire
    a.ellipse(campX - 18, campY + 42, 5, 2).fill({ color: COLORS.CAMP_SHADOW, alpha: 0.2 });
    a.circle(campX - 18, campY + 36 + breathe * 0.2, 4).fill(COLORS.SURVIVOR_SKIN);
    a.roundRect(campX - 21, campY + 40, 6, 5 + breathe * 0.5, 1).fill(COLORS.SURVIVOR_BLUE_CLOTHES);

    // Standing guard
    drawSurvivor(campX + 25 + headTurn, campY + 18 + sway * 0.3, COLORS.SURVIVOR_BROWN_CLOTHES, {
      weapon: true,
    });

    // Working on crate
    const workBob = Math.abs(Math.sin(this.time * 3)) * 2;
    drawSurvivor(campX - 48, campY - 38 - workBob, COLORS.SURVIVOR_GRAY_CLOTHES);

    // Medic
    drawSurvivor(
      campX - 32 + headTurn * 0.3,
      campY - 28 + breathe2 * 0.15,
      COLORS.SURVIVOR_WHITE_CLOTHES,
      { armband: true }
    );
  }
}
