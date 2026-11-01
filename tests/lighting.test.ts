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

describe('time of day', () => {
  test('sun is low in the east at dawn, highest at noon, low in the west at dusk', async () => {
    const { getTimeOfDay } = await import('../src/renderers/lighting/dayNight');
    const dawn = getTimeOfDay(0);
    const noon = getTimeOfDay(0.25);
    const dusk = getTimeOfDay(0.5);
    expect(dawn.angleDeg).toBeLessThan(45); // from the right
    expect(dusk.angleDeg).toBeGreaterThan(135); // from the left
    expect(noon.elevationDeg).toBeGreaterThan(dawn.elevationDeg + 30);
    expect(noon.elevationDeg).toBeGreaterThan(dusk.elevationDeg + 30);
  });

  test('midnight is the darkest and bluest; noon has no tint', async () => {
    const { getTimeOfDay } = await import('../src/renderers/lighting/dayNight');
    const noon = getTimeOfDay(0.25);
    const night = getTimeOfDay(0.75);
    expect(noon.tintAlpha).toBe(0);
    expect(night.tintAlpha).toBeGreaterThan(0.25);
    expect(night.tintColor & 255).toBeGreaterThan((night.tintColor >> 16) & 255); // blue > red
    for (let p = 0; p <= 1; p += 0.01) {
      expect(getTimeOfDay(p).tintAlpha).toBeLessThanOrEqual(night.tintAlpha + 1e-9);
    }
  });

  test('the cycle wraps seamlessly and negative/large phases are normalised', async () => {
    const { getTimeOfDay, wrapPhase } = await import('../src/renderers/lighting/dayNight');
    const a = getTimeOfDay(0);
    const b = getTimeOfDay(0.999999);
    expect(b.tintAlpha).toBeCloseTo(a.tintAlpha, 3);
    expect(b.tintColor).toBe(a.tintColor);
    expect(wrapPhase(-0.25)).toBeCloseTo(0.75);
    expect(wrapPhase(3.25)).toBeCloseTo(0.25);
    expect(getTimeOfDay(1.25).angleDeg).toBeCloseTo(getTimeOfDay(0.25).angleDeg);
  });

  test('tint changes smoothly: no jumps between neighbouring phases', async () => {
    const { getTimeOfDay } = await import('../src/renderers/lighting/dayNight');
    let prev = getTimeOfDay(0);
    for (let p = 0.005; p <= 1.0001; p += 0.005) {
      const cur = getTimeOfDay(p);
      expect(Math.abs(cur.tintAlpha - prev.tintAlpha)).toBeLessThan(0.03);
      expect(Math.abs(cur.elevationDeg - prev.elevationDeg)).toBeLessThan(8);
      prev = cur;
    }
  });

  test('LightingManager applies the phase to light + tint, and cycles with game time', () => {
    const lm = new LightingManager();
    const spy = vi.fn();
    lm.subscribe(spy);
    lm.setTimeOfDay(0.75);
    expect(spy).toHaveBeenCalled();
    expect(lm.getAmbientTint().alpha).toBeGreaterThan(0.25);

    const lm2 = new LightingManager();
    expect(lm2.isDayNightActive()).toBe(false);
    lm2.setDayNightCycle(100); // 100s per day
    lm2.update(25_000); // a quarter of a day
    expect(lm2.getTimeOfDayPhase()).toBeCloseTo(0.25);
    expect(lm2.getElevationDeg()).toBeGreaterThan(60); // around noon
    lm2.setDayNightCycle(0);
    expect(lm2.isDayNightActive()).toBe(false);
    expect(lm2.getAmbientTint().alpha).toBe(0);
  });

  test('a paused game (0ms) does not advance the cycle', () => {
    const lm = new LightingManager();
    lm.setDayNightCycle(60);
    lm.update(0);
    expect(lm.getTimeOfDayPhase()).toBe(0);
  });
});

describe('environmental point lights', () => {
  const light = { x: 100, y: 100, radius: 100, color: 0xff8000 };

  test('unlit when nothing is in range', () => {
    const lm = new LightingManager();
    expect(lm.sampleEnvironment(0, 0).strength).toBe(0);
    lm.addPointLight(light);
    expect(lm.sampleEnvironment(300, 300).strength).toBe(0); // outside radius
  });

  test('strength falls off with distance and the glow points toward the light', () => {
    const lm = new LightingManager();
    lm.addPointLight(light);
    const near = lm.sampleEnvironment(80, 100); // light is to the right
    const far = lm.sampleEnvironment(20, 100);
    expect(near.strength).toBeGreaterThan(far.strength);
    expect(near.dirX).toBeCloseTo(1);
    expect(near.dirY).toBeCloseTo(0);
    expect(near.color).toBe(0xff8000);
  });

  test('timed lights fade out and then disappear', () => {
    const lm = new LightingManager();
    lm.addPointLight({ ...light, durationMs: 400 });
    const full = lm.sampleEnvironment(100, 100).strength; // on top of it
    lm.update(200);
    const half = lm.sampleEnvironment(100, 100).strength;
    expect(half).toBeCloseTo(full / 2);
    lm.update(250);
    expect(lm.hasPointLights()).toBe(false);
    expect(lm.sampleEnvironment(100, 100).strength).toBe(0);
  });

  test('persistent lights stay; removal by id works', () => {
    const lm = new LightingManager();
    const id = lm.addPointLight(light);
    lm.update(60_000);
    expect(lm.hasPointLights()).toBe(true);
    lm.removePointLight(id);
    expect(lm.hasPointLights()).toBe(false);
  });

  test('multiple lights blend their colours and strengths (capped at 1)', () => {
    const lm = new LightingManager();
    lm.addPointLight({ x: 100, y: 100, radius: 100, color: 0xff0000 });
    lm.addPointLight({ x: 100, y: 100, radius: 100, color: 0x0000ff });
    const s = lm.sampleEnvironment(100, 100);
    expect(s.strength).toBe(1); // 2.0 summed, capped
    expect((s.color >> 16) & 255).toBeGreaterThan(100); // some red
    expect(s.color & 255).toBeGreaterThan(100); // some blue
  });

  test('light count is capped so a barrage cannot grow without bound', () => {
    const lm = new LightingManager();
    // Tiny, well-spaced lights so each one only affects its own spot
    for (let i = 0; i < 100; i++) {
      lm.addPointLight({ x: i * 50, y: 100, radius: 10, color: 0xffffff });
    }
    // The oldest are dropped; only the newest MAX_LIGHTS survive
    expect(lm.sampleEnvironment(0, 100).strength).toBe(0);
    expect(lm.sampleEnvironment(75 * 50, 100).strength).toBe(0);
    expect(lm.sampleEnvironment(99 * 50, 100).strength).toBeGreaterThan(0);
    expect(lm.sampleEnvironment(76 * 50, 100).strength).toBeGreaterThan(0); // 100 - 24 = 76
  });
});

describe('day/night is on by default', () => {
  test('URL handling: absent = default length, 0 = off, N = custom, junk = default', async () => {
    const { parseDayNightSeconds } = await import('../src/renderers/lighting/dayNightConfig');
    const D = 600;
    expect(parseDayNightSeconds('', D)).toBe(D);
    expect(parseDayNightSeconds('?skipMenu=1', D)).toBe(D);
    expect(parseDayNightSeconds('?daynight=', D)).toBe(D);
    expect(parseDayNightSeconds('?daynight=0', D)).toBe(0);
    expect(parseDayNightSeconds('?daynight=90', D)).toBe(90);
    expect(parseDayNightSeconds('?daynight=1.5', D)).toBe(1.5);
    expect(parseDayNightSeconds('?daynight=abc', D)).toBe(D);
    expect(parseDayNightSeconds('?daynight=-5', D)).toBe(D);
    expect(parseDayNightSeconds('?a=1&daynight=45&b=2', D)).toBe(45);
  });

  test('every run starts in clear morning light, not in the dark', async () => {
    const { LIGHTING } = await import('../src/config/lightingConstants');
    const { getTimeOfDay } = await import('../src/renderers/lighting/dayNight');
    const start = getTimeOfDay(LIGHTING.DAY_NIGHT.START_PHASE);
    expect(start.tintAlpha).toBeLessThan(0.08);
    expect(start.angleDeg).toBeLessThan(60); // sun still in the east
    expect(LIGHTING.DAY_NIGHT.DEFAULT_CYCLE_SECONDS).toBeGreaterThanOrEqual(300);
  });

  test('restartDay resets to the start time only while a cycle is running', async () => {
    const { LIGHTING } = await import('../src/config/lightingConstants');
    const lm = new LightingManager();
    lm.restartDay(); // no cycle: nothing happens
    expect(lm.getAmbientTint().alpha).toBe(0);
    expect(lm.getTimeOfDayPhase()).toBe(0);

    lm.setDayNightCycle(600);
    lm.update(450_000); // 0.75 of a day: midnight
    expect(lm.getAmbientTint().alpha).toBeGreaterThan(0.25);
    lm.restartDay();
    expect(lm.getTimeOfDayPhase()).toBeCloseTo(LIGHTING.DAY_NIGHT.START_PHASE);
    expect(lm.getAmbientTint().alpha).toBeLessThan(0.08);
  });
});

describe('zombie light cast tint', () => {
  test('multiplyTint multiplies channels and white is neutral', async () => {
    const { multiplyTint } = await import('../src/renderers/lighting/zombieLighting');
    expect(multiplyTint(0xffffff, 0x336699)).toBe(0x336699);
    expect(multiplyTint(0x888888, 0xffffff)).toBe(0x888888);
    expect(multiplyTint(0xff8040, 0x808080)).toBe(0x804020);
    expect(multiplyTint(0x000000, 0xffffff)).toBe(0);
  });

  test('no light -> white; fire casts a warm hue without dimming the brightest channel', async () => {
    const { lightCastTint } = await import('../src/renderers/lighting/zombieLighting');
    expect(lightCastTint(0, 0xff8a20)).toBe(0xffffff);
    const warm = lightCastTint(1, 0xff8a20);
    const r = (warm >> 16) & 255;
    const g = (warm >> 8) & 255;
    const b = warm & 255;
    expect(r).toBe(255); // brightest channel untouched: shifts hue, does not darken
    expect(g).toBeLessThan(255);
    expect(b).toBeLessThan(g); // orange: blue reduced most
  });

  test('a cool light (Tesla) casts blue; stronger light casts more; strength clamps', async () => {
    const { lightCastTint } = await import('../src/renderers/lighting/zombieLighting');
    const cool = lightCastTint(1, 0x66e0ff);
    expect(cool & 255).toBe(255);
    expect((cool >> 16) & 255).toBeLessThan(255);
    const weak = lightCastTint(0.2, 0xff8a20) & 255;
    const strong = lightCastTint(0.9, 0xff8a20) & 255;
    expect(strong).toBeLessThan(weak);
    expect(lightCastTint(5, 0xff8a20)).toBe(lightCastTint(1, 0xff8a20));
    expect(lightCastTint(1, 0x000000)).toBe(0xffffff);
  });
});
