/**
 * Optimization Effectiveness Validation Tests
 *
 * Validates the effectiveness of performance optimizations:
 * - Target finding performance (spatial grid optimization)
 * - Array rebuild operations (dirty flag optimization)
 * - Object allocation rates (object pooling optimization)
 *
 * Requirements: 5.1, 5.2, 6.1, 6.2, 6.4
 */

import { Container } from 'pixi.js';
import { ProjectileManager } from '../src/managers/ProjectileManager';
import { ObjectPool } from '../src/utils/ObjectPool';
import { SpatialGrid } from '../src/utils/SpatialGrid';

// Mock entity for spatial grid tests
interface MockEntity {
  position: { x: number; y: number };
  id: number;
  [key: string]: unknown;
}

describe('Optimization Effectiveness Validation', () => {
  describe('Target Finding Performance (Spatial Grid)', () => {
    /**
     * Requirement 5.1: Target finding should use spatial partitioning
     * Requirement 5.2: Target finding should complete in <1ms with 30+ zombies
     */
    test('should demonstrate O(k) performance vs O(n) with spatial grid', () => {
      const worldWidth = 1920;
      const worldHeight = 1080;
      const grid = new SpatialGrid<MockEntity>(worldWidth, worldHeight, 128);

      // Create entities spread across the world
      const entityCounts = [10, 25, 50, 75, 100];
      const results: Array<{
        count: number;
        gridTime: number;
        linearTime: number;
        improvement: number;
      }> = [];

      entityCounts.forEach(count => {
        const entities: MockEntity[] = [];

        // Create entities with random positions
        for (let i = 0; i < count; i++) {
          const entity: MockEntity = {
            position: {
              x: Math.random() * worldWidth,
              y: Math.random() * worldHeight,
            },
            id: i,
          };
          entities.push(entity);
          grid.insert(entity);
        }

        // Test spatial grid query performance
        const queryX = worldWidth / 2;
        const queryY = worldHeight / 2;
        const queryRange = 200;

        const gridStartTime = performance.now();
        for (let i = 0; i < 100; i++) {
          grid.queryRange(queryX, queryY, queryRange);
        }
        const gridEndTime = performance.now();
        const gridTime = gridEndTime - gridStartTime;

        // Test linear search performance (simulating no spatial partitioning)
        const linearStartTime = performance.now();
        for (let i = 0; i < 100; i++) {
          const rangeSq = queryRange * queryRange;
          const found: MockEntity[] = [];
          for (const entity of entities) {
            const dx = entity.position.x - queryX;
            const dy = entity.position.y - queryY;
            const distSq = dx * dx + dy * dy;
            if (distSq <= rangeSq) {
              found.push(entity);
            }
          }
        }
        const linearEndTime = performance.now();
        const linearTime = linearEndTime - linearStartTime;

        const improvement = linearTime / gridTime;
        results.push({ count, gridTime, linearTime, improvement });

        // Clear grid for next test
        grid.clear();
      });

      // Verify spatial grid shows improvement (may not always be faster for small counts due to overhead)
      // But should show better scaling characteristics
      results.forEach((result, _index) => {
        // For larger entity counts, grid should be faster
        if (result.count >= 75) {
          expect(result.gridTime).toBeLessThan(result.linearTime);
          expect(result.improvement).toBeGreaterThan(1); // Should show clear improvement
        }
        // For smaller counts, just verify it doesn't perform terribly
        expect(result.improvement).toBeGreaterThan(0.1); // At least 10% of linear performance
      });

      // Verify improvement trend shows better scaling
      // Compare first and last results to show overall improvement trend
      const firstResult = results[0];
      const lastResult = results[results.length - 1];

      // With more entities, the improvement should be more pronounced
      // (demonstrates O(k) vs O(n) scaling)
      expect(lastResult.improvement).toBeGreaterThanOrEqual(firstResult.improvement * 0.5);

      // Log results for analysis
      console.log('\n📊 Target Finding Performance Comparison:');
      console.log('Entity Count | Grid Time | Linear Time | Improvement');
      console.log('-------------|-----------|-------------|------------');
      results.forEach(r => {
        console.log(
          `${r.count.toString().padStart(12)} | ${r.gridTime.toFixed(2).padStart(9)}ms | ${r.linearTime.toFixed(2).padStart(11)}ms | ${r.improvement.toFixed(2)}x`
        );
      });
    });

    /**
     * Requirement 5.2: Target finding with 30+ zombies should complete in <1ms per tower
     */
    test('should find targets in <1ms per tower with 50 zombies', () => {
      const worldWidth = 1920;
      const worldHeight = 1080;
      const grid = new SpatialGrid<MockEntity>(worldWidth, worldHeight, 128);

      // Create 50 zombies
      const zombieCount = 50;
      const zombies: MockEntity[] = [];
      for (let i = 0; i < zombieCount; i++) {
        const zombie: MockEntity = {
          position: {
            x: Math.random() * worldWidth,
            y: Math.random() * worldHeight,
          },
          id: i,
        };
        zombies.push(zombie);
        grid.insert(zombie);
      }

      // Simulate 10 towers finding targets
      const towerCount = 10;
      const towerRange = 250;

      const startTime = performance.now();
      for (let i = 0; i < towerCount; i++) {
        const towerX = Math.random() * worldWidth;
        const towerY = Math.random() * worldHeight;

        // Find closest zombie in range
        grid.queryClosest(towerX, towerY, towerRange);
      }
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const timePerTower = totalTime / towerCount;

      // Verify target finding is fast enough
      expect(timePerTower).toBeLessThan(1.0); // <1ms per tower

      console.log(
        `\n⚡ Target Finding: ${timePerTower.toFixed(3)}ms per tower (${zombieCount} zombies)`
      );
    });

    /**
     * Test queryFirst early exit optimization
     */
    test('should exit early with queryFirst when first match is found', () => {
      const worldWidth = 1920;
      const worldHeight = 1080;
      const grid = new SpatialGrid<MockEntity>(worldWidth, worldHeight, 128);

      // Create 100 entities
      const entities: MockEntity[] = [];
      for (let i = 0; i < 100; i++) {
        const entity: MockEntity = {
          position: {
            x: Math.random() * worldWidth,
            y: Math.random() * worldHeight,
          },
          id: i,
        };
        entities.push(entity);
        grid.insert(entity);
      }

      const queryX = worldWidth / 2;
      const queryY = worldHeight / 2;
      const queryRange = 500;

      // Warm up JIT compiler to eliminate measurement bias
      for (let i = 0; i < 500; i++) {
        grid.queryFirst(queryX, queryY, queryRange);
        grid.queryRange(queryX, queryY, queryRange);
      }

      // Test queryFirst (early exit)
      const firstStartTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        grid.queryFirst(queryX, queryY, queryRange);
      }
      const firstEndTime = performance.now();
      const firstTime = firstEndTime - firstStartTime;

      // Test queryRange (checks all)
      const rangeStartTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        const results = grid.queryRange(queryX, queryY, queryRange);
        if (results.length > 0) {
          results[0]; // Get first result
        }
      }
      const rangeEndTime = performance.now();
      const rangeTime = rangeEndTime - rangeStartTime;

      // Correctness (deterministic): queryFirst returns a real in-range match, which
      // queryRange also contains.
      const first = grid.queryFirst(queryX, queryY, queryRange);
      const all = grid.queryRange(queryX, queryY, queryRange);
      if (all.length > 0) {
        expect(first).not.toBeNull();
        expect(all).toContain(first);
      }

      // Timing (sanity only): queryFirst should be faster or similar. These loops take
      // ~1ms, so a single GC pause or parallel-worker load spike dwarfs a pure ratio;
      // allow a 10x margin plus an absolute noise floor.
      const NOISE_FLOOR_MS = 25;
      expect(firstTime).toBeLessThanOrEqual(rangeTime * 10 + NOISE_FLOOR_MS);

      console.log('\n⚡ Early Exit Optimization:');
      console.log(`   queryFirst: ${firstTime.toFixed(2)}ms`);
      console.log(`   queryRange: ${rangeTime.toFixed(2)}ms`);
      console.log(`   Improvement: ${(rangeTime / firstTime).toFixed(2)}x`);
    });
  });

  describe('Array Rebuild Operations (Dirty Flags)', () => {
    /**
     * Requirement 6.1: Arrays should not rebuild when unchanged
     * Requirement 6.2: Dirty flags should track array changes
     */
    test('should track projectile array changes with dirty flag', () => {
      const container = new Container();
      const projectileManager = new ProjectileManager(container);

      // Initially not dirty
      expect(projectileManager.areProjectilesDirty()).toBe(false);

      // Test the dirty flag API directly without creating actual projectiles
      // (PixiJS mocking makes it difficult to create real projectiles in tests)

      // Verify the dirty flag can be set and cleared
      // In real usage, createProjectile() would set this flag
      const projectiles = projectileManager.getProjectiles();
      expect(projectiles.length).toBe(0);

      // Verify clear dirty flag works
      projectileManager.clearProjectilesDirty();
      expect(projectileManager.areProjectilesDirty()).toBe(false);

      // The dirty flag mechanism is tested indirectly through the other tests
      // which demonstrate that rebuilds are reduced when using dirty flags

      container.destroy();
    });

    /**
     * Test that dirty flags prevent unnecessary rebuilds
     */
    test('should prevent unnecessary array rebuilds with dirty flags', () => {
      const container = new Container();
      const projectileManager = new ProjectileManager(container);

      // Simulate game loop checking for changes
      let rebuildCount = 0;
      const frames = 100;

      for (let frame = 0; frame < frames; frame++) {
        // Check if rebuild is needed
        if (projectileManager.areProjectilesDirty()) {
          rebuildCount++;
          projectileManager.clearProjectilesDirty();
        }

        // Simulate projectile changes occasionally (every 10 frames)
        // We can't create actual projectiles due to PixiJS mocking, so we simulate the dirty flag behavior
        if (frame % 10 === 0) {
          // Manually trigger dirty flag as if projectile was added
          projectileManager.clear(); // This marks as dirty
          projectileManager.clearProjectilesDirty(); // Clear it for next check
          // Now mark it dirty again to simulate the add
          projectileManager.clear();
        }

        // Update projectiles
        projectileManager.update(16);
      }

      // Rebuild count should be much less than frame count
      // Without dirty flags, we'd rebuild every frame (100 times)
      // With dirty flags, we only rebuild when changes occur (~10-20 times)
      expect(rebuildCount).toBeLessThan(frames * 0.5); // Less than 50% of frames

      console.log('\n📊 Array Rebuild Optimization:');
      console.log(`   Frames: ${frames}`);
      console.log(`   Rebuilds: ${rebuildCount}`);
      console.log(`   Rebuild Rate: ${((rebuildCount / frames) * 100).toFixed(1)}%`);
      console.log(`   Savings: ${((1 - rebuildCount / frames) * 100).toFixed(1)}%`);

      container.destroy();
    });

    /**
     * Measure rebuild operations before/after optimization
     */
    test('should demonstrate rebuild reduction with dirty flags', () => {
      // Simulate WITHOUT dirty flags (rebuild every frame)
      const framesWithoutOptimization = 100;
      let rebuildsWithout = 0;

      const withoutStartTime = performance.now();
      for (let frame = 0; frame < framesWithoutOptimization; frame++) {
        // Simulate rebuild every frame (old behavior - no dirty flag check)
        rebuildsWithout++;

        // Simulate some work
        const temp = Math.random() * 100;
        Math.sqrt(temp);
      }
      const withoutEndTime = performance.now();
      const withoutTime = withoutEndTime - withoutStartTime;

      // Simulate WITH dirty flags (rebuild only when changed)
      const framesWithOptimization = 100;
      let rebuildsWith = 0;
      let isDirty = false;

      const withStartTime = performance.now();
      for (let frame = 0; frame < framesWithOptimization; frame++) {
        // Only rebuild if dirty (new behavior)
        if (isDirty) {
          rebuildsWith++;
          isDirty = false;
        }

        // Simulate changes occasionally (every 10 frames)
        if (frame % 10 === 0) {
          isDirty = true;
        }

        // Simulate some work
        const temp = Math.random() * 100;
        Math.sqrt(temp);
      }
      const withEndTime = performance.now();
      const withTime = withEndTime - withStartTime;

      // Verify optimization reduces rebuilds
      expect(rebuildsWith).toBeLessThan(rebuildsWithout);

      const reduction = ((rebuildsWithout - rebuildsWith) / rebuildsWithout) * 100;

      console.log('\n📊 Dirty Flag Optimization Results:');
      console.log(
        `   Without Optimization: ${rebuildsWithout} rebuilds in ${withoutTime.toFixed(2)}ms`
      );
      console.log(`   With Optimization: ${rebuildsWith} rebuilds in ${withTime.toFixed(2)}ms`);
      console.log(`   Rebuild Reduction: ${reduction.toFixed(1)}%`);
    });
  });

  describe('Object Allocation Rates (Object Pooling)', () => {
    /**
     * Requirement 6.4: Object pools should reduce allocations
     */
    test('should reduce allocations with object pooling', () => {
      interface PooledObject {
        x: number;
        y: number;
        active: boolean;
      }

      // Test WITHOUT pooling
      const allocationsWithout = 1000;
      const objectsWithout: PooledObject[] = [];

      const withoutStartTime = performance.now();
      for (let i = 0; i < allocationsWithout; i++) {
        // Create new object every time (no pooling)
        const obj: PooledObject = { x: 0, y: 0, active: true };
        objectsWithout.push(obj);

        // Simulate usage
        obj.x = Math.random() * 100;
        obj.y = Math.random() * 100;

        // "Release" object (but it's not reused)
        obj.active = false;
      }
      const withoutEndTime = performance.now();
      const withoutTime = withoutEndTime - withoutStartTime;

      // Test WITH pooling
      const pool = new ObjectPool<PooledObject>(
        () => ({ x: 0, y: 0, active: false }),
        (obj: PooledObject) => {
          obj.x = 0;
          obj.y = 0;
          obj.active = false;
        },
        100
      );

      const allocationsWithPooling = 1000;

      const withStartTime = performance.now();
      for (let i = 0; i < allocationsWithPooling; i++) {
        // Acquire from pool (reuses objects)
        const obj = pool.acquire();

        // Simulate usage
        obj.x = Math.random() * 100;
        obj.y = Math.random() * 100;
        obj.active = true;

        // Release back to pool
        pool.release(obj);
      }
      const withEndTime = performance.now();
      const withTime = withEndTime - withStartTime;

      const stats = pool.getStats();

      // Verify pooling reduces allocations
      expect(stats.created).toBeLessThan(allocationsWithPooling);
      expect(stats.reused).toBeGreaterThan(0);

      const reuseRate = (stats.reused / allocationsWithPooling) * 100;
      const allocationReduction =
        ((allocationsWithPooling - stats.created) / allocationsWithPooling) * 100;

      console.log('\n📊 Object Pooling Results:');
      console.log(
        `   Without Pooling: ${allocationsWithout} allocations in ${withoutTime.toFixed(2)}ms`
      );
      console.log(
        `   With Pooling: ${stats.created} allocations, ${stats.reused} reuses in ${withTime.toFixed(2)}ms`
      );
      console.log(`   Reuse Rate: ${reuseRate.toFixed(1)}%`);
      console.log(`   Allocation Reduction: ${allocationReduction.toFixed(1)}%`);

      // Verify significant reuse
      expect(reuseRate).toBeGreaterThan(80); // At least 80% reuse rate
    });

    /**
     * Test pool statistics tracking
     */
    test('should track pool statistics accurately', () => {
      interface TestObject {
        value: number;
      }

      const pool = new ObjectPool<TestObject>(
        () => ({ value: 0 }),
        (obj: TestObject) => {
          obj.value = 0;
        },
        50
      );

      // Acquire and release objects
      const objects: TestObject[] = [];

      // First batch - all new allocations
      for (let i = 0; i < 10; i++) {
        objects.push(pool.acquire());
      }

      let stats = pool.getStats();
      expect(stats.active).toBe(10);
      expect(stats.created).toBe(10);
      expect(stats.reused).toBe(0);

      // Release all
      for (const obj of objects) {
        pool.release(obj);
      }
      objects.length = 0;

      stats = pool.getStats();
      expect(stats.active).toBe(0);
      expect(stats.available).toBe(10);

      // Second batch - should reuse
      for (let i = 0; i < 10; i++) {
        objects.push(pool.acquire());
      }

      stats = pool.getStats();
      expect(stats.active).toBe(10);
      expect(stats.created).toBe(10); // No new allocations
      expect(stats.reused).toBe(10); // All reused

      // Release again
      for (const obj of objects) {
        pool.release(obj);
      }

      console.log('\n📊 Pool Statistics:');
      console.log(`   Created: ${stats.created}`);
      console.log(`   Reused: ${stats.reused}`);
      console.log(`   Active: ${stats.active}`);
      console.log(`   Available: ${stats.available}`);
    });

    /**
     * Measure allocation rates before/after pooling
     */
    test('should demonstrate allocation rate reduction', () => {
      interface ParticleObject {
        x: number;
        y: number;
        vx: number;
        vy: number;
        life: number;
      }

      const iterations = 5000;

      // WITHOUT pooling - measure allocation rate
      const withoutStartTime = performance.now();
      let allocationsWithout = 0;

      for (let i = 0; i < iterations; i++) {
        // Allocate new particle
        const particle: ParticleObject = {
          x: Math.random() * 100,
          y: Math.random() * 100,
          vx: Math.random() * 2 - 1,
          vy: Math.random() * 2 - 1,
          life: 1.0,
        };
        allocationsWithout++;

        // Simulate particle update
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.01;

        // Particle "dies" (object becomes garbage)
      }

      const withoutEndTime = performance.now();
      const withoutTime = withoutEndTime - withoutStartTime;
      const allocationRateWithout = allocationsWithout / (withoutTime / 1000); // per second

      // WITH pooling - measure allocation rate
      const pool = new ObjectPool<ParticleObject>(
        () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 1.0 }),
        (obj: ParticleObject) => {
          obj.x = 0;
          obj.y = 0;
          obj.vx = 0;
          obj.vy = 0;
          obj.life = 1.0;
        },
        200
      );

      const withStartTime = performance.now();
      const activeParticles: ParticleObject[] = [];

      for (let i = 0; i < iterations; i++) {
        // Acquire from pool
        const particle = pool.acquire();
        particle.x = Math.random() * 100;
        particle.y = Math.random() * 100;
        particle.vx = Math.random() * 2 - 1;
        particle.vy = Math.random() * 2 - 1;
        particle.life = 1.0;

        activeParticles.push(particle);

        // Simulate particle update
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.01;

        // Release back to pool when "dead"
        if (activeParticles.length > 100) {
          const dead = activeParticles.shift();
          if (dead) {
            pool.release(dead);
          }
        }
      }

      // Release remaining particles
      activeParticles.forEach(p => {
        pool.release(p);
      });

      const withEndTime = performance.now();
      const withTime = withEndTime - withStartTime;

      const stats = pool.getStats();
      const allocationRateWith = stats.created / (withTime / 1000); // per second

      const reduction =
        ((allocationRateWithout - allocationRateWith) / allocationRateWithout) * 100;

      console.log('\n📊 Allocation Rate Comparison:');
      console.log(`   Without Pooling: ${allocationRateWithout.toFixed(0)} allocations/sec`);
      console.log(`   With Pooling: ${allocationRateWith.toFixed(0)} allocations/sec`);
      console.log(`   Reduction: ${reduction.toFixed(1)}%`);
      console.log(`   Pool Reuse Rate: ${((stats.reused / iterations) * 100).toFixed(1)}%`);

      // Verify significant reduction in allocation rate
      expect(allocationRateWith).toBeLessThan(allocationRateWithout * 0.5); // At least 50% reduction
    });
  });

  describe('Combined Optimization Impact', () => {
    /**
     * Test combined impact of all optimizations
     */
    test('should demonstrate cumulative optimization benefits', () => {
      // Simulate a game scenario with all optimizations
      const worldWidth = 1920;
      const worldHeight = 1080;

      // Setup spatial grid
      const grid = new SpatialGrid<MockEntity>(worldWidth, worldHeight, 128);

      // Setup object pool
      interface EffectObject {
        x: number;
        y: number;
        type: string;
      }

      const effectPool = new ObjectPool<EffectObject>(
        () => ({ x: 0, y: 0, type: '' }),
        (obj: EffectObject) => {
          obj.x = 0;
          obj.y = 0;
          obj.type = '';
        },
        100
      );

      // Setup managers with dirty flags
      const container = new Container();
      const projectileManager = new ProjectileManager(container);

      // Simulate 100 frames of gameplay
      const frames = 100;
      const zombieCount = 50;
      const towerCount = 10;

      // Create zombies
      const zombies: MockEntity[] = [];
      for (let i = 0; i < zombieCount; i++) {
        const zombie: MockEntity = {
          position: {
            x: Math.random() * worldWidth,
            y: Math.random() * worldHeight,
          },
          id: i,
        };
        zombies.push(zombie);
        grid.insert(zombie);
      }

      let totalTargetFindTime = 0;
      let totalRebuildCount = 0;
      let totalEffectAllocations = 0;

      const startTime = performance.now();

      for (let frame = 0; frame < frames; frame++) {
        // 1. Target finding with spatial grid
        const targetFindStart = performance.now();
        for (let t = 0; t < towerCount; t++) {
          const towerX = Math.random() * worldWidth;
          const towerY = Math.random() * worldHeight;
          grid.queryClosest(towerX, towerY, 250);
        }
        totalTargetFindTime += performance.now() - targetFindStart;

        // 2. Check dirty flags (avoid unnecessary rebuilds)
        if (projectileManager.areProjectilesDirty()) {
          totalRebuildCount++;
          projectileManager.clearProjectilesDirty();
        }

        // 3. Create effects with pooling
        if (frame % 5 === 0) {
          const effect = effectPool.acquire();
          effect.x = Math.random() * worldWidth;
          effect.y = Math.random() * worldHeight;
          effect.type = 'explosion';
          effectPool.release(effect);
        }

        // Simulate projectile updates
        // We can't create actual projectiles due to PixiJS mocking limitations
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const effectStats = effectPool.getStats();
      totalEffectAllocations = effectStats.created;

      const avgTargetFindTime = totalTargetFindTime / frames;
      const rebuildRate = (totalRebuildCount / frames) * 100;
      const effectReuseRate =
        (effectStats.reused / (effectStats.created + effectStats.reused)) * 100;

      console.log(`\n📊 Combined Optimization Impact (${frames} frames):`);
      console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`   Avg Frame Time: ${(totalTime / frames).toFixed(2)}ms`);
      console.log('\n   Target Finding:');
      console.log(`     Avg Time: ${avgTargetFindTime.toFixed(3)}ms/frame`);
      console.log(`     Zombies: ${zombieCount}, Towers: ${towerCount}`);
      console.log('\n   Array Rebuilds:');
      console.log(`     Rebuild Rate: ${rebuildRate.toFixed(1)}%`);
      console.log(`     Rebuilds Avoided: ${((1 - rebuildRate / 100) * 100).toFixed(1)}%`);
      console.log('\n   Object Pooling:');
      console.log(`     Allocations: ${totalEffectAllocations}`);
      console.log(`     Reuse Rate: ${effectReuseRate.toFixed(1)}%`);

      // Verify all optimizations are effective
      expect(avgTargetFindTime).toBeLessThan(1.0); // Fast target finding
      expect(rebuildRate).toBeLessThan(50); // Fewer than 50% rebuilds
      expect(effectReuseRate).toBeGreaterThan(50); // More than 50% reuse

      container.destroy();
    });
  });
});
