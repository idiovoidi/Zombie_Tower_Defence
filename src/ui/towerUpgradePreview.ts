/** Trim to at most 2 decimals without trailing zeros: 7 -> "7", 0.918 -> "0.92", 0.85 -> "0.85". */
export function formatStat(value: number): string {
  return String(Number(value.toFixed(2)));
}

/**
 * "→ next" text for one stat, or '' when the upgrade leaves it unchanged
 * (so only stats that actually improve get a preview).
 */
export function previewStat(current: number, next: number, suffix = ''): string {
  return formatStat(current) === formatStat(next) ? '' : `→ ${formatStat(next)}${suffix}`;
}

export interface StatSnapshot {
  damage: number;
  range: number;
  fireRate: number;
}

/**
 * Preview column for the standard stat block (DMG / RNG / RATE / HP), one entry per line,
 * in the same order as the stats text. HP never changes on upgrade, so its line is blank.
 */
export function buildStandardPreview(current: StatSnapshot, next: StatSnapshot): string[] {
  return [
    previewStat(current.damage, next.damage),
    previewStat(current.range, next.range),
    previewStat(current.fireRate, next.fireRate, '/s'),
    '',
  ];
}
