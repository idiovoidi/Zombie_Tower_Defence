import { Container, type Graphics } from 'pixi.js';
import type { HealthComponent } from '../components/HealthComponent';
import { GameConfig } from '../config/gameConfig';
import type { Zombie } from '../objects/Zombie';
import { ZombieFactory } from '../objects/ZombieFactory';
import { NecroTankZombie } from '../objects/zombies/NecroTankZombie';
import type { HasWaypoints } from '../types/zombie-waypoints';
import { BloodParticleSystem } from '../utils/BloodParticleSystem';
import { ObjectPool } from '../utils/ObjectPool';
import { CorpseManager } from './CorpseManager';
import type { MapManager } from './MapManager';
import type { WaveManager } from './WaveManager';

export class ZombieManager {
  private zombies: Zombie[] = [];
  private container: Container;
  private waveManager: WaveManager;
  private mapManager: MapManager;
  private spawnQueue: Array<{ type: string; delay: number }> = [];
  private spawnTimer = 0;
  private isSpawning = false;
  private bloodParticleSystem: BloodParticleSystem;
  private corpseManager: CorpseManager;
  private zombiesDirty = false; // Track when zombie array changes
  private zombiePools: Map<string, ObjectPool<Zombie>> = new Map();

  constructor(container: Container, waveManager: WaveManager, mapManager: MapManager) {
    this.container = container;
    this.waveManager = waveManager;
    this.mapManager = mapManager;

    // Create separate containers for proper z-ordering
    const corpseContainer = new Container();
    const zombieContainer = new Container();

    // Add containers in correct order (corpses below zombies)
    container.addChild(corpseContainer);
    container.addChild(zombieContainer);

    // Initialize blood and corpse systems with proper containers
    this.bloodParticleSystem = new BloodParticleSystem(corpseContainer); // Blood on ground layer
    this.corpseManager = new CorpseManager(corpseContainer); // Corpses on ground layer

    this.container = zombieContainer;
  }

  private createZombiePool(type: string): ObjectPool<Zombie> {
    return new ObjectPool<Zombie>(
      () => ZombieFactory.createZombie(type, 0, 0, 1) as Zombie,
      z => {
        z.visible = false;
        if (z.parent) z.parent.removeChild(z);
        z.removeAllListeners('zombieDeath');
        z.removeAllListeners('zombieCorpse');
        if (z instanceof NecroTankZombie) {
          z.setAbilityContext(null);
        }
      },
      200
    );
  }

  private getZombiePool(type: string): ObjectPool<Zombie> {
    if (!this.zombiePools.has(type)) {
      this.zombiePools.set(type, this.createZombiePool(type));
    }
    return this.zombiePools.get(type) ?? this.createZombiePool(type);
  }

  // Start spawning zombies for the current wave
  public startWave(): void {
    this.isSpawning = true;
    this.spawnQueue = [];
    this.spawnTimer = 0;

    const zombieGroups = this.waveManager.getCurrentWaveZombies();

    // Build spawn queue with delays
    let currentDelay = 0;
    for (const group of zombieGroups) {
      const adjustedCount = this.waveManager.calculateZombieCount(
        group.count,
        this.waveManager.getCurrentWave(),
        group.type
      );
      const spawnInterval = this.waveManager.calculateSpawnRate(
        group.spawnInterval,
        this.waveManager.getCurrentWave(),
        group.type
      );

      for (let i = 0; i < adjustedCount; i++) {
        this.spawnQueue.push({
          type: group.type,
          delay: currentDelay,
        });
        currentDelay += spawnInterval;
      }
    }

    // Shuffle spawn queue for variety
    this.shuffleSpawnQueue();
  }

  // Shuffle spawn queue to mix zombie types
  private shuffleSpawnQueue(): void {
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
  }

  // Update zombie spawning and movement
  public update(deltaTime: number): void {
    if (this.isSpawning && this.spawnQueue.length > 0) {
      this.spawnTimer += deltaTime;

      // Spawn zombies from queue
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.spawnTimer) {
        const spawnData = this.spawnQueue.shift();
        if (spawnData) {
          this.spawnZombie(spawnData.type);
        }
      }

      // Check if wave is complete
      if (this.spawnQueue.length === 0) {
        this.isSpawning = false;
      }
    }

    // Update all zombies
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i];
      zombie.update(deltaTime);

      // Remove dead zombies only after death animation completes
      const healthComponent = zombie.getComponent<HealthComponent>('Health');
      if (healthComponent && !healthComponent.isAlive()) {
        // Check if death animation has finished
        if (zombie.isDeathAnimationComplete()) {
          this.removeZombie(i);
        }
        // If dying but animation not complete, keep zombie alive for animation
      }
    }

    // Update blood particles and corpses
    this.bloodParticleSystem.update(deltaTime);
    this.corpseManager.update(deltaTime);
  }

  // Spawn a single zombie
  private spawnZombie(type: string): void {
    // Get spawn position from map
    const spawnPoint = this.mapManager.getSpawnPoint();
    const waypoints = this.mapManager.getRandomPath();

    if (!spawnPoint) {
      return;
    }

    // Add spacing variation to prevent visual clumping
    // Spread zombies across the path width (±15px from center)
    const lateralOffset = (Math.random() - 0.5) * 30;
    // Add small random backward offset to create depth (0-20px behind spawn point)
    const depthOffset = Math.random() * -20;

    const spawnX = spawnPoint.x + lateralOffset;
    const spawnY = spawnPoint.y + depthOffset;

    this.spawnZombieAt(type, spawnX, spawnY, waypoints);
  }

  /**
   * Spawn a zombie at an arbitrary position (wave spawn, necro revival, debug).
   */
  public spawnZombieAt(
    type: string,
    x: number,
    y: number,
    waypoints?: Array<{ x: number; y: number }>
  ): Zombie | null {
    const path =
      waypoints && waypoints.length > 0
        ? waypoints.map(wp => ({ x: wp.x, y: wp.y }))
        : this.mapManager.getRandomPath().map(wp => ({ x: wp.x, y: wp.y }));

    const pool = this.getZombiePool(type);
    const zombie = pool.acquire();
    zombie.init(x, y, this.waveManager.getCurrentWave());

    if (path.length > 0) {
      (zombie as unknown as HasWaypoints).waypoints = path;
    }

    zombie.on(
      'zombieDeath',
      (data: {
        x: number;
        y: number;
        type: string;
        size: number;
        killerType: string;
        impactAngle?: number;
        ragdollCorpse?: boolean;
      }) => {
        this.onZombieDeath(data);
      }
    );
    zombie.on('zombieCorpse', (data: { x: number; y: number; body: Graphics }) => {
      this.corpseManager.createCorpseFromBody(data.x, data.y, data.body);
    });

    if (zombie instanceof NecroTankZombie) {
      zombie.setAbilityContext({
        findCorpsesNear: (cx, cy, radius, limit) =>
          this.corpseManager.findCorpsesNear(cx, cy, radius, limit),
        consumeCorpse: id => this.corpseManager.consumeCorpse(id),
        spawnSwarmAt: (sx, sy, pathWaypoints) => {
          this.spawnZombieAt(GameConfig.ZOMBIE_TYPES.SWARM, sx, sy, pathWaypoints);
        },
      });
    }

    this.zombies.push(zombie);
    this.zombiesDirty = true;
    this.container.addChild(zombie);
    return zombie;
  }

  // Handle zombie death effects
  private onZombieDeath(data: {
    x: number;
    y: number;
    type: string;
    size: number;
    killerType: string;
    impactAngle?: number;
    ragdollCorpse?: boolean;
  }): void {
    const intensity = data.size / 10; // Scale intensity based on zombie size
    const angle = data.impactAngle ?? Math.random() * Math.PI * 2;

    // Use directional blood splatter based on killer type
    switch (data.killerType) {
      case 'Shotgun':
        // Heavy directional spray
        this.bloodParticleSystem.createDirectionalBloodSplatter(
          data.x,
          data.y,
          angle,
          intensity * 2.0,
          0.6 // Tight cone
        );
        break;

      case 'Sniper':
        // Precise blood drip/spray
        this.bloodParticleSystem.createBloodDrip(data.x, data.y, angle, intensity * 1.5);
        break;

      case 'Grenade':
      case 'Tesla':
        // Explosive blood mist + omnidirectional splatter
        this.bloodParticleSystem.createBloodMist(data.x, data.y, 20 * intensity, intensity * 1.5);
        this.bloodParticleSystem.createBloodSplatter(data.x, data.y, intensity * 1.2);
        break;

      case 'Flame':
        // Minimal blood (cauterized) - just a small splatter
        this.bloodParticleSystem.createBloodSplatter(data.x, data.y, intensity * 0.3);
        break;

      default:
        // Default directional splatter
        this.bloodParticleSystem.createDirectionalBloodSplatter(
          data.x,
          data.y,
          angle,
          intensity,
          1.0
        );
        break;
    }

    // Ragdoll deaths leave their own settled body later; others get a posed corpse right away
    if (!data.ragdollCorpse) {
      this.corpseManager.createCorpse(
        data.x,
        data.y,
        data.type,
        data.size,
        data.killerType,
        data.impactAngle
      );
    }
  }

  // Remove zombie from game
  public removeZombie(index: number): Zombie {
    const zombie = this.zombies[index];
    this.container.removeChild(zombie);
    this.getZombiePool(zombie.getType()).release(zombie);
    this.zombies.splice(index, 1);
    this.zombiesDirty = true; // Mark zombies as changed
    return zombie;
  }

  // Get all active zombies
  public getZombies(): Zombie[] {
    return this.zombies;
  }

  // Check if zombies array has changed since last check
  public areZombiesDirty(): boolean {
    return this.zombiesDirty;
  }

  // Reset dirty flag after consuming the change
  public clearZombiesDirty(): void {
    this.zombiesDirty = false;
  }

  // Check if wave is complete (all zombies spawned and cleared)
  public isWaveComplete(): boolean {
    return !this.isSpawning && this.zombies.length === 0;
  }

  // Clear all zombies
  public clear(): void {
    for (const zombie of this.zombies) {
      this.container.removeChild(zombie);
      this.getZombiePool(zombie.getType()).release(zombie);
    }
    this.zombies = [];
    this.zombiesDirty = true; // Mark zombies as changed
    this.spawnQueue = [];
    this.isSpawning = false;
    this.bloodParticleSystem.clear();
    this.corpseManager.clear();
  }

  // Get blood particle system (for external access if needed)
  public getBloodParticleSystem(): BloodParticleSystem {
    return this.bloodParticleSystem;
  }

  // Get corpse manager (for external access if needed)
  public getCorpseManager(): CorpseManager {
    return this.corpseManager;
  }

  // Spawn a specific zombie type (for debugging/testing)
  public spawnZombieType(type: string): void {
    this.spawnZombie(type);
  }
}
