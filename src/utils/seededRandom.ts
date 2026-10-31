/**
 * Deterministic pseudo-random helpers used by procedural renderers so that a
 * given map always draws the same terrain, decals, fog, etc.
 */

/** Hash a string into a positive, non-zero 32-bit integer seed. */
export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

/** Park–Miller LCG. Returns a function yielding floats in [0, 1). */
export function createSeededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) {
    s += 2147483646;
  }
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
