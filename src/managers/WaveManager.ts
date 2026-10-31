/**
 * Wave Manager
 *
 * For wave balancing, use the WaveBalancing system in config/waveBalancing.ts
 * In browser console, type: waveBalance() to load balancing tools
 * Then use: printWaveBalance(1, 10) to see balance report
 */

import { GameConfig } from '../config/gameConfig';
import { DebugConstants } from '../config/debugConstants';
import type { Zombie } from '../objects/Zombie';
import { ZombieFactory } from '../objects/ZombieFactory';
import { ZombieStats } from '../utils/ZombieStats';

export interface ZombieGroup {
  type: string;
  count: number;
  spawnInterval: number; // seconds between spawns
}

export class WaveManager {
  /** Multiplier on authored spawn intervals (wider spacing between zombies). */
  public static readonly SPAWN_INTERVAL_SCALE = 2;

  private currentWave: number;
  private waveData: Map<number, ZombieGroup[]>;
  /** Sparse per-wave overrides from custom maps; null means use built-in table. */
  private waveOverrides: Map<number, ZombieGroup[]> | null;
  private playerPerformance: {
    killRate: number;
    livesLost: number;
    resourceEfficiency: number;
  };
  private difficultyModifier: number;

  constructor() {
    this.currentWave = 1;
    this.waveData = new Map<number, ZombieGroup[]>();
    this.waveOverrides = null;
    this.playerPerformance = {
      killRate: 100,
      livesLost: 0,
      resourceEfficiency: 100,
    };
    this.difficultyModifier = 1.0;
    this.initializeWaveData();
  }

  // Initialize wave composition data with aggressive variety introduction
  private initializeWaveData(): void {
    // Waves 1-3 (Tutorial - 70% Basic, 30% Fast)
    for (let i = 1; i <= 3; i++) {
      const totalZombies = Math.floor(8 + i * 2);
      this.waveData.set(i, [
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
      this.waveData.set(i, [
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
      this.waveData.set(i, [
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
      this.waveData.set(i, [
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
      this.waveData.set(i, [
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
      this.waveData.set(i, [
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
      this.waveData.set(i, [
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
      this.waveData.set(i, [
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
      this.waveData.set(i, [
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
      this.waveData.set(i, [
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
      this.waveData.set(i, [
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
      this.waveData.set(i, [
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
      if (!WaveManager.shouldIncludeNecroTank(wave)) {
        continue;
      }
      const groups = this.waveData.get(wave);
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
    for (const groups of this.waveData.values()) {
      for (const group of groups) {
        group.spawnInterval *= WaveManager.SPAWN_INTERVAL_SCALE;
      }
    }
  }

  /** Necro Tank appears on wave 12, then every 5th wave from 15 onward. */
  public static shouldIncludeNecroTank(wave: number): boolean {
    return wave === 12 || (wave >= 15 && wave % 5 === 0);
  }

  private static isEliteZombieType(type?: string): boolean {
    return (
      type === GameConfig.ZOMBIE_TYPES.BOSS || type === GameConfig.ZOMBIE_TYPES.NECRO_TANK
    );
  }

  /**
   * Set sparse wave composition overrides (custom maps).
   * Waves without an override fall back to the built-in table.
   */
  public setWaveOverrides(overrides: Map<number, ZombieGroup[]> | null): void {
    if (!overrides) {
      this.waveOverrides = null;
      return;
    }
    this.waveOverrides = new Map(
      Array.from(overrides.entries()).map(([wave, groups]) => [
        wave,
        groups.map(g => ({ ...g })),
      ])
    );
  }

  public clearWaveOverrides(): void {
    this.waveOverrides = null;
  }

  // Get zombie groups for current wave
  public getCurrentWaveZombies(): ZombieGroup[] {
    return this.getZombiesForWave(this.currentWave);
  }

  /** Composition for a specific wave (honors custom overrides). */
  public getZombiesForWave(wave: number): ZombieGroup[] {
    const override = this.waveOverrides?.get(wave);
    if (override) {
      return override.map(g => ({ ...g }));
    }
    return this.waveData.get(wave) || [];
  }

  /** Built-in composition for a wave (ignores custom overrides). Useful for editor copy-from-default. */
  public getDefaultWaveZombies(wave: number): ZombieGroup[] {
    return (this.waveData.get(wave) || []).map(g => ({ ...g }));
  }

  // Advance to next wave
  public nextWave(): void {
    this.currentWave++;
  }

  // Reset wave manager to initial state (for new game)
  public reset(startWave = 1): void {
    this.currentWave = Math.max(1, Math.floor(startWave));
    this.playerPerformance = {
      killRate: 100,
      livesLost: 0,
      resourceEfficiency: 100,
    };
    this.difficultyModifier = 1.0;
    // Intentionally keep waveOverrides — they belong to the active custom map session.
  }

  // Get current wave number
  public getCurrentWave(): number {
    return this.currentWave;
  }

  // Calculate zombie health based on wave number and type
  public static calculateZombieHealth(type: string, wave: number): number {
    return ZombieStats.calculateZombieHealth(type, wave);
  }

  // Calculate zombie damage based on wave number and type
  public calculateZombieDamage(type: string, wave: number): number {
    let baseDamage = 10;

    switch (type) {
      case GameConfig.ZOMBIE_TYPES.BASIC:
        baseDamage = 10;
        break;
      case GameConfig.ZOMBIE_TYPES.FAST:
        baseDamage = 8;
        break;
      case GameConfig.ZOMBIE_TYPES.TANK:
        baseDamage = 25;
        break;
      case GameConfig.ZOMBIE_TYPES.ARMORED:
        baseDamage = 15;
        break;
      case GameConfig.ZOMBIE_TYPES.SWARM:
        baseDamage = 5;
        break;
      case GameConfig.ZOMBIE_TYPES.STEALTH:
        baseDamage = 12;
        break;
      case GameConfig.ZOMBIE_TYPES.MECHANICAL:
        baseDamage = 20;
        break;
      case GameConfig.ZOMBIE_TYPES.BOSS:
        baseDamage = 40;
        break;
    }

    // Scale damage based on wave (from design document)
    return Math.floor(baseDamage + wave * 1.5 * this.difficultyModifier);
  }

  // Update player performance metrics
  public updatePerformanceMetrics(
    killRate: number,
    livesLost: number,
    resourceEfficiency: number
  ): void {
    this.playerPerformance = {
      killRate,
      livesLost,
      resourceEfficiency,
    };

    // Adjust difficulty based on performance
    this.adjustDifficulty();
  }

  // Adjust difficulty based on player performance
  private adjustDifficulty(): void {
    // Below 70% kill rate: Reduce next wave zombie count by 15%
    if (this.playerPerformance.killRate < 70) {
      this.difficultyModifier = Math.max(0.85, this.difficultyModifier - 0.15);
    }
    // Above 90% kill rate: Increase next wave zombie count by 10%
    else if (this.playerPerformance.killRate > 90) {
      this.difficultyModifier = Math.min(1.2, this.difficultyModifier + 0.1);
    }

    // Fast track players: +5% difficulty if consistently above 95% performance
    if (this.playerPerformance.killRate > 95) {
      this.difficultyModifier = Math.min(1.3, this.difficultyModifier + 0.05);
    }
    // Struggling players: -10% difficulty if below 60% performance for 3 consecutive waves
    else if (this.playerPerformance.killRate < 60) {
      this.difficultyModifier = Math.max(0.7, this.difficultyModifier - 0.1);
    }
  }

  // Get difficulty modifier
  public getDifficultyModifier(): number {
    return this.difficultyModifier;
  }

  // Calculate spawn rate with scaling (from design document)
  public calculateSpawnRate(baseInterval: number, wave: number, type?: string): number {
    // Elites stay spaced out — milder interval decay than the horde
    const isElite = WaveManager.isEliteZombieType(type);
    const decayBase = isElite ? 0.98 : 0.95;
    const minInterval = isElite ? 4.0 : 0.5;
    const scaledInterval = baseInterval * decayBase ** wave * this.difficultyModifier;
    // ZOMBIE_SPAWN_RATE_MULTIPLIER: lower = fewer spawns (longer interval)
    const debugFactor =
      DebugConstants.ENABLED && DebugConstants.ZOMBIE_SPAWN_RATE_MULTIPLIER > 0
        ? 1 / DebugConstants.ZOMBIE_SPAWN_RATE_MULTIPLIER
        : 1;
    return Math.max(minInterval, scaledInterval * debugFactor);
  }

  // Calculate zombie count with scaling (from design document)
  public calculateZombieCount(baseCount: number, wave: number, type?: string): number {
    // Elites are singletons — skip horde exponential scaling
    if (WaveManager.isEliteZombieType(type)) {
      let count = baseCount;
      // Extra Boss only on milestone waves (Necro Tank stays at base count)
      if (type === GameConfig.ZOMBIE_TYPES.BOSS && wave % 10 === 0) {
        count += 1;
      }
      return Math.max(
        baseCount > 0 ? 1 : 0,
        Math.floor(count * Math.min(1.15, this.difficultyModifier))
      );
    }

    let count = baseCount * 1.08 ** wave * this.difficultyModifier;

    // 20% spikes every 5 waves
    if (wave % 5 === 0) {
      count *= 1.2;
    }

    return Math.floor(count);
  }

  // Create zombies for current wave
  public createWaveZombies(): Zombie[] {
    const zombies: Zombie[] = [];
    const zombieGroups = this.getCurrentWaveZombies();

    for (const group of zombieGroups) {
      // Calculate adjusted count based on wave and difficulty
      const adjustedCount = this.calculateZombieCount(group.count, this.currentWave, group.type);

      for (let i = 0; i < adjustedCount; i++) {
        // Create zombie using ZombieFactory
        const zombie = ZombieFactory.createZombie(group.type, 50, 384, this.currentWave);
        if (zombie) {
          zombies.push(zombie);
        }
      }
    }

    return zombies;
  }
}
