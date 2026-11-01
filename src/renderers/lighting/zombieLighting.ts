/** Multiply two 0xRRGGBB colours channel-wise (how Pixi combines tints). */
export function multiplyTint(a: number, b: number): number {
  const r = Math.round((((a >> 16) & 255) * ((b >> 16) & 255)) / 255);
  const g = Math.round((((a >> 8) & 255) * ((b >> 8) & 255)) / 255);
  const bl = Math.round(((a & 255) * (b & 255)) / 255);
  return (r << 16) | (g << 8) | bl;
}

/** Highest strength of colour cast applied (1 = a fully lit zombie takes 70% of the light's hue). */
const MAX_CAST = 0.7;

/**
 * Colour cast for a sprite lit by a nearby coloured light, as a multiply tint.
 *
 * A tint can only darken, so the light colour is first normalised so its brightest channel is
 * 1: that shifts the hue (fire -> warm, Tesla -> cool) without dimming the sprite. Strength
 * 0 returns white (no change).
 */
export function lightCastTint(strength: number, lightColor: number): number {
  const amount = Math.min(1, Math.max(0, strength)) * MAX_CAST;
  if (amount <= 0) {
    return 0xffffff;
  }
  const r = (lightColor >> 16) & 255;
  const g = (lightColor >> 8) & 255;
  const b = lightColor & 255;
  const peak = Math.max(r, g, b);
  if (peak === 0) {
    return 0xffffff;
  }
  const channel = (c: number): number => Math.round(255 * (1 - amount + (amount * c) / peak));
  return (channel(r) << 16) | (channel(g) << 8) | channel(b);
}
