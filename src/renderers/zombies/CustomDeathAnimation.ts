import type { Container } from 'pixi.js';
import type { DeathParticleConfig } from './BaseZombieRenderer';
import type { ZombieParticleSystem } from './ZombieParticleSystem';

function emitDeathParticles(
  particles: ZombieParticleSystem,
  configs: DeathParticleConfig['particles']
): void {
  for (const particle of configs) {
    particles.emit(particle.type, 0, 0, {
      count: particle.count,
      velocity: particle.velocity,
      lifetime: particle.lifetime,
      size: particle.size,
    });
  }
}

/**
 * Runs a timed death animation with particle burst and per-frame updates.
 */
export function playParticleDeathAnimation(options: {
  container: Container;
  particles: ZombieParticleSystem;
  deathParticles: DeathParticleConfig['particles'];
  durationMs: number;
  onUpdate: (elapsed: number) => void;
  setFrameId: (id: number | null) => void;
}): Promise<void> {
  emitDeathParticles(options.particles, options.deathParticles);

  return new Promise(resolve => {
    const startTime = Date.now();

    const animate = () => {
      if (options.container.destroyed) {
        options.setFrameId(null);
        resolve();
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= options.durationMs) {
        options.setFrameId(null);
        resolve();
        return;
      }

      options.onUpdate(elapsed);
      options.setFrameId(requestAnimationFrame(animate));
    };

    animate();
  });
}
