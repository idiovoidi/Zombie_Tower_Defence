import type { Zombie } from '@objects/Zombie';
import { EffectCleanupManager } from '@utils/EffectCleanupManager';
import { ResourceCleanupManager } from '@utils/ResourceCleanupManager';
import { type Container, Graphics } from 'pixi.js';
import { LIGHTING } from '../../config/lightingConstants';
import { lightingManager } from '../lighting/LightingManager';

/**
 * Fire-and-forget visual effects that own no pooled state: they are drawn once
 * into a throwaway Graphics and removed by a tracked timeout.
 * (Tesla arcs, flame streams, electric particles, damage flashes.)
 */
export class TransientEffects {
  constructor(private readonly container: Container) {}

  /**
   * Spawn a lightning arc (Tesla tower)
   */
  public spawnLightningArc(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    isPrimary = true
  ): void {
    // Cool flash at the strike point lights nearby towers
    const { radius, color, intensity, durationMs } = LIGHTING.ENVIRONMENT.TESLA_ARC;
    lightingManager.addPointLight({ x: endX, y: endY, radius, color, intensity, durationMs });

    const lightningGraphics = new Graphics();
    this.drawLightningBolt(lightningGraphics, startX, startY, endX, endY, isPrimary);
    this.container.addChild(lightningGraphics);

    // Register lightning as persistent effect for immediate cleanup
    ResourceCleanupManager.registerPersistentEffect(lightningGraphics, {
      type: 'tesla_lightning',
      duration: 150,
    });

    // Remove lightning after short duration (tracked to prevent memory leaks)
    const timeout = EffectCleanupManager.registerTimeout(
      setTimeout(() => {
        EffectCleanupManager.clearTimeout(timeout);
        ResourceCleanupManager.unregisterPersistentEffect(lightningGraphics);
        if (lightningGraphics.parent) {
          lightningGraphics.parent.removeChild(lightningGraphics);
        }
        lightningGraphics.destroy({ children: true });
      }, 150)
    );
  }

  /**
   * Draw a lightning bolt between two points
   */
  private drawLightningBolt(
    graphics: Graphics,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    isPrimary: boolean
  ): void {
    // Calculate segments for the arc
    const segments = 8;
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;

      // Add random offset perpendicular to the line (except for start and end)
      if (i > 0 && i < segments) {
        const perpX = -(endY - startY);
        const perpY = endX - startX;
        // Identical endpoints (stacked zombies) give a zero-length line; avoid NaN offsets
        const length = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
        const normalizedPerpX = perpX / length;
        const normalizedPerpY = perpY / length;

        const offset = (Math.random() - 0.5) * (isPrimary ? 20 : 15); // Smaller offset for chain arcs
        points.push({
          x: x + normalizedPerpX * offset,
          y: y + normalizedPerpY * offset,
        });
      } else {
        points.push({ x, y });
      }
    }

    // Draw main lightning bolt (bright cyan for primary, dimmer for chains)
    const mainColor = isPrimary ? 0x00ffff : 0x00ccff;
    const mainWidth = isPrimary ? 3 : 2;
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.stroke({ width: mainWidth, color: mainColor });

    // Draw glow effect (wider, semi-transparent)
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.stroke({ width: mainWidth * 2, color: mainColor, alpha: 0.5 });

    // Draw outer glow (even wider, more transparent)
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.stroke({ width: mainWidth * 3, color: 0xffffff, alpha: 0.3 });

    // Add bright flash at start and end points
    const flashSize = isPrimary ? 8 : 6;
    graphics.circle(startX, startY, flashSize).fill({ color: 0xffffff, alpha: 0.8 });
    graphics.circle(startX, startY, flashSize * 1.5).fill({ color: 0x00ffff, alpha: 0.5 });
    graphics.circle(endX, endY, flashSize).fill({ color: 0xffffff, alpha: 0.8 });
    graphics.circle(endX, endY, flashSize * 1.5).fill({ color: 0x00ffff, alpha: 0.5 });

    // Add branching arcs (smaller side bolts) - only for primary arc
    if (isPrimary) {
      for (let i = 2; i < points.length - 2; i += 2) {
        if (Math.random() > 0.5) {
          const branchLength = 15 + Math.random() * 20;
          const angle = Math.random() * Math.PI * 2;
          const branchEndX = points[i].x + Math.cos(angle) * branchLength;
          const branchEndY = points[i].y + Math.sin(angle) * branchLength;

          graphics.moveTo(points[i].x, points[i].y);
          graphics.lineTo(branchEndX, branchEndY);
          graphics.stroke({ width: 2, color: mainColor, alpha: 0.7 });
        }
      }
    }
  }

  /**
   * Spawn a flame stream (Flame tower)
   */
  public spawnFlameStream(startX: number, startY: number, endX: number, endY: number): void {
    const flameGraphics = new Graphics();
    this.container.addChild(flameGraphics);

    // Calculate distance and angle
    const dx = endX - startX;
    const dy = endY - startY;
    // Guard zero length (target on top of the nozzle) so the cone offsets never become NaN
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;

    // Create smooth cone-shaped flame stream
    const segments = 12;
    const maxWidth = 25; // Maximum width of flame cone

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const baseX = startX + dx * t;
      const baseY = startY + dy * t;

      // Cone width increases with distance
      const coneWidth = t * maxWidth;

      // Create multiple particles at this segment for density
      const particlesPerSegment = 3 + Math.floor(t * 4);

      for (let j = 0; j < particlesPerSegment; j++) {
        // Random position within cone width
        const perpX = -dy / distance;
        const perpY = dx / distance;
        const offset = (Math.random() - 0.5) * coneWidth;

        const x = baseX + perpX * offset;
        const y = baseY + perpY * offset;

        // Particle size increases then decreases
        const sizeProgress = Math.sin(t * Math.PI); // 0 to 1 to 0
        const size = 4 + sizeProgress * 8 + Math.random() * 3;

        // Smooth color gradient from white-hot to red
        let color: number;
        let alpha: number;

        if (t < 0.2) {
          color = 0xffffff;
          alpha = 0.95;
        } else if (t < 0.4) {
          color = 0xffff00;
          alpha = 0.9;
        } else if (t < 0.6) {
          color = 0xffa500;
          alpha = 0.85;
        } else if (t < 0.8) {
          color = 0xff8c00;
          alpha = 0.75;
        } else {
          color = 0xff4500;
          alpha = 0.65;
        }

        flameGraphics.circle(x, y, size * 1.8).fill({ color: 0xff6600, alpha: alpha * 0.25 });
        flameGraphics.circle(x, y, size * 1.3).fill({ color: 0xff8800, alpha: alpha * 0.4 });
        flameGraphics.circle(x, y, size).fill({ color, alpha });
      }
    }

    // Add wispy smoke at the end
    for (let i = 0; i < 8; i++) {
      const smokeT = 0.85 + i * 0.02;
      const smokeX = startX + dx * smokeT + (Math.random() - 0.5) * 30;
      const smokeY = startY + dy * smokeT + (Math.random() - 0.5) * 30;
      const smokeSize = 8 + Math.random() * 8;
      flameGraphics
        .circle(smokeX, smokeY, smokeSize)
        .fill({ color: 0x3a3a3a, alpha: 0.3 + Math.random() * 0.2 });
    }

    // Bright nozzle flash
    flameGraphics.circle(startX, startY, 8).fill({ color: 0xffffff, alpha: 0.95 });
    flameGraphics.circle(startX, startY, 12).fill({ color: 0xffff00, alpha: 0.6 });
    flameGraphics.circle(startX, startY, 16).fill({ color: 0xffa500, alpha: 0.3 });

    ResourceCleanupManager.registerPersistentEffect(flameGraphics, {
      type: 'flame_stream',
      duration: 120,
    });

    const timeout = EffectCleanupManager.registerTimeout(
      setTimeout(() => {
        EffectCleanupManager.clearTimeout(timeout);
        ResourceCleanupManager.unregisterPersistentEffect(flameGraphics);
        if (flameGraphics.parent) {
          flameGraphics.parent.removeChild(flameGraphics);
        }
        flameGraphics.destroy({ children: true });
      }, 120)
    );
  }

  /**
   * Spawn electric particle effects on a zombie
   */
  public spawnElectricParticles(zombie: Zombie, isPrimary: boolean): void {
    if (!zombie.parent) {
      return;
    }

    const particleContainer = new Graphics();
    zombie.addChild(particleContainer);

    ResourceCleanupManager.registerPersistentEffect(particleContainer, {
      type: 'tesla_particles',
      duration: isPrimary ? 250 : 180,
    });

    const particleCount = isPrimary ? 12 : 8;
    const particleSize = isPrimary ? 3 : 2;
    const spreadRadius = isPrimary ? 20 : 15;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = Math.random() * spreadRadius;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      particleContainer.circle(x, y, particleSize).fill({ color: 0x00ffff, alpha: 0.9 });
      particleContainer.circle(x, y, particleSize * 2).fill({ color: 0xffffff, alpha: 0.5 });
    }

    const ringRadius = isPrimary ? 18 : 14;
    particleContainer.circle(0, 0, ringRadius).stroke({ width: 2, color: 0x00ffff, alpha: 0.8 });
    particleContainer
      .circle(0, 0, ringRadius + 3)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.4 });

    const arcCount = isPrimary ? 6 : 4;
    for (let i = 0; i < arcCount; i++) {
      const angle = (i / arcCount) * Math.PI * 2 + Math.random() * 0.5;
      const length = 10 + Math.random() * 15;
      const startX = Math.cos(angle) * 8;
      const startY = Math.sin(angle) * 8;
      const endX = startX + Math.cos(angle) * length;
      const endY = startY + Math.sin(angle) * length;

      const segments = 3;
      particleContainer.moveTo(startX, startY);
      for (let j = 1; j <= segments; j++) {
        const t = j / segments;
        const midX = startX + (endX - startX) * t;
        const midY = startY + (endY - startY) * t;
        const offset = (Math.random() - 0.5) * 8;
        const perpX = -(endY - startY);
        const perpY = endX - startX;
        const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
        const normalizedPerpX = perpX / perpLength;
        const normalizedPerpY = perpY / perpLength;

        particleContainer.lineTo(midX + normalizedPerpX * offset, midY + normalizedPerpY * offset);
      }
      particleContainer.stroke({ width: 1.5, color: 0x00ffff, alpha: 0.8 });
    }

    // Tint zombie
    const visual = zombie.getRendererGraphics();
    if (visual) {
      const originalTint = visual.tint;
      visual.tint = 0x00ffff;

      const tintDuration = isPrimary ? 300 : 200;
      EffectCleanupManager.registerTimeout(
        setTimeout(() => {
          if (visual && !visual.destroyed) {
            visual.tint = originalTint;
          }
        }, tintDuration)
      );
    }

    const duration = isPrimary ? 250 : 180;
    EffectCleanupManager.registerTimeout(
      setTimeout(() => {
        ResourceCleanupManager.unregisterPersistentEffect(particleContainer);
        if (particleContainer.parent) {
          particleContainer.parent.removeChild(particleContainer);
        }
        particleContainer.destroy();
      }, duration)
    );
  }

  /**
   * Spawn a damage flash on a target container
   */
  public spawnDamageFlash(target: Container, radius = 30): void {
    const damageFlash = new Graphics();
    damageFlash.circle(0, 0, radius).fill({ color: 0xff0000, alpha: 0.5 });
    target.addChild(damageFlash);

    ResourceCleanupManager.registerPersistentEffect(damageFlash, {
      type: 'damage_flash',
      duration: 100,
    });

    const timeout = EffectCleanupManager.registerTimeout(
      setTimeout(() => {
        EffectCleanupManager.clearTimeout(timeout);
        ResourceCleanupManager.unregisterPersistentEffect(damageFlash);
        if (damageFlash && !damageFlash.destroyed) {
          if (damageFlash.parent) {
            damageFlash.parent.removeChild(damageFlash);
          }
          damageFlash.destroy({ children: true });
        }
      }, 100)
    );
  }
}
