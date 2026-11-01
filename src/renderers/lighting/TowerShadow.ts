import type { Graphics } from 'pixi.js';
import { LIGHTING } from '../../config/lightingConstants';
import type { LightingManager } from './LightingManager';

/**
 * (Re)draw a tower's ground shadow for the current light: two stacked ellipses (penumbra + core)
 * displaced away from the light, stretching slightly as the light gets lower.
 */
export function drawTowerShadow(shadow: Graphics, lighting: LightingManager): void {
  const s = LIGHTING.SHADOW;
  const offset = lighting.getShadowOffset(s.CASTER_HEIGHT);
  const length = Math.hypot(offset.x, offset.y);
  const stretch = 1 + length / 60;

  const cx = s.BASE_X + offset.x * s.CENTER_FACTOR;
  const cy = s.BASE_Y + offset.y * s.CENTER_FACTOR;

  shadow.clear();
  shadow
    .ellipse(cx, cy, s.RADIUS_X * stretch, s.RADIUS_Y)
    .fill({ color: 0x000000, alpha: s.OUTER_ALPHA });
  shadow
    .ellipse(cx, cy, s.RADIUS_X * 0.7 * stretch, s.RADIUS_Y * 0.67)
    .fill({ color: 0x000000, alpha: s.INNER_ALPHA });
}
