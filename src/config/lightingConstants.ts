/**
 * Pseudo-3D lighting tuning (see docs/Pseudo3D_Lighting_Plan.md).
 *
 * The light comes from the top-right by default. All effects (ground shadows, surface shading)
 * read one shared light from the LightingManager, so changing it moves everything together.
 */
export const LIGHTING = {
  /** Direction the light comes FROM, degrees counter-clockwise from +X (screen right). 45 = top-right. */
  DEFAULT_ANGLE_DEG: 45,
  /** Light height above the ground plane, degrees. 90 = straight overhead, low = long shadows. */
  DEFAULT_ELEVATION_DEG: 50,
  MIN_ELEVATION_DEG: 15,
  MAX_ELEVATION_DEG: 90,

  SHADOW: {
    /** Effective height of a tower body (px); shadow length = height / tan(elevation). */
    CASTER_HEIGHT: 16,
    /** Where the shadow starts: the tower's ground contact point, relative to its origin. */
    BASE_X: 0,
    BASE_Y: 15,
    /** Fraction of the full shadow length the ellipse centre is displaced by. */
    CENTER_FACTOR: 0.6,
    RADIUS_X: 27,
    RADIUS_Y: 9,
    OUTER_ALPHA: 0.2,
    INNER_ALPHA: 0.22,
  },

  /** Silhouette/edge shading applied to tower bases by TowerLightingFilter. */
  SURFACE: {
    /** How strongly lit/shadowed edges deviate from the flat brightness (0 = off). */
    INTENSITY: 1.7,
    /** Distance (px) between the samples used to estimate edge slope. */
    EDGE_SAMPLE_PX: 2,
    /** How much internal brightness edges (plates, details) contribute besides the silhouette. */
    DETAIL: 0.35,
  },

  /** Brief, soft glow around a tower's base when it fires. */
  SHOT_GLOW: {
    PEAK_ALPHA: 0.13,
    DURATION_MS: 130,
    RADIUS: 30,
    CENTER_Y: 6,
    DEFAULT_COLOR: 0xffd9a0,
    /** Warm white for ballistic towers, cool for energy, hot for fire. */
    COLORS: {
      MachineGun: 0xffd9a0,
      Sniper: 0xff6a4a,
      Shotgun: 0xffc27a,
      Flame: 0xffb030,
      Tesla: 0x4fd8ff,
      Grenade: 0xffa060,
      Sludge: 0x66ff55,
    } as Readonly<Record<string, number>>,
  },

  /**
   * Always-on soft light that energy/fire towers cast on the ground while idle or firing.
   * `flicker` 0 = smooth sine pulse, 1 = irregular fire-like flicker.
   */
  AMBIENT_GLOW: {
    RADIUS: 34,
    CENTER_Y: 6,
    TYPES: {
      Tesla: { color: 0x4fd8ff, minAlpha: 0.03, maxAlpha: 0.13, speedHz: 1.1, flicker: 0 },
      Flame: { color: 0xff8a1a, minAlpha: 0.03, maxAlpha: 0.17, speedHz: 5, flicker: 1 },
      Sludge: { color: 0x55ff55, minAlpha: 0.02, maxAlpha: 0.08, speedHz: 0.6, flicker: 0 },
    } as Readonly<
      Record<
        string,
        { color: number; minAlpha: number; maxAlpha: number; speedHz: number; flicker: number }
      >
    >,
  },

  /** Transient point lights (explosions, arcs, fire) that tint nearby towers. */
  ENVIRONMENT: {
    /** Peak alpha of the additive glow a fully-lit tower receives. */
    GLOW_ALPHA: 0.42,
    GLOW_RADIUS: 30,
    /** How far (px) the glow is shifted toward the light source, so it reads as directional. */
    GLOW_OFFSET: 7,
    MAX_LIGHTS: 24,
    EXPLOSION: { radius: 130, color: 0xffa040, intensity: 1, durationMs: 450 },
    TESLA_ARC: { radius: 80, color: 0x66e0ff, intensity: 0.8, durationMs: 170 },
    BURNING_GROUND: { radius: 90, color: 0xff7a20, intensity: 0.6, durationMs: 2000 },
  },

  /**
   * Day/night cycle, on by default. Phase 0 = dawn, 0.25 = noon, 0.5 = dusk, 0.75 = midnight.
   * Override with ?daynight=SECONDS (a custom day length) or ?daynight=0 (off); dev.dayNight(seconds)
   * changes it at runtime.
   */
  DAY_NIGHT: {
    /** One full day in game seconds. Level 1 runs ~10-12 game minutes, so about one day. */
    DEFAULT_CYCLE_SECONDS: 600,
    /** Each run starts here (just after dawn) so the opening minutes are in clear light. */
    START_PHASE: 0.08,
    /** Re-apply the light only after the phase has moved this much (avoids per-frame redraws). */
    APPLY_STEP: 0.002,
  },

  /** Tight halo that follows each projectile. */
  BULLET_GLOW: {
    RADIUS: 6,
    ALPHA: 0.24,
    /** Pulse as a fraction of scale (+/-). */
    PULSE_AMOUNT: 0.05,
    PULSE_SPEED: 14,
    DEFAULT_COLOR: 0xffff66,
    COLORS: {
      bullet: 0xffee55,
      sniper: 0xff6a3a,
      shotgun: 0xffa640,
      tesla: 0x4fd8ff,
      grenade: 0xff4a3a,
      sludge: 0x55ff55,
    } as Readonly<Record<string, number>>,
    /** Flame projectiles already draw their own fireball glow. */
    SKIP_TYPES: ['flame'] as readonly string[],
  },
} as const;
