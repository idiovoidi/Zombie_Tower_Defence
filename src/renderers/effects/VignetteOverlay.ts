import { Graphics } from 'pixi.js';

export interface VignetteOptions {
  /** Alpha of the outermost ring (0-1). Keep low: it must not hide gameplay near the edges. */
  maxAlpha?: number;
  /** Number of rings; the vignette is `rings * ringWidth` px deep. */
  rings?: number;
  ringWidth?: number;
}

/**
 * Soft edge-darkening drawn once as nested translucent square rings (no per-frame cost).
 * Square rings tile exactly (rounded ones leave visible seams at the corners), and many thin
 * rings keep each alpha step imperceptible. Alpha falls off quadratically toward the centre
 * so the playfield itself stays untouched.
 */
export class VignetteOverlay extends Graphics {
  constructor(width: number, height: number, options: VignetteOptions = {}) {
    super();
    const { maxAlpha = 0.38, rings = 32, ringWidth = 4 } = options;

    for (let i = 0; i < rings; i++) {
      const inset = i * ringWidth + ringWidth / 2;
      const falloff = (1 - i / rings) ** 2;
      this.rect(
        inset,
        inset,
        Math.max(1, width - inset * 2),
        Math.max(1, height - inset * 2)
      ).stroke({ width: ringWidth, color: 0x000000, alpha: maxAlpha * falloff });
    }

    // Purely cosmetic: never intercept pointer input meant for towers/UI
    this.eventMode = 'none';
  }
}
