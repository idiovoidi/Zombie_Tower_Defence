import { GameConfig } from './gameConfig';

export interface ZombieGroup {
  type: string;
  count: number;
  spawnInterval: number; // seconds between spawns
}

/** Multiplier on authored spawn intervals (wider spacing between zombies). */
export const SPAWN_INTERVAL_SCALE = 2;

/** Necro Tank appears on wave 12, then every 5th wave from 15 onward. */
export function shouldIncludeNecroTank(wave: number): boolean {
  return wave === 12 || (wave >= 15 && wave % 5 === 0);
}

/**
 * Built-in wave compositions (waves 1-100) with aggressive variety introduction.
 * Spawn intervals are already multiplied by SPAWN_INTERVAL_SCALE.
 */
export function buildDefaultWaveTable(): Map<number, ZombieGroup[]> {
  const waveData = new Map<number, ZombieGroup[]>();

  // Waves 1-3 (Tutorial - 70% Basic, 30% Fast)
  for (let i = 1; i <= 3; i++) {
    const totalZombies = Math.floor(8 + i * 2);
    waveData.set(i, [
      {
        type: GameConfig.ZOMBIE_TYPES.BASIC,
        count: Math.floor(totalZombies * 0.7),
        spawnInterval: 2.2, // Increased from 1.8 for better spacing
      },
      {
        type: GameConfig.ZOMBIE_TYPES.FAST,
        count: Math.floor(totalZombies * 0.3),
        spawnInterval: 2.6, // Increased from 2.2 for better spacing
      },
    ]);
  }

  // Waves 4-5 (Introduce Tanks - 60% Basic, 30% Fast, 10% Tank)
  for (let i = 4; i <= 5; i++) {
    const totalZombies = Math.floor(12 + i * 2);
    waveData.set(i, [
      {
        type: GameConfig.ZOMBIE_TYPES.BASIC,
        count: Math.floor(totalZombies * 0.6),
        spawnInterval: 2.0, // Increased from 1.6 for better spacing
      },
      {
        type: GameConfig.ZOMBIE_TYPES.FAST,
        count: Math.floor(totalZombies * 0.3),
        spawnInterval: 2.4, // Increased from 2.0 for better spacing
      },
      {
        type: GameConfig.ZOMBIE_TYPES.TANK,
        count: Math.floor(totalZombies * 0.1),
        spawnInterval: 4.0, // Increased from 3.5 for better spacing
      },
    ]);
  }

  // Waves 6-8 (More variety - 50% Basic, 25% Fast, 15% Tank, 10% Armored)
  for (let i = 6; i <= 8; i++) {
    const totalZombies = Math.floor(18 + i * 2.5);
    waveData.set(i, [
      {
        type: GameConfig.ZOMBIE_TYPES.BASIC,
        count: Math.floor(totalZombies * 0.5),
        spawnInterval: 1.8, // Increased from 1.4 for better spacing
      },
      {
        type: GameConfig.ZOMBIE_TYPES.FAST,
        count: Math.floor(totalZombies * 0.25),
        spawnInterval: 2.2, // Increased from 1.8 for better spacing
      },
      {
        type: GameConfig.ZOMBIE_TYPES.TANK,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 3.5, // Increased from 3.0 for better spacing
      },
      {
        type: GameConfig.ZOMBIE_TYPES.ARMORED,
        count: Math.floor(totalZombies * 0.1),
        spawnInterval: 3.5,
      },
    ]);
  }

  // Waves 9-10 (Swarm introduction - 45% Basic, 20% Fast, 15% Tank, 10% Armored, 10% Swarm)
  for (let i = 9; i <= 10; i++) {
    const totalZombies = Math.floor(22 + i * 3);
    waveData.set(i, [
      {
        type: GameConfig.ZOMBIE_TYPES.BASIC,
        count: Math.floor(totalZombies * 0.45),
        spawnInterval: 1.3,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.FAST,
        count: Math.floor(totalZombies * 0.2),
        spawnInterval: 1.7,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.TANK,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 2.8,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.ARMORED,
        count: Math.floor(totalZombies * 0.1),
        spawnInterval: 3.2,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.SWARM,
        count: Math.floor(totalZombies * 0.1),
        spawnInterval: 1.0,
      },
    ]);
  }

  // Waves 11-13 (Stealth arrives - 40% Basic, 20% Fast, 15% Tank, 10% Armored, 10% Swarm, 5% Stealth)
  for (let i = 11; i <= 13; i++) {
    const totalZombies = Math.floor(28 + i * 3);
    waveData.set(i, [
      {
        type: GameConfig.ZOMBIE_TYPES.BASIC,
        count: Math.floor(totalZombies * 0.4),
        spawnInterval: 1.2,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.FAST,
        count: Math.floor(totalZombies * 0.2),
        spawnInterval: 1.6,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.TANK,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 2.6,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.ARMORED,
        count: Math.floor(totalZombies * 0.1),
        spawnInterval: 3.0,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.SWARM,
        count: Math.floor(totalZombies * 0.1),
        spawnInterval: 0.9,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.STEALTH,
        count: Math.floor(totalZombies * 0.05),
        spawnInterval: 1.8,
      },
    ]);
  }

  // Waves 14-15 (Mechanical arrives - 35% Basic, 20% Fast, 15% Tank, 10% Armored, 10% Swarm, 5% Stealth, 5% Mechanical)
  for (let i = 14; i <= 15; i++) {
    const totalZombies = Math.floor(35 + i * 3.5);
    waveData.set(i, [
      {
        type: GameConfig.ZOMBIE_TYPES.BASIC,
        count: Math.floor(totalZombies * 0.35),
        spawnInterval: 1.1,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.FAST,
        count: Math.floor(totalZombies * 0.2),
        spawnInterval: 1.5,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.TANK,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 2.4,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.ARMORED,
        count: Math.floor(totalZombies * 0.1),
        spawnInterval: 2.8,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.SWARM,
        count: Math.floor(totalZombies * 0.1),
        spawnInterval: 0.8,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.STEALTH,
        count: Math.floor(totalZombies * 0.05),
        spawnInterval: 1.7,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.MECHANICAL,
        count: Math.floor(totalZombies * 0.05),
        spawnInterval: 2.2,
      },
    ]);
  }

  // Waves 16-20 (Boss debut — all types + 1 Boss)
  for (let i = 16; i <= 20; i++) {
    const totalZombies = Math.floor(40 + i * 4);
    waveData.set(i, [
      {
        type: GameConfig.ZOMBIE_TYPES.BASIC,
        count: Math.floor(totalZombies * 0.28),
        spawnInterval: 1.0,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.FAST,
        count: Math.floor(totalZombies * 0.2),
        spawnInterval: 1.4,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.TANK,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 2.2,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.ARMORED,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 2.6,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.SWARM,
        count: Math.floor(totalZombies * 0.1),
        spawnInterval: 0.7,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.STEALTH,
        count: Math.floor(totalZombies * 0.05),
        spawnInterval: 1.6,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.MECHANICAL,
        count: Math.floor(totalZombies * 0.05),
        spawnInterval: 2.0,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.BOSS,
        count: 1,
        spawnInterval: 10.0,
      },
    ]);
  }

  // Waves 21-30 (Balanced mix + 1 Boss)
  for (let i = 21; i <= 30; i++) {
    const totalZombies = Math.floor(50 + i * 4.5);
    waveData.set(i, [
      {
        type: GameConfig.ZOMBIE_TYPES.BASIC,
        count: Math.floor(totalZombies * 0.24),
        spawnInterval: 0.9,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.FAST,
        count: Math.floor(totalZombies * 0.2),
        spawnInterval: 1.3,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.TANK,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 2.0,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.ARMORED,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 2.4,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.SWARM,
        count: Math.floor(totalZombies * 0.12),
        spawnInterval: 0.6,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.STEALTH,
        count: Math.floor(totalZombies * 0.08),
        spawnInterval: 1.5,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.MECHANICAL,
        count: Math.floor(totalZombies * 0.05),
        spawnInterval: 1.8,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.BOSS,
        count: 1,
        spawnInterval: 9.0,
      },
    ]);
  }

  // Waves 31-40 (Heavy assault + 1 Boss)
  for (let i = 31; i <= 40; i++) {
    const totalZombies = Math.floor(70 + i * 5);
    waveData.set(i, [
      {
        type: GameConfig.ZOMBIE_TYPES.BASIC,
        count: Math.floor(totalZombies * 0.19),
        spawnInterval: 0.8,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.FAST,
        count: Math.floor(totalZombies * 0.18),
        spawnInterval: 1.2,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.TANK,
        count: Math.floor(totalZombies * 0.18),
        spawnInterval: 1.8,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.ARMORED,
        count: Math.floor(totalZombies * 0.18),
        spawnInterval: 2.2,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.SWARM,
        count: Math.floor(totalZombies * 0.12),
        spawnInterval: 0.5,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.STEALTH,
        count: Math.floor(totalZombies * 0.08),
        spawnInterval: 1.4,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.MECHANICAL,
        count: Math.floor(totalZombies * 0.06),
        spawnInterval: 1.6,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.BOSS,
        count: 1,
        spawnInterval: 8.0,
      },
    ]);
  }

  // Waves 41-60 (Expert + 2 Bosses)
  for (let i = 41; i <= 60; i++) {
    const totalZombies = Math.floor(100 + i * 6);
    waveData.set(i, [
      {
        type: GameConfig.ZOMBIE_TYPES.BASIC,
        count: Math.floor(totalZombies * 0.14),
        spawnInterval: 0.7,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.FAST,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 1.0,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.TANK,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 1.4,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.ARMORED,
        count: Math.floor(totalZombies * 0.2),
        spawnInterval: 1.6,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.SWARM,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 0.4,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.STEALTH,
        count: Math.floor(totalZombies * 0.12),
        spawnInterval: 1.1,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.MECHANICAL,
        count: Math.floor(totalZombies * 0.08),
        spawnInterval: 1.5,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.BOSS,
        count: 2,
        spawnInterval: 7.0,
      },
    ]);
  }

  // Waves 61-80 (Master + 2 Bosses)
  for (let i = 61; i <= 80; i++) {
    const totalZombies = Math.floor(150 + i * 7);
    waveData.set(i, [
      {
        type: GameConfig.ZOMBIE_TYPES.BASIC,
        count: Math.floor(totalZombies * 0.11),
        spawnInterval: 0.6,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.FAST,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 0.9,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.TANK,
        count: Math.floor(totalZombies * 0.15),
        spawnInterval: 1.2,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.ARMORED,
        count: Math.floor(totalZombies * 0.22),
        spawnInterval: 1.4,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.SWARM,
        count: Math.floor(totalZombies * 0.18),
        spawnInterval: 0.35,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.STEALTH,
        count: Math.floor(totalZombies * 0.1),
        spawnInterval: 1.0,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.MECHANICAL,
        count: Math.floor(totalZombies * 0.08),
        spawnInterval: 1.3,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.BOSS,
        count: 2,
        spawnInterval: 6.0,
      },
    ]);
  }

  // Waves 81-100 (Nightmare + 3 Bosses)
  for (let i = 81; i <= 100; i++) {
    const totalZombies = Math.floor(200 + i * 8);
    waveData.set(i, [
      {
        type: GameConfig.ZOMBIE_TYPES.BASIC,
        count: Math.floor(totalZombies * 0.09),
        spawnInterval: 0.5,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.FAST,
        count: Math.floor(totalZombies * 0.12),
        spawnInterval: 0.8,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.TANK,
        count: Math.floor(totalZombies * 0.18),
        spawnInterval: 1.0,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.ARMORED,
        count: Math.floor(totalZombies * 0.25),
        spawnInterval: 1.2,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.SWARM,
        count: Math.floor(totalZombies * 0.2),
        spawnInterval: 0.3,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.STEALTH,
        count: Math.floor(totalZombies * 0.1),
        spawnInterval: 0.9,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.MECHANICAL,
        count: Math.floor(totalZombies * 0.05),
        spawnInterval: 1.1,
      },
      {
        type: GameConfig.ZOMBIE_TYPES.BOSS,
        count: 3,
        spawnInterval: 5.0,
      },
    ]);
  }

  // Inject Necro Tank mini-boss on select waves (debut 12, then ~every 5th)
  for (let wave = 1; wave <= 100; wave++) {
    if (!shouldIncludeNecroTank(wave)) {
      continue;
    }
    const groups = waveData.get(wave);
    if (!groups || groups.some(g => g.type === GameConfig.ZOMBIE_TYPES.NECRO_TANK)) {
      continue;
    }
    groups.push({
      type: GameConfig.ZOMBIE_TYPES.NECRO_TANK,
      count: 1,
      spawnInterval: 10.0,
    });
  }

  // Pacing: authored intervals are scaled so hordes arrive at the tuned density.
  for (const groups of waveData.values()) {
    for (const group of groups) {
      group.spawnInterval *= SPAWN_INTERVAL_SCALE;
    }
  }

  return waveData;
}
