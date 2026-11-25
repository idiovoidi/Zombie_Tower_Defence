/**
 * LevelState - Contextual object that encapsulates all combat-related managers
 *
 * This groups TowerManager, ZombieManager, WaveManager, TowerPlacementManager,
 * TowerCombatManager, ProjectileManager, and EffectManager to reduce the number
 * of direct dependencies in GameManager.
 */

import type { Container } from 'pixi.js';
import type { Tower } from '../objects/Tower';
import { CombatRenderer } from '../renderers/CombatRenderer';
import type { EffectManager } from '../renderers/effects/EffectManager';
import { OptimizationValidator } from '../utils/OptimizationValidator';
import type { MapManager } from './MapManager';
import type { ProjectileManager } from './ProjectileManager';
import type { TowerCombatManager } from './TowerCombatManager';
import type { TowerManager } from './TowerManager';
import type { TowerPlacementManager } from './TowerPlacementManager';
import type { WaveManager } from './WaveManager';
import type { ZombieManager } from './ZombieManager';

interface LevelStateConfig {
  container: Container;
  mapManager: MapManager;
  worldWidth?: number;
  worldHeight?: number;
  // Manager dependencies (created externally and injected)
  towerManager: TowerManager;
  waveManager: WaveManager;
  zombieManager: ZombieManager;
  projectileManager: ProjectileManager;
  towerPlacementManager: TowerPlacementManager;
  towerCombatManager: TowerCombatManager;
  effectManager?: EffectManager | null;
}

export class LevelState {
  // Managers
  private towerManager: TowerManager;
  private zombieManager: ZombieManager;
  private waveManager: WaveManager;
  private towerPlacementManager: TowerPlacementManager;
  private towerCombatManager: TowerCombatManager;
  private projectileManager: ProjectileManager;
  private effectManager: EffectManager | null = null;

  // Combat renderer for visual effects (via EventBus)
  private combatRenderer: CombatRenderer | null = null;

  constructor(config: LevelStateConfig) {
    const {
      mapManager: _mapManager,
      worldWidth: _worldWidth = 1024,
      worldHeight: _worldHeight = 768,
      towerManager,
      waveManager,
      zombieManager,
      projectileManager,
      towerPlacementManager,
      towerCombatManager,
      effectManager = null,
    } = config;

    // Use injected manager instances (not creating new ones)
    this.towerManager = towerManager;
    this.waveManager = waveManager;
    this.zombieManager = zombieManager;
    this.projectileManager = projectileManager;
    this.towerPlacementManager = towerPlacementManager;
    this.towerCombatManager = towerCombatManager;
    this.effectManager = effectManager;

    // Wire up dependencies
    this.towerCombatManager.setProjectileManager(this.projectileManager);
    this.projectileManager.setSpatialQuery(this.towerCombatManager);
    if (this.effectManager) {
      this.effectManager.setSpatialQuery(this.towerCombatManager);
    }

    // Set up combat renderer for visual effects if EffectManager is available
    if (this.effectManager) {
      this.combatRenderer = new CombatRenderer(this.effectManager);
    }
  }

  /**
   * Set the EffectManager for visual effects
   * Called after construction if effect manager was not available at initialization
   */
  public setEffectManager(effectManager: EffectManager): void {
    this.effectManager = effectManager;
    this.effectManager.setSpatialQuery(this.towerCombatManager);
    // Create CombatRenderer to handle visual effects via EventBus
    if (!this.combatRenderer) {
      this.combatRenderer = new CombatRenderer(effectManager);
    } else {
      this.combatRenderer.setEffectManager(effectManager);
    }
  }

  /**
   * Get the EffectManager
   */
  public getEffectManager(): EffectManager | null {
    return this.effectManager;
  }

  // Manager getters - these are used by GameManager to access specific managers
  public getTowerManager(): TowerManager {
    return this.towerManager;
  }

  public getZombieManager(): ZombieManager {
    return this.zombieManager;
  }

  public getWaveManager(): WaveManager {
    return this.waveManager;
  }

  public getTowerPlacementManager(): TowerPlacementManager {
    return this.towerPlacementManager;
  }

  public getTowerCombatManager(): TowerCombatManager {
    return this.towerCombatManager;
  }

  public getProjectileManager(): ProjectileManager {
    return this.projectileManager;
  }

  /**
   * Reset all wave-related state for a new game
   */
  public reset(): void {
    this.waveManager.reset();
  }

  /**
   * Start a new wave
   */
  public startWave(): void {
    this.zombieManager.startWave();
  }

  /**
   * Start the next wave
   */
  public nextWave(): void {
    this.waveManager.nextWave();
    this.zombieManager.startWave();
  }

  /**
   * Check if the current wave is complete
   */
  public isWaveComplete(): boolean {
    return this.zombieManager.isWaveComplete();
  }

  /**
   * Update all combat-related managers
   * @param deltaTime - Time since last frame
   * @param isPlaying - Whether the game is currently playing
   */
  public update(deltaTime: number, isPlaying: boolean, animateDeaths = false): void {
    // Update effect manager (always runs for visual effects)
    if (this.effectManager) {
      this.effectManager.update(deltaTime);
    }

    if (isPlaying) {
      this.zombieManager.update(deltaTime);
      this.syncEntityArrays();
      // TowerCombatManager.update also advances projectiles while playing
      this.towerCombatManager.update(deltaTime);
    } else {
      // Between waves, bodies from the last kills still fall and settle (not while paused)
      if (animateDeaths) {
        this.zombieManager.updateDyingOnly(deltaTime);
        this.syncEntityArrays();
      }
      // Keep projectiles moving/cleaning up outside PLAYING (combat tick is paused)
      this.projectileManager.update(deltaTime);
    }
  }

  /**
   * Sync tower and zombie arrays with combat manager if dirty
   */
  private syncEntityArrays(): void {
    const towersDirty = this.towerPlacementManager.areTowersDirty();
    const zombiesDirty = this.zombieManager.areZombiesDirty();

    if (towersDirty) {
      const towers = this.towerPlacementManager.getPlacedTowers();
      this.towerCombatManager.setTowers(towers);
      this.towerPlacementManager.clearTowersDirty();
      OptimizationValidator.trackArrayRebuild('towers');
    }

    if (zombiesDirty) {
      const zombies = this.zombieManager.getZombies();
      this.towerCombatManager.setZombies(zombies);
      this.projectileManager.setZombies(zombies);
      if (this.effectManager) {
        this.effectManager.setZombies(zombies);
      }
      this.zombieManager.clearZombiesDirty();
      OptimizationValidator.trackArrayRebuild('zombies');
    }
  }

  /**
   * Force sync entity arrays regardless of dirty state
   */
  public forceSyncEntityArrays(): void {
    const towers = this.towerPlacementManager.getPlacedTowers();
    const zombies = this.zombieManager.getZombies();
    this.towerCombatManager.setTowers(towers);
    this.towerCombatManager.setZombies(zombies);
    this.projectileManager.setZombies(zombies);
    if (this.effectManager) {
      this.effectManager.setZombies(zombies);
    }
    this.towerPlacementManager.clearTowersDirty();
    this.zombieManager.clearZombiesDirty();
  }

  /**
   * Get current wave number
   */
  public getCurrentWave(): number {
    return this.waveManager.getCurrentWave();
  }

  /**
   * Get zombie groups for current wave
   */
  public getCurrentWaveZombies() {
    return this.waveManager.getCurrentWaveZombies();
  }

  /**
   * Calculate zombie count for wave scaling
   */
  public calculateZombieCount(baseCount: number, wave: number, type?: string): number {
    return this.waveManager.calculateZombieCount(baseCount, wave, type);
  }

  /**
   * Place a tower at the specified location
   */
  public placeTower(x: number, y: number, type: string): Tower | null {
    this.towerPlacementManager.startPlacement(type);
    return this.towerPlacementManager.placeTower(x, y);
  }

  /**
   * Get all active zombies
   */
  public getZombies() {
    return this.zombieManager.getZombies();
  }

  /**
   * Get all placed towers
   */
  public getPlacedTowers(): Tower[] {
    return this.towerPlacementManager.getPlacedTowers();
  }

  /**
   * Get blood particle system for tracking
   */
  public getBloodParticleSystem() {
    return this.zombieManager.getBloodParticleSystem();
  }

  /**
   * Get corpse manager for tracking
   */
  public getCorpseManager() {
    return this.zombieManager.getCorpseManager();
  }

  /**
   * Cleanup wave-specific resources
   */
  public cleanupWave(): void {
    this.projectileManager.clear();
    // Effects are cleaned up automatically or via ResourceCleanupManager
  }

  /**
   * Cleanup all game resources
   */
  public cleanupGame(): void {
    this.cleanupWave();
    // Additional cleanup for game-level resources
    // Towers are preserved between waves, cleaned up separately
  }

  /**
   * Get effect counts for performance monitoring
   */
  public getEffectCounts(): {
    casings: number;
    flashes: number;
    trails: number;
    impacts: number;
    glints: number;
  } {
    if (this.effectManager) {
      return this.effectManager.getEffectCounts();
    }
    return { casings: 0, flashes: 0, trails: 0, impacts: 0, glints: 0 };
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Dispose combat renderer
    if (this.combatRenderer) {
      this.combatRenderer.dispose();
      this.combatRenderer = null;
    }

    // Cleanup game resources
    this.cleanupGame();
  }
}
