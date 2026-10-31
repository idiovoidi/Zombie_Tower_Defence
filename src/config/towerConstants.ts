import type { Graphics } from 'pixi.js';
import { debugMulFloor } from '../debug/debugScale';
import { BalanceConstants, scaleStat, upgradeTier } from './balanceConstants';
import { DebugConstants } from './debugConstants';

/**
 * Tower Constants - Centralized tower stats for easy balancing
 *
 * Base stats are what a freshly placed (level 1) tower uses.
 * Upgrade scaling is in balanceConstants.ts (tiers = level - 1).
 *
 * Economy scale: costs are authored at 1/10 of the original catalog (MG 25, Sniper 90, ...)
 * and ranges at 1.5x the original role bands, matching the values the waves were tuned against.
 * Rough base DPS/$ targets (single-target, ignoring AoE), ~10x the old figures:
 *   MG ~1.4 | Shotgun ~0.8 | Sniper ~0.9 | Flame ~0.7
 *   Tesla ~0.4 ST (~0.9 with chains) | Grenade ~0.07 ST (~0.3 with blast)
 */

export type IdleAnimationType =
  | 'none'
  | 'machineGun'
  | 'sniper'
  | 'shotgun'
  | 'flame'
  | 'tesla'
  | 'grenade'
  | 'sludge';

export interface TowerStats {
  cost: number;
  damage: number;
  range: number;
  fireRate: number; // shots per second
  health: number;
  specialAbility?: string;
  upgradeCostMultiplier?: number;
  idleAnimation: IdleAnimationType;
  barrelLength: number;
  barrelLengthUpgradeBonus: number;
  projectileType: string;
  ghostDraw: (graphics: Graphics) => void;
}

// Ghost tower draw functions - centralized to eliminate switch statements
const ghostDrawMachineGun = (g: Graphics) => {
  g.circle(0, 0, 20).fill(0x0000ff);
  g.moveTo(0, -20).lineTo(0, -35).stroke({ width: 3, color: 0x4169e1 });
};

const ghostDrawSniper = (g: Graphics) => {
  g.ellipse(0, 0, 15, 25).fill(0x2f4f4f);
  g.moveTo(0, -25).lineTo(0, -45).stroke({ width: 2, color: 0x696969 });
};

const ghostDrawShotgun = (g: Graphics) => {
  g.roundRect(-18, -18, 36, 36, 8).fill(0x8b4513);
};

const ghostDrawFlame = (g: Graphics) => {
  g.circle(0, 0, 20).fill(0xff4500);
};

const ghostDrawTesla = (g: Graphics) => {
  g.circle(0, 0, 20).fill(0x00ced1);
  g.circle(0, 0, 10).fill(0x7fffd4);
};

const ghostDrawGrenade = (g: Graphics) => {
  g.rect(-20, -5, 40, 25).fill(0x6b8e23);
  g.rect(-20, -5, 40, 25).stroke({ width: 2, color: 0x556b2f });
  g.rect(-12, 2, 10, 8).fill(0x8b7355);
  g.rect(2, 2, 10, 8).fill(0x8b7355);
  g.circle(-7, 6, 2).fill(0x2f4f2f);
  g.circle(7, 6, 2).fill(0x2f4f2f);
};

const ghostDrawSludge = (g: Graphics) => {
  g.rect(-18, -5, 36, 25).fill(0x4a5a3a);
  g.rect(-18, -5, 36, 25).stroke({ width: 2, color: 0x3a4a2a });
  g.rect(-10, 0, 8, 12).fill(0x228b22);
  g.rect(2, 0, 8, 12).fill(0x228b22);
  g.circle(-6, 6, 3).fill({ color: 0x00ff00, alpha: 0.7 });
  g.circle(6, 6, 3).fill({ color: 0x00ff00, alpha: 0.7 });
  g.circle(-6, 6, 5).fill({ color: 0x32cd32, alpha: 0.3 });
  g.circle(6, 6, 5).fill({ color: 0x32cd32, alpha: 0.3 });
};

export const TowerConstants = {
  // Machine Gun — cheap swarm shredder (mid range, high RoF)
  MACHINE_GUN: {
    cost: 25,
    damage: 5,
    range: 210,
    fireRate: 7,
    health: 120,
    specialAbility: 'High fire rate, upgrades increase speed',
    upgradeCostMultiplier: 0.75,
    idleAnimation: 'machineGun',
    barrelLength: 18,
    barrelLengthUpgradeBonus: 1,
    projectileType: 'bullet',
    ghostDraw: ghostDrawMachineGun,
  } as TowerStats,

  // Sniper — long-range single target; high overkill risk on swarms
  SNIPER: {
    cost: 90,
    damage: 95,
    range: 525,
    fireRate: 0.85,
    health: 80,
    specialAbility: 'High single-target damage, armor-piercing',
    upgradeCostMultiplier: 0.75,
    idleAnimation: 'sniper',
    barrelLength: 24,
    barrelLengthUpgradeBonus: 2,
    projectileType: 'sniper',
    ghostDraw: ghostDrawSniper,
  } as TowerStats,

  // Shotgun — short cone burst
  SHOTGUN: {
    cost: 40,
    damage: 40,
    range: 165,
    fireRate: 0.8,
    health: 100,
    specialAbility: 'Double barrel: 2 quick shots then reload, cone spread',
    upgradeCostMultiplier: 0.75,
    idleAnimation: 'shotgun',
    barrelLength: 16,
    barrelLengthUpgradeBonus: 0,
    projectileType: 'shotgun',
    ghostDraw: ghostDrawShotgun,
  } as TowerStats,

  // Flame — short DoT / area burn (damage is burst; burn carries DPS)
  FLAME: {
    cost: 75,
    damage: 100,
    range: 165,
    fireRate: 0.5,
    health: 90,
    specialAbility: 'Area damage over time, burning effect',
    upgradeCostMultiplier: 0.75,
    idleAnimation: 'flame',
    barrelLength: 16,
    barrelLengthUpgradeBonus: 0,
    projectileType: 'flame',
    ghostDraw: ghostDrawFlame,
  } as TowerStats,

  // Tesla — mid chain lightning (ST DPS intentionally low; chains add value)
  TESLA: {
    cost: 150,
    damage: 55,
    range: 217,
    fireRate: 1.2,
    health: 110,
    specialAbility: 'Chain lightning, affects multiple targets',
    upgradeCostMultiplier: 0.75,
    idleAnimation: 'tesla',
    barrelLength: 17,
    barrelLengthUpgradeBonus: 0,
    projectileType: 'tesla',
    ghostDraw: ghostDrawTesla,
  } as TowerStats,

  // Grenade — slow inaccurate blast (ST weak; clumps are the job)
  GRENADE: {
    cost: 125,
    damage: 32,
    range: 202,
    fireRate: 0.28,
    health: 95,
    specialAbility: 'Explosive area damage, inaccurate arc (RNG cone)',
    upgradeCostMultiplier: 0.75,
    idleAnimation: 'grenade',
    barrelLength: 20,
    barrelLengthUpgradeBonus: 0,
    projectileType: 'grenade',
    ghostDraw: ghostDrawGrenade,
  } as TowerStats,

  // Sludge — pure CC
  SLUDGE: {
    cost: 80,
    damage: 0,
    range: 150,
    fireRate: 0.25,
    health: 110,
    specialAbility: 'Creates toxic pools that slow zombies',
    upgradeCostMultiplier: 0.6,
    idleAnimation: 'sludge',
    barrelLength: 10,
    barrelLengthUpgradeBonus: 2,
    projectileType: 'sludge',
    ghostDraw: ghostDrawSludge,
  } as TowerStats,
};

/**
 * Get tower stats by type name
 */
export function getTowerStats(type: string): TowerStats | undefined {
  switch (type) {
    case 'MachineGun':
      return TowerConstants.MACHINE_GUN;
    case 'Sniper':
      return TowerConstants.SNIPER;
    case 'Shotgun':
      return TowerConstants.SHOTGUN;
    case 'Flame':
      return TowerConstants.FLAME;
    case 'Tesla':
      return TowerConstants.TESLA;
    case 'Grenade':
      return TowerConstants.GRENADE;
    case 'Sludge':
      return TowerConstants.SLUDGE;
    default:
      return undefined;
  }
}

function withTowerStats<T>(type: string, fn: (stats: TowerStats) => T, defaultValue: T): T {
  const stats = getTowerStats(type);
  if (!stats) {
    return defaultValue;
  }
  return fn(stats);
}

/**
 * Calculate tower damage with upgrades.
 * Level 1 uses base damage; further levels add tiers from BalanceConstants.
 */
export function calculateTowerDamage(type: string, upgradeLevel: number): number {
  return withTowerStats(
    type,
    stats => {
      const { UPGRADE } = BalanceConstants;
      let perTier: number = UPGRADE.DAMAGE_PER_TIER;
      if (type === 'MachineGun') {
        perTier = UPGRADE.MG_DAMAGE_PER_TIER;
      } else if (type === 'Grenade') {
        perTier = UPGRADE.GRENADE_DAMAGE_PER_TIER;
      }
      return Math.floor(scaleStat(stats.damage, perTier, upgradeLevel));
    },
    0
  );
}

/**
 * Calculate tower range with upgrades (L1 = base range).
 */
export function calculateTowerRange(type: string, upgradeLevel: number): number {
  return withTowerStats(
    type,
    stats =>
      Math.floor(scaleStat(stats.range, BalanceConstants.UPGRADE.RANGE_PER_TIER, upgradeLevel)),
    0
  );
}

/**
 * Calculate tower fire rate with upgrades (L1 = base fire rate).
 */
export function calculateTowerFireRate(type: string, upgradeLevel: number): number {
  return withTowerStats(
    type,
    stats => {
      const perTier =
        type === 'MachineGun'
          ? BalanceConstants.UPGRADE.MG_FIRE_RATE_PER_TIER
          : BalanceConstants.UPGRADE.FIRE_RATE_PER_TIER;
      return scaleStat(stats.fireRate, perTier, upgradeLevel);
    },
    0
  );
}

/**
 * Calculate upgrade cost for the next upgrade at the given level.
 * Formula: baseCost × (upgradeLevel + 1) × upgradeCostMultiplier × debug multiplier
 */
export function calculateUpgradeCost(type: string, upgradeLevel: number): number {
  return withTowerStats(
    type,
    stats => {
      const multiplier = stats.upgradeCostMultiplier || 0.75;
      const cost = Math.floor(stats.cost * (upgradeLevel + 1) * multiplier);
      return debugMulFloor(cost, DebugConstants.UPGRADE_COST_MULTIPLIER);
    },
    0
  );
}

/** Grenade blast radius at the given display level. */
export function calculateGrenadeBlastRadius(upgradeLevel: number): number {
  const { BASE_BLAST_RADIUS, BLAST_RADIUS_PER_TIER } = BalanceConstants.GRENADE;
  return BASE_BLAST_RADIUS + upgradeTier(upgradeLevel) * BLAST_RADIUS_PER_TIER;
}
