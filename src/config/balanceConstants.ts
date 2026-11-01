/**
 * Combat / economy balance framework.
 *
 * Tower catalog numbers live in towerConstants.ts; zombie rewards in Zombie.ts.
 * Upgrade scaling and AoE extras are defined here so L1 purchase == authored base stats.
 *
 * Roles (range bands):
 *   Point (150–165): Shotgun, Flame, Sludge
 *   Mid   (200–220): MachineGun, Grenade, Tesla
 *   Long  (~525):    Sniper
 *
 * Economy: kill reward ≈ ~1/50 of a mid-tier tower cost for a basic zombie,
 * so early waves fund placement without snowballing into free max upgrades.
 */

/** Display level is 1..MAX; stat formulas use (level - 1) tiers. */
export const TOWER_MAX_LEVEL = 5;

export const BalanceConstants = {
  TOWER_MAX_LEVEL,

  /**
   * Per-tier multipliers after purchase (tier = upgradeLevel - 1).
   * L1 → ×1.0, L2 → +one tier, … L5 → +4 tiers.
   */
  UPGRADE: {
    /** Default damage growth per tier. */
    DAMAGE_PER_TIER: 0.35,
    /** Default range growth per tier. */
    RANGE_PER_TIER: 0.12,
    /** Default fire-rate growth per tier. */
    FIRE_RATE_PER_TIER: 0.08,
    /** Machine gun: weaker damage tiers, stronger fire-rate tiers. */
    MG_DAMAGE_PER_TIER: 0.2,
    MG_FIRE_RATE_PER_TIER: 0.22,
    /** Grenade: weaker damage tiers (blast radius carries upgrades). */
    GRENADE_DAMAGE_PER_TIER: 0.15,
  },

  TESLA: {
    /** Max distance for chain lightning jumps (world px). */
    CHAIN_RANGE: 100,
    /** Damage retained per hop. */
    DAMAGE_PER_HOP: 0.65,
  },

  GRENADE: {
    BASE_BLAST_RADIUS: 38,
    BLAST_RADIUS_PER_TIER: 8,
  },
} as const;

/** Convert display level (1-based) to upgrade tiers above base. */
export function upgradeTier(upgradeLevel: number): number {
  return Math.max(0, upgradeLevel - 1);
}

export function scaleStat(base: number, perTier: number, upgradeLevel: number): number {
  return base * (1 + upgradeTier(upgradeLevel) * perTier);
}
