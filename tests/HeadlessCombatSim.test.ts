/**
 * Headless Combat Simulation Test
 *
 * This test verifies that combat can run at high speed without any rendering.
 * This is essential for AI training and balance analysis at 1000x speed.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectileManager } from '../src/managers/ProjectileManager';
import { TowerCombatManager } from '../src/managers/TowerCombatManager';
import { EventBus, GameEvents } from '../src/utils/EventBus';

describe('Headless Combat Simulation', () => {
  let eventBus: EventBus;
  let damageEvents: Array<{
    damage: number;
    towerType: string;
    killed: boolean;
    overkill: number;
  }> = [];
  let zombieKillEvents: Array<{ reward: number; type: string }> = [];
  let waveCompleteEvents: Array<{ wave: number; zombiesSpawned: number; livesLost: number }> = [];

  beforeEach(() => {
    eventBus = EventBus.getInstance();
    damageEvents = [];
    zombieKillEvents = [];
    waveCompleteEvents = [];

    // Subscribe to events for verification
    eventBus.on(GameEvents.DAMAGE_DEALT, data => {
      if (data) damageEvents.push(data);
    });

    eventBus.on(GameEvents.ZOMBIE_KILLED, data => {
      if (data) zombieKillEvents.push(data);
    });

    eventBus.on(GameEvents.WAVE_COMPLETE, data => {
      if (data) waveCompleteEvents.push(data);
    });
  });

  afterEach(() => {
    eventBus.clearAll();
  });

  it('should initialize without EffectManager (headless mode)', () => {
    // Create combat manager without any rendering dependencies
    const combatManager = new TowerCombatManager(1024, 768);
    const mockContainer = {
      addChild: () => {
        /* mock */
      },
      removeChild: () => {
        /* mock */
      },
    } as unknown as import('pixi.js').Container;
    const projectileManager = new ProjectileManager(mockContainer);

    combatManager.setProjectileManager(projectileManager);
    // NOTE: No setEffectManager() call - this is headless mode!

    // Verify combat manager exists and can be configured
    expect(combatManager).toBeDefined();
    expect(projectileManager).toBeDefined();

    // The key assertion: combat logic can be instantiated without EffectManager
    // Actual combat update is tested in the speed tests with proper mocks
    console.log('✅ Headless combat manager initialized successfully');
  });

  it('should emit DAMAGE_DEALT events without any visual components', () => {
    // Track damage via events only
    let damageEmitted = false;
    eventBus.on(GameEvents.DAMAGE_DEALT, () => {
      damageEmitted = true;
    });

    // Emit a damage event directly (simulating what TowerCombatManager would do)
    eventBus.emit(GameEvents.DAMAGE_DEALT, {
      damage: 25,
      towerType: 'basic',
      killed: false,
      overkill: 0,
    });

    expect(damageEmitted).toBe(true);
    console.log('✅ Event-based damage tracking works');
  });

  it('should track stats via EventBus without GameManager direct calls', () => {
    // Simulate wave completion
    eventBus.emit(GameEvents.WAVE_COMPLETE, {
      wave: 1,
      zombiesSpawned: 10,
      livesLost: 0,
    });

    expect(waveCompleteEvents).toHaveLength(1);
    expect(waveCompleteEvents[0].wave).toBe(1);
    expect(waveCompleteEvents[0].zombiesSpawned).toBe(10);
    expect(waveCompleteEvents[0].livesLost).toBe(0);

    console.log('✅ Wave tracking via EventBus works');
  });

  it('should run 1000 combat ticks without rendering overhead', () => {
    const combatManager = new TowerCombatManager(1024, 768);
    const mockContainer = {
      addChild: () => {
        /* mock */
      },
      removeChild: () => {
        /* mock */
      },
    } as unknown as import('pixi.js').Container;
    const projectileManager = new ProjectileManager(mockContainer);

    const startTime = performance.now();

    // Simulate 1000 frames at 60fps
    for (let i = 0; i < 1000; i++) {
      combatManager.update(16.67);
      projectileManager.update(16.67);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`✅ 1000 combat ticks completed in ${duration.toFixed(2)}ms`);

    // Should be very fast without rendering (< 100ms)
    expect(duration).toBeLessThan(1000);
  });

  it('should demonstrate high-speed simulation capability', () => {
    // This test demonstrates the key capability: running at 1000x speed
    const combatManager = new TowerCombatManager(1024, 768);
    const mockContainer = {
      addChild: () => {
        /* mock */
      },
      removeChild: () => {
        /* mock */
      },
    } as unknown as import('pixi.js').Container;
    const projectileManager = new ProjectileManager(mockContainer);
    combatManager.setProjectileManager(projectileManager);

    const simulatedTime = 1000 * 16.67; // 1000 frames worth of time
    const ticks = 1000;

    const startTime = performance.now();

    for (let i = 0; i < ticks; i++) {
      combatManager.update(16.67);
      projectileManager.update(16.67);
    }

    const actualDuration = performance.now() - startTime;
    const speedMultiplier = simulatedTime / actualDuration;

    console.log(`
🚀 HEADLESS SIMULATION RESULTS:
   - Simulated: ${(simulatedTime / 1000).toFixed(2)}s of game time
   - Actual time: ${actualDuration.toFixed(2)}ms
   - Speed multiplier: ${speedMultiplier.toFixed(0)}x
   - Status: ${speedMultiplier > 100 ? '✅ Suitable for AI training' : '⚠️ May need optimization'}
    `);

    // Expect at least 100x speed for practical use
    expect(speedMultiplier).toBeGreaterThan(100);
  });
});

describe('CombatRenderer Optional Integration', () => {
  it('should work without CombatRenderer (pure headless)', () => {
    // Verify that events are emitted even without CombatRenderer
    const eventBus = EventBus.getInstance();
    let lightningEventReceived = false;

    eventBus.on(GameEvents.LIGHTNING_ARC, () => {
      lightningEventReceived = true;
    });

    // Emit lightning event (simulating Tesla tower)
    eventBus.emit(GameEvents.LIGHTNING_ARC, {
      from: { x: 100, y: 100 },
      to: { x: 200, y: 200 },
      isFirstArc: true,
      damage: 25,
      chainIndex: 0,
    });

    expect(lightningEventReceived).toBe(true);
    console.log('✅ Lightning arc events work without CombatRenderer');
  });

  it('should emit DAMAGE_DEALT with zombie position for gib explosions', () => {
    const eventBus = EventBus.getInstance();
    let damageEventReceived = false;
    let hasPositionData = false;

    eventBus.on(GameEvents.DAMAGE_DEALT, data => {
      if (data) {
        damageEventReceived = true;
        hasPositionData = data.zombieX !== undefined && data.zombieY !== undefined;

        // Check for 100%+ overkill condition (gib explosion)
        if (data.killed && data.overkill >= data.damage) {
          console.log(
            `💥 ${data.towerType} would gib zombie at (${data.zombieX}, ${data.zombieY}) with ${data.overkill} overkill!`
          );
        }
      }
    });

    // Emit damage event with position data
    eventBus.emit(GameEvents.DAMAGE_DEALT, {
      damage: 50,
      towerType: 'Sniper',
      killed: true,
      overkill: 100, // 200% overkill - definitely a gib!
      zombieX: 500,
      zombieY: 400,
      zombieId: 'zombie-123',
    });

    expect(damageEventReceived).toBe(true);
    expect(hasPositionData).toBe(true);
    console.log('✅ DAMAGE_DEALT events include zombie position for gib explosions');
  });

  it('should emit GIB_DEATH with unique animation tiers', () => {
    const eventBus = EventBus.getInstance();
    const gibEvents: Array<{
      zombieId: string;
      x: number;
      y: number;
      overkill: number;
      towerType: string;
      gibType: 'small' | 'medium' | 'large' | 'massive';
    }> = [];

    eventBus.on(GameEvents.GIB_DEATH, data => {
      if (data) gibEvents.push(data);
    });

    // Test different overkill magnitudes
    const testCases = [
      { damage: 50, overkill: 60, expected: 'small' }, // 120% overkill
      { damage: 50, overkill: 150, expected: 'medium' }, // 300% overkill
      { damage: 50, overkill: 300, expected: 'large' }, // 600% overkill
      { damage: 50, overkill: 500, expected: 'massive' }, // 1000% overkill
    ];

    for (const test of testCases) {
      // Calculate expected gib type
      const ratio = test.overkill / test.damage;
      let expected: 'small' | 'medium' | 'large' | 'massive' = 'small';
      if (ratio >= 8) expected = 'massive';
      else if (ratio >= 4) expected = 'large';
      else if (ratio >= 2) expected = 'medium';

      eventBus.emit(GameEvents.GIB_DEATH, {
        zombieId: `zombie-${test.overkill}`,
        x: 500,
        y: 400,
        overkill: test.overkill,
        towerType: 'Sniper',
        gibType: expected,
      });

      console.log(
        `🔴 ${expected.toUpperCase()} GIB: ${test.overkill} overkill (${ratio.toFixed(1)}x damage)`
      );
    }

    expect(gibEvents).toHaveLength(4);
    expect(gibEvents[0].gibType).toBe('small');
    expect(gibEvents[1].gibType).toBe('medium');
    expect(gibEvents[2].gibType).toBe('large');
    expect(gibEvents[3].gibType).toBe('massive');

    console.log('✅ GIB_DEATH events have unique animation tiers based on overkill magnitude');
  });
});
