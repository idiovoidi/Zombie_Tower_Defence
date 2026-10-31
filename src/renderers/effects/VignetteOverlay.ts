import { Graphics } from 'pixi.js';

export interface VignetteOptions {
  /** Alpha of the outermost ring (0-1). Keep low: it must not hide gameplay near the edges. */
  maxAlpha?: number;
  /** Number of rings; the vignette is `rings * ringWidth` px deep. */
  rings?: number;
  ringWidth?: number;
  /** Corner radius of the outermost ring. */
  cornerRadius?: number;
}

/**
 * Soft edge-darkening drawn once as nested translucent rings (no per-frame cost).
 * Alpha falls off quadratically toward the centre so the playfield itself stays untouched.
 */
export class VignetteOverlay extends Graphics {
  constructor(width: number, height: number, options: VignetteOptions = {}) {
    super();
    const { maxAlpha = 0.38, rings = 14, ringWidth = 8, cornerRadius = 70 } = options;

    for (let i = 0; i < rings; i++) {
      const inset = i * ringWidth + ringWidth / 2;
      const falloff = (1 - i / rings) ** 2;
      this.roundRect(
        inset,
        inset,
        Math.max(1, width - inset * 2),
        Math.max(1, height - inset * 2),
        Math.max(0, cornerRadius - inset * 0.5)
      ).stroke({ width: ringWidth, color: 0x000000, alpha: maxAlpha * falloff });
    }

    // Purely cosmetic: never intercept pointer input meant for towers/UI
    this.eventMode = 'none';
  }
}
