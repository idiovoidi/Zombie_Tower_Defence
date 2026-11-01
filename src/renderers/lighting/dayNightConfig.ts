/**
 * Day length (game seconds) requested by a URL query string.
 *
 *  - no `daynight` parameter (or an empty/invalid/negative one) -> `fallback` (the default length)
 *  - `?daynight=0`  -> 0, meaning the cycle is turned off
 *  - `?daynight=N`  -> N seconds per full day
 */
export function parseDayNightSeconds(search: string, fallback: number): number {
  const raw = new URLSearchParams(search).get('daynight');
  if (raw === null || raw.trim() === '') {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}
