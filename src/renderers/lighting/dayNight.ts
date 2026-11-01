export interface TimeOfDayState {
  /** Light direction (degrees CCW from +X; 20 = low in the east/right, 160 = west/left). */
  angleDeg: number;
  elevationDeg: number;
  /** Ambient wash over the whole playfield. */
  tintColor: number;
  tintAlpha: number;
}

interface TintKey {
  phase: number;
  color: number;
  alpha: number;
}

/** Tint keyframes over one day; the last equals the first so the cycle wraps seamlessly. */
const TINT_KEYS: readonly TintKey[] = [
  { phase: 0, color: 0xff9a50, alpha: 0.1 }, // dawn
  { phase: 0.1, color: 0xffd9a0, alpha: 0 }, // morning
  { phase: 0.4, color: 0xffd9a0, alpha: 0 }, // afternoon
  { phase: 0.5, color: 0xff8a30, alpha: 0.11 }, // dusk
  { phase: 0.58, color: 0x2a2a70, alpha: 0.2 }, // nightfall
  { phase: 0.75, color: 0x0a1a48, alpha: 0.32 }, // midnight
  { phase: 0.92, color: 0x2a2a70, alpha: 0.2 }, // before dawn
  { phase: 1, color: 0xff9a50, alpha: 0.1 }, // dawn again
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: number, b: number, t: number): number {
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return (r << 16) | (g << 8) | bl;
}

/** Wrap any number into [0, 1). */
export function wrapPhase(phase: number): number {
  return ((phase % 1) + 1) % 1;
}

/**
 * Sun/moon position and ambient tint for a time of day. The sun crosses from the right to the left
 * during the day (low at dawn/dusk, high at noon); the moon makes the same trip at night, dimmer
 * and lower, so shadows and shading swing across the map over the cycle.
 */
export function getTimeOfDay(rawPhase: number): TimeOfDayState {
  const phase = wrapPhase(rawPhase);

  let angleDeg: number;
  let elevationDeg: number;
  if (phase < 0.5) {
    const t = phase / 0.5;
    angleDeg = 20 + 140 * t;
    elevationDeg = 15 + 55 * Math.sin(Math.PI * t);
  } else {
    const t = (phase - 0.5) / 0.5;
    angleDeg = 160 - 140 * t;
    elevationDeg = 20 + 25 * Math.sin(Math.PI * t);
  }

  let tint = TINT_KEYS[TINT_KEYS.length - 1];
  for (let i = 0; i < TINT_KEYS.length - 1; i++) {
    const from = TINT_KEYS[i];
    const to = TINT_KEYS[i + 1];
    if (phase >= from.phase && phase <= to.phase) {
      const t = (phase - from.phase) / (to.phase - from.phase);
      tint = {
        phase,
        color: lerpColor(from.color, to.color, t),
        alpha: lerp(from.alpha, to.alpha, t),
      };
      break;
    }
  }

  return { angleDeg, elevationDeg, tintColor: tint.color, tintAlpha: tint.alpha };
}
