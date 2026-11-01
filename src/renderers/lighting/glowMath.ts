/**
 * Alpha of a firing flash `ageMs` after the shot: starts at `peak`, eases out to 0 over
 * `durationMs`, then stays 0.
 */
export function shotGlowAlpha(ageMs: number, peak: number, durationMs: number): number {
  if (ageMs < 0 || ageMs >= durationMs || durationMs <= 0) {
    return 0;
  }
  const remaining = 1 - ageMs / durationMs;
  return peak * remaining * remaining;
}

/** Projectile halo scale: 1 +/- amount, oscillating at `speed` rad/s. */
export function bulletGlowScale(timeSec: number, amount: number, speed: number): number {
  return 1 + Math.sin(timeSec * speed) * amount;
}
