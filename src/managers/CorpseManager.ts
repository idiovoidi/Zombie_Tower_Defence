import { Container, Graphics } from 'pixi.js';
import { ZombieRendererFactory } from '../renderers/zombies';
import type { ZombieRenderState } from '../renderers/zombies/ZombieRenderer';

interface Corpse {
  id: number;
  container: Container;
  fadeTimer: number;
  maxFadeTime: number;
}

export class CorpseManager {
  private corpses: Corpse[] = [];
  private container: Container;
  private maxCorpses = 50; // Limit to prevent performance issues
  private nextCorpseId = 1;

  constructor(container: Container) {
    this.container = container;
  }

  // Create a corpse at the given position with zombie type styling
  public createCorpse(
    x: number,
    y: number,
    zombieType: string,
    _size = 10,
    killerType?: string,
    _impactAngle?: number
  ): void {
    this.makeRoom();

    // Create a container for the corpse
    const corpseContainer = new Container();
    corpseContainer.position.set(x, y);

    // Choose random death pose
    const deathPose = Math.floor(Math.random() * 3); // 0, 1, or 2

    // Render the zombie in death pose
    this.renderDeadZombie(corpseContainer, zombieType, deathPose, killerType);

    const corpse: Corpse = {
      id: this.nextCorpseId++,
      container: corpseContainer,
      fadeTimer: 0,
      maxFadeTime: 8, // Corpses fade after 8 seconds
    };

    this.corpses.push(corpse);
    this.container.addChild(corpseContainer);
  }

  /** Remove the oldest corpse if at the limit, so we never exceed maxCorpses. */
  private makeRoom(): void {
    if (this.corpses.length >= this.maxCorpses) {
      const oldCorpse = this.corpses.shift();
      if (oldCorpse) {
        this.container.removeChild(oldCorpse.container);
        // Destroy with children: true to ensure all Graphics objects are destroyed
        oldCorpse.container.destroy({ children: true });
      }
    }
  }

  /**
   * Add a corpse that is already drawn (the settled ragdoll: blood pool and body). It keeps the
   * exact pose the zombie died in. Ownership of the graphics passes to the manager.
   */
  public createCorpseFromBody(x: number, y: number, body: Graphics): void {
    this.makeRoom();
    const corpseContainer = new Container();
    corpseContainer.position.set(x, y);
    corpseContainer.addChild(body);
    this.corpses.push({
      id: this.nextCorpseId++,
      container: corpseContainer,
      fadeTimer: 0,
      maxFadeTime: 10,
    });
    this.container.addChild(corpseContainer);
  }

  private renderDeadZombie(
    container: Container,
    zombieType: string,
    deathPose: number,
    killerType?: string
  ): void {
    const renderer = ZombieRendererFactory.create(zombieType);

    // Create a fake render state for the dead zombie
    const deadState: ZombieRenderState = {
      position: { x: 0, y: 0 },
      health: 0,
      maxHealth: 100,
      speed: 0,
      direction: { x: 0, y: 0 },
      isMoving: false,
      isDamaged: true,
      statusEffects: [],
      limbs: { leftArm: true, rightArm: true, leftLeg: true, rightLeg: true },
      isCrawling: false,
    };

    // Render the zombie
    renderer.render(container, deadState);

    // Draw blood pool underneath (before applying rotation)
    const bloodGraphics = new Graphics();
    this.drawBloodPool(bloodGraphics, zombieType, killerType);
    container.addChildAt(bloodGraphics, 0); // Add at bottom layer

    // Apply death pose transformation
    this.applyDeathPose(container, deathPose);

    // Apply killer-specific effects
    this.applyKillerEffects(container, killerType);

    // Remove glow effects (dead eyes don't glow)
    this.removeGlowEffects(container);
  }

  /**
   * Apply visual effects based on what killed the zombie.
   */
  private applyKillerEffects(container: Container, killerType?: string): void {
    if (!killerType) return;

    switch (killerType) {
      case 'Flame': {
        // Charred/burnt tint
        for (const child of container.children) {
          if (child instanceof Graphics) {
            child.tint = 0x444444;
          }
        }
        // Add char marks
        const charGraphics = new Graphics();
        for (let i = 0; i < 5; i++) {
          const cx = (Math.random() - 0.5) * 20;
          const cy = (Math.random() - 0.5) * 20;
          charGraphics.circle(cx, cy, 2 + Math.random() * 3).fill({
            color: 0x111111,
            alpha: 0.5 + Math.random() * 0.3,
          });
        }
        container.addChild(charGraphics);
        break;
      }
      case 'Tesla': {
        // Electrical burn marks
        const sparkGraphics = new Graphics();
        for (let i = 0; i < 3; i++) {
          const sx = (Math.random() - 0.5) * 15;
          const sy = (Math.random() - 0.5) * 15;
          sparkGraphics
            .moveTo(sx, sy)
            .lineTo(sx + (Math.random() - 0.5) * 8, sy + (Math.random() - 0.5) * 8)
            .stroke({ color: 0x00aaaa, width: 1, alpha: 0.4 });
        }
        container.addChild(sparkGraphics);
        break;
      }
      case 'Grenade': {
        // Fragmentation/debris around corpse
        const debrisGraphics = new Graphics();
        for (let i = 0; i < 4; i++) {
          const dx = (Math.random() - 0.5) * 25;
          const dy = (Math.random() - 0.5) * 25;
          debrisGraphics.circle(dx, dy, 1 + Math.random() * 2).fill({
            color: 0x333333,
            alpha: 0.5,
          });
        }
        container.addChild(debrisGraphics);
        break;
      }
    }
  }

  private applyDeathPose(container: Container, pose: number): void {
    // Add slight random variation to each pose
    const randomVariation = (Math.random() - 0.5) * 0.2;

    switch (pose) {
      case 0: // Lying on back
        container.rotation = Math.PI / 2 + randomVariation; // ~90 degrees
        container.scale.y = 0.7; // Flattened
        // Adjust position to compensate for rotation
        // When rotated 90°, the zombie's vertical extent becomes horizontal
        container.position.x += 8; // Shift right by half the zombie's height
        break;
      case 1: // Lying on side
        container.rotation = Math.PI / 2 + 0.3 + randomVariation; // Slightly tilted
        container.scale.y = 0.8;
        container.position.x += 8;
        container.position.y -= 2; // Slight vertical adjustment for tilt
        break;
      case 2: // Face down
        container.rotation = -Math.PI / 2 + randomVariation; // ~-90 degrees
        container.scale.y = 0.6; // More flattened
        // When rotated -90°, shift left
        container.position.x -= 8;
        break;
    }
  }

  private removeGlowEffects(container: Container): void {
    // Recursively dim all graphics to remove glow effects
    for (const child of container.children) {
      if (child instanceof Graphics) {
        // Dim the graphics to remove glow (dead eyes don't glow)
        child.alpha = Math.min(child.alpha, 0.7);
      } else if (child instanceof Container) {
        // Recursively process nested containers
        this.removeGlowEffects(child);
      }
    }
  }

  private drawBloodPool(graphics: Graphics, zombieType: string, killerType?: string): void {
    // Mechanical zombies leak oil instead of blood
    if (zombieType === 'Mechanical') {
      graphics.ellipse(0, 12, 20, 15).fill({ color: 0x1a1a1a, alpha: 0.7 });
      // Oil drips
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 10;
        const x = Math.cos(angle) * dist;
        const y = 12 + Math.sin(angle) * dist;
        graphics.circle(x, y, 3).fill({ color: 0x1a1a1a, alpha: 0.6 });
      }
      return;
    }

    // Flame kills: scorched ground, minimal blood
    if (killerType === 'Flame') {
      // Scorch mark
      graphics.ellipse(0, 12, 14, 10).fill({ color: 0x222222, alpha: 0.5 });
      graphics.ellipse(0, 12, 10, 7).fill({ color: 0x1a1a1a, alpha: 0.6 });
      // Tiny blood traces
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 6;
        graphics
          .circle(Math.cos(angle) * dist, 12 + Math.sin(angle) * dist, 1.5)
          .fill({ color: 0x3a0000, alpha: 0.4 });
      }
      return;
    }

    // Grenade kills: larger, more scattered blood
    const poolSizeMultiplier = killerType === 'Grenade' ? 1.4 : 1.0;
    const poolSize = 15 * poolSizeMultiplier;

    // Outer blood splatter (irregular)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const dist = poolSize * (0.8 + Math.random() * 0.4);
      const x = Math.cos(angle) * dist;
      const y = 12 + Math.sin(angle) * dist;
      const splatterSize = 3 + Math.random() * 4;
      graphics.circle(x, y, splatterSize).fill({ color: 0x6a0000, alpha: 0.7 });
    }

    // Main blood pool (darker center)
    graphics.ellipse(0, 12, poolSize * 0.9, poolSize * 0.7).fill({ color: 0x5a0000, alpha: 0.8 });
    graphics.ellipse(0, 12, poolSize * 0.6, poolSize * 0.5).fill({ color: 0x4a0000, alpha: 0.85 });

    // Blood drips/streaks
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const startDist = poolSize * 0.5;
      const endDist = poolSize * (1.2 + Math.random() * 0.5);
      const startX = Math.cos(angle) * startDist;
      const startY = 12 + Math.sin(angle) * startDist;
      const endX = Math.cos(angle) * endDist;
      const endY = 12 + Math.sin(angle) * endDist;
      graphics
        .moveTo(startX, startY)
        .lineTo(endX, endY)
        .stroke({ width: 2, color: 0x6a0000, alpha: 0.6 });
    }
  }

  // Update corpses (fade out over time)
  public update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const corpse = this.corpses[i];
      corpse.fadeTimer += dt;

      // Start fading after half the max fade time
      if (corpse.fadeTimer > corpse.maxFadeTime / 2) {
        const fadeProgress = (corpse.fadeTimer - corpse.maxFadeTime / 2) / (corpse.maxFadeTime / 2);
        corpse.container.alpha = Math.max(0, 0.9 * (1 - fadeProgress));
      }

      // Remove fully faded corpses
      if (corpse.fadeTimer >= corpse.maxFadeTime) {
        this.container.removeChild(corpse.container);
        corpse.container.destroy({ children: true });
        this.corpses.splice(i, 1);
      }
    }
  }

  // Clear all corpses
  public clear(): void {
    for (const corpse of this.corpses) {
      this.container.removeChild(corpse.container);
      // Destroy with children: true to ensure all Graphics objects are destroyed
      corpse.container.destroy({ children: true });
    }
    this.corpses = [];
  }

  // Set maximum number of corpses
  public setMaxCorpses(max: number): void {
    this.maxCorpses = max;
  }

  // Get corpse statistics for debugging
  public getStats(): {
    currentCount: number;
    maxCount: number;
    oldestAge: number;
    averageAge: number;
  } {
    const currentCount = this.corpses.length;
    const maxCount = this.maxCorpses;

    if (currentCount === 0) {
      return {
        currentCount: 0,
        maxCount,
        oldestAge: 0,
        averageAge: 0,
      };
    }

    const ages = this.corpses.map(c => c.fadeTimer);
    const oldestAge = Math.max(...ages);
    const averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;

    return {
      currentCount,
      maxCount,
      oldestAge,
      averageAge,
    };
  }

  // Get current corpse count
  public getCorpseCount(): number {
    return this.corpses.length;
  }

  // Get maximum corpse limit
  public getMaxCorpses(): number {
    return this.maxCorpses;
  }

  /**
   * Find corpses within radius of a point, closest first.
   */
  public findCorpsesNear(
    x: number,
    y: number,
    radius: number,
    limit: number
  ): Array<{ id: number; x: number; y: number }> {
    const radiusSq = radius * radius;
    const matches: Array<{ id: number; x: number; y: number; distSq: number }> = [];

    for (const corpse of this.corpses) {
      const cx = corpse.container.position.x;
      const cy = corpse.container.position.y;
      const dx = cx - x;
      const dy = cy - y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= radiusSq) {
        matches.push({ id: corpse.id, x: cx, y: cy, distSq });
      }
    }

    matches.sort((a, b) => a.distSq - b.distSq);
    return matches.slice(0, limit).map(({ id, x: cx, y: cy }) => ({ id, x: cx, y: cy }));
  }

  /**
   * Remove and destroy a corpse by id. Returns true if found.
   */
  public consumeCorpse(id: number): boolean {
    const index = this.corpses.findIndex(c => c.id === id);
    if (index < 0) {
      return false;
    }
    const corpse = this.corpses[index];
    this.container.removeChild(corpse.container);
    corpse.container.destroy({ children: true });
    this.corpses.splice(index, 1);
    return true;
  }
}
