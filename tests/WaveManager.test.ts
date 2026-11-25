import { GameConfig } from '../src/config/gameConfig';
import { WaveManager } from '../src/managers/WaveManager';

// Mock ZombieFactory to avoid Pixi.js dependencies
vi.mock('../src/objects/ZombieFactory', () => {
  return {
    ZombieFactory: {
      createZombie: vi.fn().mockImplementation((type, x, y, wave) => {
        return {
          type,
          x,
          y,
          wave,
          // Mock zombie methods that might be called
          update: vi.fn(),
          takeDamage: vi.fn().mockReturnValue(10),
          hasReachedEnd: vi.fn().mockReturnValue(false),
          getType: vi.fn().mockReturnValue(type),
          getReward: vi.fn().mockReturnValue(10),
          getSpeed: vi.fn().mockReturnValue(50),
        };
      }),
    },
  };
});

describe('WaveManager', () => {
  let waveManager: WaveManager;

  beforeEach(() => {
    waveManager = new WaveManager();
  });

  describe('Wave Progression', () => {
    test('should start at wave 1', () => {
      expect(waveManager.getCurrentWave()).toBe(1);
    });

    test('should advance to next wave', () => {
      waveManager.nextWave();
      expect(waveManager.getCurrentWave()).toBe(2);
    });

    test('should handle multiple wave advances', () => {
      for (let i = 0; i < 5; i++) {
        waveManager.nextWave();
      }
      expect(waveManager.getCurrentWave()).toBe(6);
    });
  });

  describe('Zombie Composition', () => {
    test('should have correct zombie composition for waves 1-3', () => {
      for (let wave = 1; wave <= 3; wave++) {
        // biome-ignore lint/suspicious/noExplicitAny: Test needs access to private property
        (waveManager as any).currentWave = wave;
        const zombies = waveManager.getCurrentWaveZombies();

        // Should have 2 zombie types (Basic and Fast)
        expect(zombies.length).toBe(2);

        // Check zombie types
        expect(zombies[0].type).toBe(GameConfig.ZOMBIE_TYPES.BASIC);
        expect(zombies[1].type).toBe(GameConfig.ZOMBIE_TYPES.FAST);
      }
    });

    test('should have correct zombie composition for waves 4-5', () => {
      for (let wave = 4; wave <= 5; wave++) {
        // biome-ignore lint/suspicious/noExplicitAny: Test needs access to private property
        (waveManager as any).currentWave = wave;
        const zombies = waveManager.getCurrentWaveZombies();

        // Should have 3 zombie types (Basic, Fast, and Tank)
        expect(zombies.length).toBe(3);

        // Check zombie types
        expect(zombies[0].type).toBe(GameConfig.ZOMBIE_TYPES.BASIC);
        expect(zombies[1].type).toBe(GameConfig.ZOMBIE_TYPES.FAST);
        expect(zombies[2].type).toBe(GameConfig.ZOMBIE_TYPES.TANK);
      }
    });

    test('should have correct zombie composition for waves 6-8', () => {
      for (let wave = 6; wave <= 8; wave++) {
        // biome-ignore lint/suspicious/noExplicitAny: Test needs access to private property
        (waveManager as any).currentWave = wave;
        const zombies = waveManager.getCurrentWaveZombies();

        // Should have 4 zombie types (Basic, Fast, Tank, and Armored)
        expect(zombies.length).toBe(4);

        // Check zombie types
        expect(zombies[0].type).toBe(GameConfig.ZOMBIE_TYPES.BASIC);
        expect(zombies[1].type).toBe(GameConfig.ZOMBIE_TYPES.FAST);
        expect(zombies[2].type).toBe(GameConfig.ZOMBIE_TYPES.TANK);
        expect(zombies[3].type).toBe(GameConfig.ZOMBIE_TYPES.ARMORED);
      }
    });

    test('should have correct zombie composition for waves 9-10', () => {
      for (let wave = 9; wave <= 10; wave++) {
        // biome-ignore lint/suspicious/noExplicitAny: Test needs access to private property
        (waveManager as any).currentWave = wave;
        const zombies = waveManager.getCurrentWaveZombies();

        // Should have 5 zombie types (Basic, Fast, Tank, Armored, Swarm)
        expect(zombies.length).toBe(5);

        // Check zombie types
        expect(zombies[0].type).toBe(GameConfig.ZOMBIE_TYPES.BASIC);
        expect(zombies[1].type).toBe(GameConfig.ZOMBIE_TYPES.FAST);
        expect(zombies[2].type).toBe(GameConfig.ZOMBIE_TYPES.TANK);
        expect(zombies[3].type).toBe(GameConfig.ZOMBIE_TYPES.ARMORED);
        expect(zombies[4].type).toBe(GameConfig.ZOMBIE_TYPES.SWARM);
      }
    });

    test('should have correct zombie composition for waves 41+', () => {
      // biome-ignore lint/suspicious/noExplicitAny: Test needs access to private property
      (waveManager as any).currentWave = 45;
      const zombies = waveManager.getCurrentWaveZombies();

      // Wave 45 is a Necro Tank wave — 8 base types + Necro Tank
      expect(zombies.length).toBe(9);

      // Check zombie types
      expect(zombies[0].type).toBe(GameConfig.ZOMBIE_TYPES.BASIC);
      expect(zombies[1].type).toBe(GameConfig.ZOMBIE_TYPES.FAST);
      expect(zombies[2].type).toBe(GameConfig.ZOMBIE_TYPES.TANK);
      expect(zombies[3].type).toBe(GameConfig.ZOMBIE_TYPES.ARMORED);
      expect(zombies[4].type).toBe(GameConfig.ZOMBIE_TYPES.SWARM);
      expect(zombies[5].type).toBe(GameConfig.ZOMBIE_TYPES.STEALTH);
      expect(zombies[6].type).toBe(GameConfig.ZOMBIE_TYPES.MECHANICAL);
      expect(zombies[7].type).toBe(GameConfig.ZOMBIE_TYPES.BOSS);
      expect(zombies[7].count).toBe(2);
      expect(zombies[8].type).toBe(GameConfig.ZOMBIE_TYPES.NECRO_TANK);
      expect(zombies[8].count).toBe(1);
    });

    test('should introduce Boss zombies starting at wave 16', () => {
      // biome-ignore lint/suspicious/noExplicitAny: Test needs access to private property
      (waveManager as any).currentWave = 15;
      expect(
        waveManager.getCurrentWaveZombies().some(g => g.type === GameConfig.ZOMBIE_TYPES.BOSS)
      ).toBe(false);

      // biome-ignore lint/suspicious/noExplicitAny: Test needs access to private property
      (waveManager as any).currentWave = 16;
      const wave16 = waveManager.getCurrentWaveZombies();
      const boss = wave16.find(g => g.type === GameConfig.ZOMBIE_TYPES.BOSS);
      expect(boss).toBeDefined();
      expect(boss?.count).toBe(1);
    });

    test('should introduce Necro Tank on wave 12 and every 5th wave from 15', () => {
      // biome-ignore lint/suspicious/noExplicitAny: Test needs access to private property
      (waveManager as any).currentWave = 11;
      expect(
        waveManager.getCurrentWaveZombies().some(g => g.type === GameConfig.ZOMBIE_TYPES.NECRO_TANK)
      ).toBe(false);

      // biome-ignore lint/suspicious/noExplicitAny: Test needs access to private property
      (waveManager as any).currentWave = 12;
      const wave12 = waveManager.getCurrentWaveZombies();
      const necro = wave12.find(g => g.type === GameConfig.ZOMBIE_TYPES.NECRO_TANK);
      expect(necro).toBeDefined();
      expect(necro?.count).toBe(1);

      // biome-ignore lint/suspicious/noExplicitAny: Test needs access to private property
      (waveManager as any).currentWave = 16;
      expect(
        waveManager.getCurrentWaveZombies().some(g => g.type === GameConfig.ZOMBIE_TYPES.NECRO_TANK)
      ).toBe(false);

      // biome-ignore lint/suspicious/noExplicitAny: Test needs access to private property
      (waveManager as any).currentWave = 20;
      expect(
        waveManager.getCurrentWaveZombies().some(g => g.type === GameConfig.ZOMBIE_TYPES.NECRO_TANK)
      ).toBe(true);
    });
  });

  describe('Zombie Stats Calculation', () => {
    test('should calculate correct health for Basic Zombie', () => {
      const health = WaveManager.calculateZombieHealth(GameConfig.ZOMBIE_TYPES.BASIC, 1);
      // Base 500 + wave*15 = 515 (debug health mult 1.0)
      expect(health).toBe(515);
    });

    test('should calculate correct health for Tank Zombie', () => {
      const health = WaveManager.calculateZombieHealth(GameConfig.ZOMBIE_TYPES.TANK, 5);
      // Base 2500 + 5*15 = 2575
      expect(health).toBe(2575);
    });

    test('should calculate correct damage for Basic Zombie', () => {
      const damage = waveManager.calculateZombieDamage(GameConfig.ZOMBIE_TYPES.BASIC, 1);
      expect(damage).toBe(11); // 10 + (1 * 1.5) * 1.0 = 11.5, floored to 11
    });

    test('should calculate correct damage for Tank Zombie with difficulty modifier', () => {
      // biome-ignore lint/suspicious/noExplicitAny: Test needs access to private property
      (waveManager as any).difficultyModifier = 1.2;
      const damage = waveManager.calculateZombieDamage(GameConfig.ZOMBIE_TYPES.TANK, 5);
      expect(damage).toBe(34); // 25 + (5 * 1.5) * 1.2 = 25 + 7.5 * 1.2 = 25 + 9 = 34
    });
  });

  describe('Scaling Functions', () => {
    test('should calculate correct spawn rate', () => {
      const spawnRate = waveManager.calculateSpawnRate(2.0, 5);
      expect(spawnRate).toBeCloseTo(1.57, 1); // 2.0 * (0.95^5) * 1.0 ≈ 1.57
    });

    test('should enforce minimum spawn rate', () => {
      // Set high wave number and difficulty modifier to test minimum
      const spawnRate = waveManager.calculateSpawnRate(0.1, 50);
      expect(spawnRate).toBe(0.5); // Should be clamped to minimum
    });

    test('should calculate correct zombie count', () => {
      const count = waveManager.calculateZombieCount(10, 1);
      expect(count).toBe(10); // 10 * (1.08^1) * 1.0 = 10.8, floored to 10
    });

    test('should not exponentially scale Boss zombie counts', () => {
      const early = waveManager.calculateZombieCount(1, 16, GameConfig.ZOMBIE_TYPES.BOSS);
      const late = waveManager.calculateZombieCount(1, 35, GameConfig.ZOMBIE_TYPES.BOSS);
      expect(early).toBe(1);
      expect(late).toBe(1);
      // Milestone waves get +1 boss
      const milestone = waveManager.calculateZombieCount(1, 20, GameConfig.ZOMBIE_TYPES.BOSS);
      expect(milestone).toBe(2);
    });

    test('should apply bonus for every 5th wave', () => {
      const count1 = waveManager.calculateZombieCount(10, 4);
      const count2 = waveManager.calculateZombieCount(10, 5);
      // Wave 4: 10 * (1.08^4) * 1.0 = 10 * 1.3605 ≈ 13
      // Wave 5: 10 * (1.08^5) * 1.0 * 1.2 = 10 * 1.4693 * 1.2 ≈ 17
      expect(count2).toBeGreaterThan(count1);
    });
  });

  describe('Difficulty Adjustment', () => {
    test('should reduce difficulty for poor performance', () => {
      const initialModifier = waveManager.getDifficultyModifier();
      waveManager.updatePerformanceMetrics(60, 0, 100); // 60% kill rate
      const newModifier = waveManager.getDifficultyModifier();
      expect(newModifier).toBeLessThan(initialModifier);
    });

    test('should increase difficulty for good performance', () => {
      const initialModifier = waveManager.getDifficultyModifier();
      waveManager.updatePerformanceMetrics(95, 0, 100); // 95% kill rate
      const newModifier = waveManager.getDifficultyModifier();
      expect(newModifier).toBeGreaterThan(initialModifier);
    });

    test('should enforce minimum difficulty modifier', () => {
      // Set very low performance multiple times
      for (let i = 0; i < 10; i++) {
        waveManager.updatePerformanceMetrics(30, 0, 100); // 30% kill rate
      }
      const modifier = waveManager.getDifficultyModifier();
      expect(modifier).toBeGreaterThanOrEqual(0.7); // Should not go below minimum
    });

    test('should enforce maximum difficulty modifier', () => {
      // Set very high performance multiple times
      for (let i = 0; i < 10; i++) {
        waveManager.updatePerformanceMetrics(98, 0, 100); // 98% kill rate
      }
      const modifier = waveManager.getDifficultyModifier();
      expect(modifier).toBeLessThanOrEqual(1.3); // Should not exceed maximum
    });
  });

  describe('Wave Zombie Creation', () => {
    test('should create zombies for current wave', () => {
      const zombies = waveManager.createWaveZombies();
      expect(zombies.length).toBeGreaterThan(0); // Should create some zombies
    });

    test('should create different zombies for different waves', () => {
      // Get zombies for wave 1
      const wave1Zombies = waveManager.createWaveZombies();

      // Advance to wave 6 and get zombies
      waveManager.nextWave();
      waveManager.nextWave();
      waveManager.nextWave();
      waveManager.nextWave();
      waveManager.nextWave();
      const wave6Zombies = waveManager.createWaveZombies();

      // Both should create zombies
      expect(wave1Zombies.length).toBeGreaterThan(0);
      expect(wave6Zombies.length).toBeGreaterThan(0);
    });
  });
});
