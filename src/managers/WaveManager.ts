/**
 * Wave Manager
 *
 * For wave balancing, use the WaveBalancing system in config/waveBalancing.ts
 * In browser console, type: waveBalance() to load balancing tools
 * Then use: printWaveBalance(1, 10) to see balance report
 */

import { GameConfig } from '../config/gameConfig';
import { DebugConstants } from '../config/debugConstants';
import {
  buildDefaultWaveTable,
  SPAWN_INTERVAL_SCALE,
  shouldIncludeNecroTank,
  type ZombieGroup,
} from '../config/waveTable';
import type { Zombie } from '../objects/Zombie';
import { ZombieFactory } from '../objects/ZombieFactory';
import { ZombieStats } from '../utils/ZombieStats';

export type { ZombieGroup };

export class WaveManager {
  /** Multiplier on authored spawn intervals (wider spacing between zombies). */
  public static readonly SPAWN_INTERVAL_SCALE = SPAWN_INTERVAL_SCALE;

  /**
   * Level difficulty -> horde pressure. Scales zombie counts up and spawn intervals down
   * (harder = more zombies, arriving closer together). Independent of the adaptive modifier.
   */
  public static readonly DIFFICULTY_SCALE: Readonly<
    Record<'Easy' | 'Normal' | 'Hard' | 'Nightmare', number>
  > = {
    Easy: 0.9,
    Normal: 1.0,
    Hard: 1.1,
    Nightmare: 1.2,
  };

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
  /** Per-level pressure from the level's difficulty label (1 = Normal). */
  private baseDifficulty = 1.0;

  constructor() {
    this.currentWave = 1;
    this.waveData = buildDefaultWaveTable();
    this.waveOverrides = null;
    this.playerPerformance = {
      killRate: 100,
      livesLost: 0,
      resourceEfficiency: 100,
    };
    this.difficultyModifier = 1.0;
  }

  /** Necro Tank appears on wave 12, then every 5th wave from 15 onward. */
  public static shouldIncludeNecroTank(wave: number): boolean {
    return shouldIncludeNecroTank(wave);
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

  /** Set the level's base difficulty (see DIFFICULTY_SCALE). Survives reset(). */
  public setBaseDifficulty(scale: number): void {
    this.baseDifficulty = scale > 0 ? scale : 1.0;
  }

  public getBaseDifficulty(): number {
    return this.baseDifficulty;
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
    const scaledInterval =
      (baseInterval * decayBase ** wave * this.difficultyModifier) / this.baseDifficulty;
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

    let count = baseCount * 1.08 ** wave * this.difficultyModifier * this.baseDifficulty;

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
