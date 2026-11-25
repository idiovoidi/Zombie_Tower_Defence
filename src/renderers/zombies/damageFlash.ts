import { ColorMatrixFilter } from 'pixi.js';

/** How far a hit flash pulls the zombie towards the flash colour (0 = none, 1 = solid colour). */
export const FLASH_STRENGTH = 0.65;

/**
 * Colour-matrix that mixes every pixel towards `color` by `strength`, keeping alpha.
 * Tint can only darken (multiply), so a flash needs this to read as a bright hit on dark zombies.
 */
export function flashMatrix(color: number, strength = FLASH_STRENGTH): number[] {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  const keep = 1 - strength;
  // biome-ignore format: 4x5 matrix layout
  return [
    keep, 0, 0, 0, r * strength,
    0, keep, 0, 0, g * strength,
    0, 0, keep, 0, b * strength,
    0, 0, 0, 1, 0,
  ];
}

// One shared filter per flash colour: filters hold no per-object state, so every flashing zombie
// of a type can reuse the same instance.
const flashFilters = new Map<number, ColorMatrixFilter>();

export function getFlashFilter(color: number): ColorMatrixFilter {
  let filter = flashFilters.get(color);
  if (!filter) {
    filter = new ColorMatrixFilter();
    filter.matrix = flashMatrix(color) as ColorMatrixFilter['matrix'];
    flashFilters.set(color, filter);
  }
  return filter;
}
