import { GameConfig } from '../../config/gameConfig';

export interface HealthBarSpec {
  width: number;
  height: number;
  /** Y of the bar's top edge, relative to the zombie origin (negative = above). */
  offsetY: number;
}

const T = GameConfig.ZOMBIE_TYPES;

/**
 * Types that get a health bar by default: high-HP threats where "how close to dead" drives
 * focus-fire decisions. Small zombies stay clean (their tint already reads health) so big
 * crowds are not covered in bars. Offsets follow each renderer's sprite scale.
 */
const THREAT_BARS: Readonly<Record<string, HealthBarSpec>> = {
  [T.BOSS]: { width: 54, height: 5, offsetY: -46 },
  [T.NECRO_TANK]: { width: 48, height: 5, offsetY: -40 },
  [T.TANK]: { width: 38, height: 4, offsetY: -35 },
  [T.ARMORED]: { width: 30, height: 3, offsetY: -28 },
  [T.MECHANICAL]: { width: 30, height: 3, offsetY: -28 },
};

/** Bar used for any type when the "show all health bars" debug flag is on. */
export const DEFAULT_HEALTH_BAR: HealthBarSpec = { width: 30, height: 4, offsetY: -25 };

/** The bar a type shows by default, or null if it relies on tint alone. */
export function getThreatBarSpec(zombieType: string): HealthBarSpec | null {
  return THREAT_BARS[zombieType] ?? null;
}

/** Green while healthy, yellow when hurt, red when nearly dead. */
export function healthBarColor(percent: number): number {
  if (percent >= 50) {
    return 0x3ddc4a;
  }
  if (percent >= 25) {
    return 0xf2c230;
  }
  return 0xe5322d;
}

/** Bars only appear once a zombie is damaged, and never on a dead one. */
export function shouldShowHealthBar(percent: number, enabledForType: boolean): boolean {
  return enabledForType && percent > 0 && percent < 100;
}
