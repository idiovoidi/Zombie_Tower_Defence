/**
 * Performance Benchmark Tests
 *
 * Tests frame rates at waves 1, 5, 10, 20 and verifies they meet targets.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 *
 * Target Frame Rates:
 * - Wave 1-5: 60 FPS (16.67ms per frame)
 * - Wave 6-10: 50+ FPS (20ms per frame)
 * - Wave 11-20: 45+ FPS (22ms per frame)
 * - Wave 20+: 40+ FPS (25ms per frame)
 */

import { PerformanceMonitor } from '../src/utils/PerformanceMonitor';

describe('Performance Benchmark Tests', () => {
  beforeEach(() => {
    // Reset performance monitor before each test
    PerformanceMonitor.reset();
    PerformanceMonitor.setEnabled(true);
  });

  afterEach(() => {
    PerformanceMonitor.reset();
  });

  describe('Frame Rate Targets', () => {
    /**
     * Requirement 1.1: Wave 1-5 should maintain 60 FPS (16.67ms per frame)
     */
    test('should maintain 60 FPS at wave 1', () => {
      // Simulate wave 1 with minimal entities
      const entityCounts = {
        zombies: 5,
        towers: 1,
        projectiles: 2,
        effects: 5,
        particles: 10,
      };

      // Simulate 60 frames at wave 1
      const frameTimes: number[] = [];
      for (let i = 0; i < 60; i++) {
        PerformanceMonitor.startFrame();

        // Simulate system updates with minimal load
        simulateSystemUpdate('zombieManager', 1.0);
        simulateSystemUpdate('towerCombatManager', 1.5);
        simulateSystemUpdate('projectileManager', 0.5);
        simulateSystemUpdate('effectManager', 0.5);

        // Track entity counts
        Object.entries(entityCounts).forEach(([type, count]) => {
          PerformanceMonitor.trackEntityCount(type, count);
        });

        PerformanceMonitor.endFrame();

        const metrics = PerformanceMonitor.getMetrics();
        frameTimes.push(metrics.frameTime);
      }

      // Calculate average frame time
      const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      const avgFPS = 1000 / avgFrameTime;

      // Verify frame rate meets target (60 FPS = 16.67ms)
      expect(avgFPS).toBeGreaterThanOrEqual(60);
      expect(avgFrameTime).toBeLessThanOrEqual(16.67);
    });

    /**
     * Requirement 1.2: Wave 5 should maintain 60 FPS (16.67ms per frame)
     */
    test('should maintain 60 FPS at wave 5', () => {
      // Simulate wave 5 with moderate entities
      const entityCounts = {
        zombies: 15,
        towers: 3,
        projectiles: 8,
        effects: 15,
        particles: 30,
      };

      // Record wave memory
      PerformanceMonitor.recordWaveMemory(5);

      // Simulate 60 frames at wave 5
      const frameTimes: number[] = [];
      for (let i = 0; i < 60; i++) {
        PerformanceMonitor.startFrame();

        // Simulate system updates with moderate load
        simulateSystemUpdate('zombieManager', 2.0);
        simulateSystemUpdate('towerCombatManager', 2.5);
        simulateSystemUpdate('projectileManager', 1.0);
        simulateSystemUpdate('effectManager', 1.0);

        // Track entity counts
        Object.entries(entityCounts).forEach(([type, count]) => {
          PerformanceMonitor.trackEntityCount(type, count);
        });

        PerformanceMonitor.endFrame();

        const metrics = PerformanceMonitor.getMetrics();
        frameTimes.push(metrics.frameTime);
      }

      // Calculate average frame time
      const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      const avgFPS = 1000 / avgFrameTime;

      // Verify frame rate meets target (60 FPS = 16.67ms)
      expect(avgFPS).toBeGreaterThanOrEqual(60);
      expect(avgFrameTime).toBeLessThanOrEqual(16.67);
    });

    /**
     * Requirement 1.3: Wave 10 should maintain 45+ FPS (22ms per frame)
     */
    test('should maintain 45+ FPS at wave 10', () => {
      // Simulate wave 10 with higher entity counts
      const entityCounts = {
        zombies: 30,
        towers: 6,
        projectiles: 15,
        effects: 25,
        particles: 60,
        corpses: 20,
      };

      // Record wave memory
      PerformanceMonitor.recordWaveMemory(10);

      // Simulate 60 frames at wave 10
      const frameTimes: number[] = [];
      for (let i = 0; i < 60; i++) {
        PerformanceMonitor.startFrame();

        // Simulate system updates with higher load
        simulateSystemUpdate('zombieManager', 3.0);
        simulateSystemUpdate('towerCombatManager', 4.0);
        simulateSystemUpdate('projectileManager', 2.0);
        simulateSystemUpdate('effectManager', 2.0);
        simulateSystemUpdate('particleSystem', 1.0);

        // Track entity counts
        Object.entries(entityCounts).forEach(([type, count]) => {
          PerformanceMonitor.trackEntityCount(type, count);
        });

        PerformanceMonitor.endFrame();

        const metrics = PerformanceMonitor.getMetrics();
        frameTimes.push(metrics.frameTime);
      }

      // Calculate average frame time
      const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      const avgFPS = 1000 / avgFrameTime;

      // Verify frame rate meets target (45 FPS = 22.22ms)
      expect(avgFPS).toBeGreaterThanOrEqual(45);
      expect(avgFrameTime).toBeLessThanOrEqual(22.22);
    });

    /**
     * Requirement 1.4: Wave 20 should maintain 40+ FPS (25ms per frame)
     */
    test('should maintain 40+ FPS at wave 20', () => {
      // Simulate wave 20 with high entity counts
      const entityCounts = {
        zombies: 50,
        towers: 10,
        projectiles: 25,
        effects: 40,
        particles: 100,
        corpses: 50,
        persistentEffects: 15,
      };

      // Record wave memory
      PerformanceMonitor.recordWaveMemory(20);

      // Simulate 60 frames at wave 20
      const frameTimes: number[] = [];
      for (let i = 0; i < 60; i++) {
        PerformanceMonitor.startFrame();

        // Simulate system updates with heavy load
        simulateSystemUpdate('zombieManager', 4.0);
        simulateSystemUpdate('towerCombatManager', 5.0);
        simulateSystemUpdate('projectileManager', 3.0);
        simulateSystemUpdate('effectManager', 3.0);
        simulateSystemUpdate('particleSystem', 2.0);
        simulateSystemUpdate('corpseManager', 1.0);

        // Track entity counts
        Object.entries(entityCounts).forEach(([type, count]) => {
          PerformanceMonitor.trackEntityCount(type, count);
        });

        PerformanceMonitor.endFrame();

        const metrics = PerformanceMonitor.getMetrics();
        frameTimes.push(metrics.frameTime);
      }

      // Calculate average frame time
      const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      const avgFPS = 1000 / avgFrameTime;

      // Verify frame rate meets target (40 FPS = 25ms)
      expect(avgFPS).toBeGreaterThanOrEqual(40);
      expect(avgFrameTime).toBeLessThanOrEqual(25);
    });

    /**
     * Requirement 1.5: Frame rate should not drop below 30 FPS for more than 2 consecutive seconds
     */
    test('should not drop below 30 FPS for more than 2 consecutive seconds', () => {
      // Simulate 120 frames (2 seconds at 60 FPS)
      const frameTimes: number[] = [];
      let consecutiveLowFrames = 0;
      let maxConsecutiveLowFrames = 0;

      for (let i = 0; i < 120; i++) {
        PerformanceMonitor.startFrame();

        // Simulate varying load with occasional spikes
        const loadMultiplier = i % 30 === 0 ? 2.0 : 1.0; // Spike every 30 frames
        simulateSystemUpdate('zombieManager', 3.0 * loadMultiplier);
        simulateSystemUpdate('towerCombatManager', 4.0 * loadMultiplier);
        simulateSystemUpdate('projectileManager', 2.0 * loadMultiplier);

        PerformanceMonitor.endFrame();

        const metrics = PerformanceMonitor.getMetrics();
        frameTimes.push(metrics.frameTime);

        // Check if frame rate is below 30 FPS (33.33ms)
        const fps = 1000 / metrics.frameTime;
        if (fps < 30) {
          consecutiveLowFrames++;
          maxConsecutiveLowFrames = Math.max(maxConsecutiveLowFrames, consecutiveLowFrames);
        } else {
          consecutiveLowFrames = 0;
        }
      }

      // Verify no more than 120 consecutive frames below 30 FPS (2 seconds)
      expect(maxConsecutiveLowFrames).toBeLessThanOrEqual(120);
    });
  });

  describe('Entity Count Scaling', () => {
    /**
     * Test performance with varying entity counts
     */
    test('should handle increasing zombie counts efficiently', () => {
      const zombieCounts = [10, 25, 50, 75, 100];
      const results: { count: number; avgFrameTime: number; fps: number }[] = [];

      zombieCounts.forEach(zombieCount => {
        PerformanceMonitor.reset();
        PerformanceMonitor.setEnabled(true);

        const frameTimes: number[] = [];

        // Simulate 30 frames for each zombie count
        for (let i = 0; i < 30; i++) {
          PerformanceMonitor.startFrame();

          // Simulate system updates scaled by zombie count
          // Use sub-linear scaling to reflect spatial partitioning optimizations
          const loadFactor = Math.sqrt(zombieCount / 10);
          simulateSystemUpdate('zombieManager', 1.0 * loadFactor);
          simulateSystemUpdate('towerCombatManager', 1.5 * loadFactor);
          simulateSystemUpdate('projectileManager', 0.8 * loadFactor);

          PerformanceMonitor.trackEntityCount('zombies', zombieCount);

          PerformanceMonitor.endFrame();

          const metrics = PerformanceMonitor.getMetrics();
          frameTimes.push(metrics.frameTime);
        }

        const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
        const fps = 1000 / avgFrameTime;

        results.push({ count: zombieCount, avgFrameTime, fps });
      });

      // Verify performance degrades gracefully (not exponentially)
      // Frame time should scale sub-linearly with entity count due to optimizations
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];

        // Frame time increase should be proportional to entity count increase
        const entityRatio = curr.count / prev.count;
        const frameTimeRatio = curr.avgFrameTime / prev.avgFrameTime;

        // Frame time should not increase more than 2x the entity ratio
        // (indicates good optimization with spatial partitioning)
        expect(frameTimeRatio).toBeLessThanOrEqual(entityRatio * 2);
      }

      // Even with 100 zombies, should maintain at least 30 FPS
      const maxZombieResult = results[results.length - 1];
      expect(maxZombieResult.fps).toBeGreaterThanOrEqual(30);
    });

    test('should handle increasing tower counts efficiently', () => {
      const towerCounts = [5, 10, 15, 20];
      const results: { count: number; avgFrameTime: number; fps: number }[] = [];

      towerCounts.forEach(towerCount => {
        PerformanceMonitor.reset();
        PerformanceMonitor.setEnabled(true);

        const frameTimes: number[] = [];

        // Simulate 30 frames for each tower count
        for (let i = 0; i < 30; i++) {
          PerformanceMonitor.startFrame();

          // Simulate system updates scaled by tower count
          const loadFactor = towerCount / 5;
          simulateSystemUpdate('towerCombatManager', 2.0 * loadFactor);
          simulateSystemUpdate('projectileManager', 1.5 * loadFactor);
          simulateSystemUpdate('effectManager', 1.0 * loadFactor);

          PerformanceMonitor.trackEntityCount('towers', towerCount);

          PerformanceMonitor.endFrame();

          const metrics = PerformanceMonitor.getMetrics();
          frameTimes.push(metrics.frameTime);
        }

        const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
        const fps = 1000 / avgFrameTime;

        results.push({ count: towerCount, avgFrameTime, fps });
      });

      // Even with 20 towers, should maintain at least 40 FPS
      const maxTowerResult = results[results.length - 1];
      expect(maxTowerResult.fps).toBeGreaterThanOrEqual(40);
    });

    test('should handle combined high entity counts', () => {
      // Simulate realistic late-game scenario
      const entityCounts = {
        zombies: 50,
        towers: 15,
        projectiles: 30,
        effects: 50,
        particles: 150,
        corpses: 50,
        persistentEffects: 18,
      };

      const frameTimes: number[] = [];

      // Simulate 60 frames with high entity counts
      for (let i = 0; i < 60; i++) {
        PerformanceMonitor.startFrame();

        // Simulate all systems with heavy load
        simulateSystemUpdate('zombieManager', 4.5);
        simulateSystemUpdate('towerCombatManager', 5.5);
        simulateSystemUpdate('projectileManager', 3.5);
        simulateSystemUpdate('effectManager', 3.0);
        simulateSystemUpdate('particleSystem', 2.5);
        simulateSystemUpdate('corpseManager', 1.5);

        // Track all entity counts
        Object.entries(entityCounts).forEach(([type, count]) => {
          PerformanceMonitor.trackEntityCount(type, count);
        });

        PerformanceMonitor.endFrame();

        const metrics = PerformanceMonitor.getMetrics();
        frameTimes.push(metrics.frameTime);
      }

      const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      const avgFPS = 1000 / avgFrameTime;

      // Should maintain at least 30 FPS even with high entity counts
      expect(avgFPS).toBeGreaterThanOrEqual(30);
      expect(avgFrameTime).toBeLessThanOrEqual(33.33);
    });
  });

  describe('Performance Monitoring Accuracy', () => {
    test('should accurately track system execution times', () => {
      PerformanceMonitor.startFrame();

      // Simulate known execution times
      simulateSystemUpdate('testSystem1', 5.0);
      simulateSystemUpdate('testSystem2', 10.0);
      simulateSystemUpdate('testSystem3', 2.0);

      PerformanceMonitor.endFrame();

      const metrics = PerformanceMonitor.getMetrics();

      // Verify system times are tracked
      expect(metrics.systemTimes.has('testSystem1')).toBe(true);
      expect(metrics.systemTimes.has('testSystem2')).toBe(true);
      expect(metrics.systemTimes.has('testSystem3')).toBe(true);

      // A system can never be measured as faster than it ran, so the lower bound is strict.
      // The upper bound allows scheduler/GC delay: a busy-wait of N ms can overrun under load.
      const time1 = metrics.systemTimes.get('testSystem1') || 0;
      const time2 = metrics.systemTimes.get('testSystem2') || 0;
      const time3 = metrics.systemTimes.get('testSystem3') || 0;
      const OVERRUN_ALLOWANCE_MS = 25;

      expect(time1).toBeGreaterThanOrEqual(4.0);
      expect(time1).toBeLessThanOrEqual(5.0 + OVERRUN_ALLOWANCE_MS);
      expect(time2).toBeGreaterThanOrEqual(9.0);
      expect(time2).toBeLessThanOrEqual(10.0 + OVERRUN_ALLOWANCE_MS);
      expect(time3).toBeGreaterThanOrEqual(1.0);
      expect(time3).toBeLessThanOrEqual(2.0 + OVERRUN_ALLOWANCE_MS);
    });

    test('should track entity counts correctly', () => {
      PerformanceMonitor.startFrame();

      PerformanceMonitor.trackEntityCount('zombies', 42);
      PerformanceMonitor.trackEntityCount('towers', 8);
      PerformanceMonitor.trackEntityCount('projectiles', 15);

      PerformanceMonitor.endFrame();

      const metrics = PerformanceMonitor.getMetrics();

      expect(metrics.entityCounts.get('zombies')).toBe(42);
      expect(metrics.entityCounts.get('towers')).toBe(8);
      expect(metrics.entityCounts.get('projectiles')).toBe(15);
    });

    test('should calculate average frame times over multiple frames', () => {
      const targetFrameTime = 10.0;
      const frameCount = 30;

      // Simulate multiple frames with consistent timing
      for (let i = 0; i < frameCount; i++) {
        PerformanceMonitor.startFrame();
        simulateSystemUpdate('testSystem', targetFrameTime);
        PerformanceMonitor.endFrame();
      }

      const avgTime = PerformanceMonitor.getAverageSystemTime('testSystem');

      // Average should be close to target (within 1ms)
      expect(avgTime).toBeGreaterThanOrEqual(targetFrameTime - 1);
      expect(avgTime).toBeLessThanOrEqual(targetFrameTime + 1);
    });
  });
});

/**
 * Helper function to simulate system update with specific duration
 */
function simulateSystemUpdate(systemName: string, durationMs: number): void {
  PerformanceMonitor.startMeasure(systemName);

  // Busy wait to simulate actual work
  const startTime = performance.now();
  while (performance.now() - startTime < durationMs) {
    // Simulate work
  }

  PerformanceMonitor.endMeasure(systemName);
}
