import { type Container, Graphics } from 'pixi.js';
import { EffectCleanupManager } from '@/utils/EffectCleanupManager';
import type { ITowerRenderer } from './ITowerRenderer';

export type BarrelRenderCallback = (graphics: Graphics, upgradeLevel: number) => void;

/**
 * Base class for tower renderers
 * Provides shared helper methods for all tower renderers
 */
export abstract class BaseTowerRenderer implements ITowerRenderer {
  abstract render(visual: Graphics, barrel: Graphics, type: string, upgradeLevel: number): void;

  abstract renderShootingEffect(barrel: Graphics, type: string, upgradeLevel: number): void;

  /**
   * Attach a pre-built flash graphic to the barrel, apply recoil, and auto-remove after 100ms.
   * Call this at the end of every renderShootingEffect implementation.
   */
  protected applyShootingEffect(barrel: Container, flash: Graphics): void {
    barrel.addChild(flash);
    const originalY = barrel.y;
    barrel.y = 2;
    EffectCleanupManager.registerTimeout(
      setTimeout(() => {
        if (barrel && !barrel.destroyed) {
          barrel.removeChild(flash);
          flash.destroy();
          barrel.y = originalY;
        }
      }, 100)
    );
  }

  /**
   * Helper method to add upgrade stars above the tower
   */
  protected addUpgradeStars(visual: Graphics, upgradeLevel: number): void {
    if (upgradeLevel <= 1) {
      return;
    }

    // One star per upgrade tier. Bold, outlined and set clear of the head so the level reads
    // at normal game zoom (the base art only changes at levels 3 and 5).
    const starCount = Math.min(upgradeLevel - 1, 5);
    const starSize = 5;
    const spacing = 11;
    const startX = (-(starCount - 1) * spacing) / 2;
    const y = -35;

    for (let i = 0; i < starCount; i++) {
      const x = startX + i * spacing;
      const waist = starSize * 0.38;

      visual
        .moveTo(x, y - starSize)
        .lineTo(x + waist, y - waist)
        .lineTo(x + starSize, y)
        .lineTo(x + waist, y + waist)
        .lineTo(x, y + starSize)
        .lineTo(x - waist, y + waist)
        .lineTo(x - starSize, y)
        .lineTo(x - waist, y - waist)
        .lineTo(x, y - starSize)
        .fill(0xffd700)
        .stroke({ width: 1.5, color: 0x4a3500 });
    }
  }

  /**
   * Default destroy implementation
   * Override if renderer has specific cleanup needs
   */
  destroy(): void {
    // Override if renderer has specific cleanup needs
  }

  /**
   * Manage barrel graphics lifecycle: get existing, clear if needed, create if missing.
   * Returns the graphics object ready for rendering. Call this at start of renderBarrel.
   */
  protected manageBarrelGraphics(barrel: Container, label = 'barrelGraphics'): Graphics {
    const existingGraphics = barrel.getChildByLabel?.(label) as Graphics | undefined;
    if (existingGraphics) {
      existingGraphics.clear();
    }
    const graphics = existingGraphics ?? new Graphics();
    graphics.label = label;
    return graphics;
  }

  /**
   * Finalize barrel graphics: add to barrel if new.
   * Call this at end of renderBarrel after all drawing.
   */
  protected finalizeBarrelGraphics(barrel: Container, graphics: Graphics): void {
    if (!barrel.getChildByLabel?.(graphics.label ?? '')) {
      barrel.addChild(graphics);
    }
  }

  /**
   * Render standard tower character body parts shared across many towers.
   * @param graphics - Graphics to draw on
   * @param upgradeLevel - Current upgrade level
   * @param bodyColor - Color for the body (calculated by caller based on upgradeLevel)
   * @param armColor - Color for arms (defaults to skin tone)
   * @param headY - Y position of head (varies by tower)
   */
  protected renderCharacterBase(
    graphics: Graphics,
    _upgradeLevel: number,
    bodyColor: number,
    armColor = 0xffdbac,
    headY = -18
  ): void {
    // Body
    graphics.rect(-3, headY + 5, 6, 8).fill(bodyColor);
    // Arms
    graphics.rect(-4, headY + 7, 2, 4).fill(armColor);
    graphics.rect(2, headY + 7, 2, 4).fill(armColor);
    // Head
    graphics.circle(0, headY, 5).fill(0xffdbac);
    graphics.stroke({ width: 1, color: 0x000000 });
  }

  /**
   * Get color based on upgrade level from a 3-level color progression.
   * @param level1 - Color for levels 1-2
   * @param level3 - Color for levels 3-4
   * @param level5 - Color for level 5
   * @param upgradeLevel - Current upgrade level
   */
  protected getUpgradeColor(
    level1: number,
    level3: number,
    level5: number,
    upgradeLevel: number
  ): number {
    if (upgradeLevel >= 5) return level5;
    if (upgradeLevel >= 3) return level3;
    return level1;
  }

  /**
   * Render standard headgear based on upgrade level.
   * @param graphics - Graphics to draw on
   * @param upgradeLevel - Current upgrade level
   * @param headY - Y position of head
   * @param configs - Configuration for each upgrade tier [level1-2, level3-4, level5]
   */
  protected renderHeadgear(
    graphics: Graphics,
    upgradeLevel: number,
    headY: number,
    configs: Array<{ type: 'cap' | 'helmet' | 'visor'; color: number; details?: number }>
  ): void {
    const tier = upgradeLevel <= 2 ? 0 : upgradeLevel <= 4 ? 1 : 2;
    const config = configs[tier];

    if (!config) return;

    const { type, color, details = 0x1a1a1a } = config;

    if (type === 'cap') {
      graphics.rect(-5, headY - 3, 10, 3).fill(color);
    } else if (type === 'helmet') {
      graphics.circle(0, headY + 2, 5).fill(color);
      if (tier === 2) {
        graphics.rect(-4, headY - 1, 8, 2).fill(details);
      }
    } else if (type === 'visor') {
      graphics.circle(0, headY + 2, 5).fill(color);
      graphics.rect(-4, headY - 1, 8, 3).fill(details);
    }
  }
}
