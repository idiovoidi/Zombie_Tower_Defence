import { Graphics } from 'pixi.js';
import type { LightingManager } from '../lighting/LightingManager';

/**
 * Full-playfield colour wash for the time of day (warm at dawn/dusk, blue at night). Redrawn only
 * when the lighting changes, and hidden entirely while there is no tint.
 */
export class AmbientTintOverlay extends Graphics {
  private readonly width_: number;
  private readonly height_: number;

  constructor(width: number, height: number, lighting: LightingManager) {
    super();
    this.width_ = width;
    this.height_ = height;
    // Purely cosmetic: never intercept pointer input meant for towers/UI
    this.eventMode = 'none';
    this.redraw(lighting);
    lighting.subscribe(() => this.redraw(lighting));
  }

  private redraw(lighting: LightingManager): void {
    const { color, alpha } = lighting.getAmbientTint();
    this.clear();
    if (alpha < 0.005) {
      this.visible = false;
      return;
    }
    this.rect(0, 0, this.width_, this.height_).fill({ color, alpha });
    this.visible = true;
  }
}
