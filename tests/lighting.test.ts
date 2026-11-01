import { describe, expect, test, vi } from 'vitest';
import { LightingManager } from '../src/renderers/lighting/LightingManager';
import { bulletGlowScale, shotGlowAlpha } from '../src/renderers/lighting/glowMath';

describe('LightingManager', () => {
  test('default light comes from the top-right and shadows fall down-left', () => {
    const lm = new LightingManager();
    const v = lm.getLightVector();
    expect(v.x).toBeGreaterThan(0); // from the right
    expect(v.y).toBeLessThan(0); // from above (screen Y is down)
    expect(v.z).toBeGreaterThan(0);
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1);

    const shadow = lm.getShadowOffset(16);
    expect(shadow.x).toBeLessThan(0);
    expect(shadow.y).toBeGreaterThan(0);
  });

  test('default shadow matches the hand-tuned original (~(-6, +6) from the base)', () => {
    const lm = new LightingManager();
    const s = lm.getShadowOffset(16);
    expect(s.x * 0.6).toBeCloseTo(-5.7, 0);
    expect(s.y * 0.6).toBeCloseTo(5.7, 0);
  });

  test('a lower light throws a longer shadow; overhead throws almost none', () => {
    const lm = new LightingManager();
    lm.setLightDirection(45, 20);
    const low = Math.hypot(lm.getShadowOffset(16).x, lm.getShadowOffset(16).y);
    lm.setLightDirection(45, 90);
    const high = Math.hypot(lm.getShadowOffset(16).x, lm.getShadowOffset(16).y);
    expect(low).toBeGreaterThan(high * 10);
    expect(high).toBeCloseTo(0, 5);
  });

  test('light from the left casts the shadow to the right', () => {
    const lm = new LightingManager();
    lm.setLightDirection(180, 50);
    expect(lm.getShadowOffset(16).x).toBeGreaterThan(0);
    expect(lm.getLightVector().x).toBeLessThan(0);
  });

  test('angle wraps and elevation clamps', () => {
    const lm = new LightingManager();
    lm.setLightDirection(-90, 500);
    expect(lm.getAngleDeg()).toBe(270);
    expect(lm.getElevationDeg()).toBe(90);
    lm.setLightDirection(720 + 10, -50);
    expect(lm.getAngleDeg()).toBe(10);
    expect(lm.getElevationDeg()).toBe(15);
  });

  test('subscribers are told on change only, and can unsubscribe', () => {
    const lm = new LightingManager();
    const spy = vi.fn();
    const off = lm.subscribe(spy);
    lm.setLightDirection(90, 40);
    expect(spy).toHaveBeenCalledTimes(1);
    lm.setLightDirection(90, 40); // unchanged
    expect(spy).toHaveBeenCalledTimes(1);
    off();
    lm.setLightDirection(10, 40);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('surface shading is opt-in', () => {
    const lm = new LightingManager();
    expect(lm.isSurfaceShadingEnabled()).toBe(false);
    lm.setSurfaceShadingEnabled(true);
    expect(lm.isSurfaceShadingEnabled()).toBe(true);
  });
});

describe('glow math', () => {
  test('shot glow starts at the peak, eases out, and ends at zero', () => {
    expect(shotGlowAlpha(0, 0.13, 130)).toBeCloseTo(0.13);
    const mid = shotGlowAlpha(65, 0.13, 130);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(0.13 / 2 + 1e-9); // ease-out: below the linear midpoint
    expect(shotGlowAlpha(130, 0.13, 130)).toBe(0);
    expect(shotGlowAlpha(500, 0.13, 130)).toBe(0);
    expect(shotGlowAlpha(-5, 0.13, 130)).toBe(0);
  });

  test('bullet halo pulses within +/- amount of 1', () => {
    for (let t = 0; t < 2; t += 0.05) {
      const s = bulletGlowScale(t, 0.05, 14);
      expect(s).toBeGreaterThanOrEqual(0.95 - 1e-9);
      expect(s).toBeLessThanOrEqual(1.05 + 1e-9);
    }
    expect(bulletGlowScale(0, 0.05, 14)).toBe(1);
  });
});

describe('tower lighting filter safety', () => {
  test('no filter unless surface shading is enabled, and never without WebGL2 support', async () => {
    const { getTowerLightingFilter, isTowerLightingSupported, resetTowerLightingFilter } =
      await import('../src/renderers/lighting/TowerLightingFilter');
    resetTowerLightingFilter();

    const lm = new LightingManager();
    expect(getTowerLightingFilter(lm)).toBeNull(); // disabled by default

    lm.setSurfaceShadingEnabled(true);
    // Node test env has no DOM/WebGL2: the shader pre-check must say "unsupported" instead of
    // letting Pixi compile it lazily (which would leave filtered sprites invisible)
    expect(isTowerLightingSupported()).toBe(false);
    expect(getTowerLightingFilter(lm)).toBeNull();
  });
});

describe('ambient glow curve', () => {
  const sine = { minAlpha: 0.03, maxAlpha: 0.13, speedHz: 1, flicker: 0 };
  const fire = { minAlpha: 0.03, maxAlpha: 0.14, speedHz: 5, flicker: 1 };

  test('always stays within [min, max]', async () => {
    const { ambientGlowAlpha } = await import('../src/renderers/lighting/glowMath');
    for (const cfg of [sine, fire, { ...fire, flicker: 0.5 }]) {
      for (let t = 0; t < 20; t += 0.013) {
        const a = ambientGlowAlpha(t, cfg);
        expect(a).toBeGreaterThanOrEqual(cfg.minAlpha - 1e-9);
        expect(a).toBeLessThanOrEqual(cfg.maxAlpha + 1e-9);
      }
    }
  });

  test('the smooth pulse repeats every period and reaches both extremes', async () => {
    const { ambientGlowAlpha } = await import('../src/renderers/lighting/glowMath');
    expect(ambientGlowAlpha(0.3, sine)).toBeCloseTo(ambientGlowAlpha(1.3, sine));
    expect(ambientGlowAlpha(0.25, sine)).toBeCloseTo(sine.maxAlpha); // sin peak at 1/4 period
    expect(ambientGlowAlpha(0.75, sine)).toBeCloseTo(sine.minAlpha);
  });

  test('flicker is irregular (not periodic like the sine) but deterministic', async () => {
    const { ambientGlowAlpha } = await import('../src/renderers/lighting/glowMath');
    const period = 1 / fire.speedHz;
    expect(ambientGlowAlpha(0.37, fire)).toBe(ambientGlowAlpha(0.37, fire));
    expect(
      Math.abs(ambientGlowAlpha(0.37, fire) - ambientGlowAlpha(0.37 + period, fire))
    ).toBeGreaterThan(1e-3);
  });
});
