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

export interface AmbientGlowConfig {
  minAlpha: number;
  maxAlpha: number;
  speedHz: number;
  /** 0 = smooth sine pulse, 1 = fully irregular flicker. */
  flicker: number;
}

/**
 * Alpha of a tower's idle light at `timeSec`. Always within [minAlpha, maxAlpha]. A smooth sine
 * pulse for energy towers, blended toward an irregular (but deterministic) flicker for fire.
 */
export function ambientGlowAlpha(timeSec: number, config: AmbientGlowConfig): number {
  const pulse = 0.5 + 0.5 * Math.sin(timeSec * config.speedHz * Math.PI * 2);
  // Product of two sines clusters around the middle, so stretch it to use the full range
  const raw =
    0.5 +
    0.5 * Math.sin(timeSec * config.speedHz * 7.3) * Math.sin(timeSec * config.speedHz * 4.1 + 1.3);
  const flicker = Math.min(1, Math.max(0, 0.5 + (raw - 0.5) * 2.6));
  const mix = Math.min(1, Math.max(0, config.flicker));
  const level = pulse * (1 - mix) + flicker * mix;
  return config.minAlpha + (config.maxAlpha - config.minAlpha) * level;
}
