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
