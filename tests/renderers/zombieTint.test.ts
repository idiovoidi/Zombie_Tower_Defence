import { describe, expect, test, vi } from 'vitest';

vi.mock('pixi.js', () => ({
  ColorMatrixFilter: class {
    matrix: number[] = [];
  },
  Container: class {},
  Graphics: class {},
}));

const { BURNING_TINT, composeZombieTint } = await import(
  '../../src/renderers/zombies/BaseZombieRenderer'
);
const { flashMatrix, getFlashFilter } = await import('../../src/renderers/zombies/damageFlash');

/** Apply a 4x5 colour matrix (offsets in 0..1, as Pixi's shader does) to an rgb triple. */
function applyMatrix(m: number[], [r, g, b]: [number, number, number]): number[] {
  return [0, 1, 2].map(
    row => m[row * 5] * r + m[row * 5 + 1] * g + m[row * 5 + 2] * b + m[row * 5 + 4]
  );
}

describe('zombie tint layers', () => {
  test('burning survives the per-frame health tint', () => {
    // Health greying is re-applied every frame; burning lives on its own layer
    const healthy = composeZombieTint(0xffffff, BURNING_TINT, 0xffffff);
    const hurt = composeZombieTint(0xaaaaaa, BURNING_TINT, 0xffffff);
    expect(healthy).toBe(BURNING_TINT);
    // Still orange-leaning (red > blue) once greyed
    expect((hurt >> 16) & 255).toBeGreaterThan(hurt & 255);
  });

  test('no layers = untinted, and the light cast multiplies on top', () => {
    expect(composeZombieTint(0xffffff, 0xffffff, 0xffffff)).toBe(0xffffff);
    expect(composeZombieTint(0xffffff, 0xffffff, 0xffcc99)).toBe(0xffcc99);
  });
});

describe('hit flash', () => {
  test('brightens a dark zombie towards the flash colour (tint could only darken it)', () => {
    const dark: [number, number, number] = [0x2d / 255, 0x50 / 255, 0x16 / 255];
    const [r, g, b] = applyMatrix(flashMatrix(0xffffff), dark);
    expect(r).toBeGreaterThan(dark[0]);
    expect(g).toBeGreaterThan(dark[1]);
    expect(b).toBeGreaterThan(dark[2]);
  });

  test('a red flash pushes red up on a green zombie', () => {
    const green: [number, number, number] = [0x2d / 255, 0x50 / 255, 0x16 / 255];
    const [r] = applyMatrix(flashMatrix(0xff0000), green);
    expect(r).toBeGreaterThan(0.6);
  });

  test('one shared filter per colour', () => {
    expect(getFlashFilter(0x00ffff)).toBe(getFlashFilter(0x00ffff));
    expect(getFlashFilter(0x00ffff)).not.toBe(getFlashFilter(0xff0000));
  });
});
