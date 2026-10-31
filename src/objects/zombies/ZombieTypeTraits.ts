import { GameConfig } from '../../config/gameConfig';

const T = GameConfig.ZOMBIE_TYPES;

/** Fraction of knockback force a zombie type ignores (0 = none, 1 = immune). */
const KNOCKBACK_RESISTANCE: Readonly<Record<string, number>> = {
  [T.BOSS]: 0.97, // Nearly immovable
  [T.NECRO_TANK]: 0.95, // Bone-plated bulk
  [T.TANK]: 0.9, // Hard to knock back
  [T.ARMORED]: 0.7,
  [T.MECHANICAL]: 0.6,
  [T.STEALTH]: 0.3,
  [T.FAST]: 0.2,
  [T.SWARM]: 0.1, // Very vulnerable
};
const DEFAULT_KNOCKBACK_RESISTANCE = 0.3; // Early-game types are vulnerable

/** Max lateral stagger lean (px/s) by zombie type. */
const SWAY_AMPLITUDE: Readonly<Record<string, number>> = {
  [T.BASIC]: 8, // Subtle shamble
  [T.FAST]: 5, // Quick, darting movement
  [T.TANK]: 12, // Heavy limp lean
  [T.ARMORED]: 7, // Heavy armored shamble
  [T.SWARM]: 10, // Erratic stagger
  [T.STEALTH]: 6, // Uneven, unpredictable
  [T.MECHANICAL]: 3, // Minimal drift
  [T.BOSS]: 15, // Massive lumbering limp
  [T.NECRO_TANK]: 14, // Heavy armored stomp
};
const DEFAULT_SWAY_AMPLITUDE = 8;

export function getKnockbackResistance(zombieType: string): number {
  return KNOCKBACK_RESISTANCE[zombieType] ?? DEFAULT_KNOCKBACK_RESISTANCE;
}

export function getSwayAmplitude(zombieType: string): number {
  return SWAY_AMPLITUDE[zombieType] ?? DEFAULT_SWAY_AMPLITUDE;
}
