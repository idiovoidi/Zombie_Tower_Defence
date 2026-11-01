import { type Container, Graphics } from 'pixi.js';
import { BaseTowerRenderer } from './BaseTowerRenderer';

export class SludgeRenderer extends BaseTowerRenderer {
  public render(visual: Graphics, barrel: Container, _type: string, upgradeLevel: number): void {
    visual.clear();
    const towerSize = 18 + upgradeLevel * 2;

    // Render base structure based on upgrade level
    if (upgradeLevel <= 2) {
      this.renderMakeshiftBase(visual, towerSize);
    } else if (upgradeLevel <= 4) {
      this.renderIndustrialBase(visual, towerSize);
    } else {
      this.renderMilitaryBase(visual, towerSize);
    }

    // Add upgrade stars
    this.addUpgradeStars(visual, upgradeLevel);

    // Render barrel/character
    this.renderBarrel(barrel, upgradeLevel);
  }

  private renderMakeshiftBase(visual: Graphics, towerSize: number): void {
    // Level 1-2: Makeshift toxic barrel platform
    visual.rect(-towerSize, -5, towerSize * 2, 25).fill(0x3b2f4a); // Toxic violet
    visual.stroke({ width: 2, color: 0x2a2038 });
    // Toxic barrels
    visual.rect(-10, 0, 8, 12).fill(0x228b22);
    visual.rect(2, 0, 8, 12).fill(0x228b22);
    // Barrel bands
    visual.rect(-10, 3, 8, 2).fill(0x1a6b1a);
    visual.rect(2, 3, 8, 2).fill(0x1a6b1a);
    // Toxic symbols
    visual.circle(-6, 6, 2).fill({ color: 0x00ff00, alpha: 0.7 });
    visual.circle(6, 6, 2).fill({ color: 0x00ff00, alpha: 0.7 });
    // Drips
    visual.circle(-6, 13, 1.5).fill({ color: 0x32cd32, alpha: 0.6 });
    visual.circle(6, 13, 1.5).fill({ color: 0x32cd32, alpha: 0.6 });
  }

  private renderIndustrialBase(visual: Graphics, towerSize: number): void {
    // Level 3-4: Industrial toxic storage
    visual.rect(-towerSize, -5, towerSize * 2, 25).fill(0x2f2540); // Dark violet
    visual.stroke({ width: 2, color: 0x1f1830 });
    // Reinforced tanks
    visual.circle(-6, 5, 8).fill(0x228b22);
    visual.circle(6, 5, 8).fill(0x228b22);
    // Hazard stripes
    for (let i = 0; i < 3; i++) {
      const x = -towerSize + 5 + i * 12;
      visual.rect(x, -3, 4, 23).fill({ color: 0xffff00, alpha: 0.4 });
    }
    // Biohazard symbols
    visual.circle(-6, 5, 4).fill({ color: 0x00ff00, alpha: 0.8 });
    visual.circle(6, 5, 4).fill({ color: 0x00ff00, alpha: 0.8 });
    // Toxic glow
    visual.circle(-6, 5, 6).fill({ color: 0x32cd32, alpha: 0.3 });
    visual.circle(6, 5, 6).fill({ color: 0x32cd32, alpha: 0.3 });
  }

  private renderMilitaryBase(visual: Graphics, towerSize: number): void {
    // Level 5: Military hazmat facility
    visual.rect(-towerSize, -5, towerSize * 2, 25).fill(0x241a38); // Hazmat violet
    visual.stroke({ width: 3, color: 0x150f26 });
    // Armored containment
    visual.circle(-6, 5, 9).fill(0x1a6b1a);
    visual.circle(6, 5, 9).fill(0x1a6b1a);
    // Heavy hazard markings
    visual.rect(-towerSize, -5, 6, 25).fill({ color: 0xffff00, alpha: 0.5 });
    visual.rect(towerSize - 6, -5, 6, 25).fill({ color: 0xffff00, alpha: 0.5 });
    // Biohazard warning
    visual.circle(0, 5, 8).fill({ color: 0x00ff00, alpha: 0.6 });
    visual.circle(0, 5, 5).fill({ color: 0x32cd32, alpha: 0.8 });
    // Toxic glow effect
    visual.circle(-6, 5, 10).fill({ color: 0x32cd32, alpha: 0.2 });
    visual.circle(6, 5, 10).fill({ color: 0x32cd32, alpha: 0.2 });
  }

  private renderBarrel(barrel: Container, upgradeLevel: number): void {
    const graphics = this.manageBarrelGraphics(barrel);
    const headY = -18;

    // Body - hazmat suit improves
    const suitColor = this.getUpgradeColor(0x654321, 0xffff00, 0x32cd32, upgradeLevel);
    const armColor = upgradeLevel >= 3 ? suitColor : 0xffdbac;
    this.renderCharacterBase(graphics, upgradeLevel, suitColor, armColor, headY);

    // Sludge launcher - barrel style
    const barrelSize = 3 + upgradeLevel * 0.4;
    graphics.rect(-barrelSize / 2, -10, barrelSize, 10).fill(0x228b22);
    graphics.rect(-barrelSize / 2 - 1, -11, barrelSize + 2, 2).fill(0x1a6b1a);

    // Toxic drip
    graphics.circle(0, 1, 1.5).fill({ color: 0x32cd32, alpha: 0.7 });

    // Protective gear
    this.renderHeadgear(graphics, upgradeLevel, headY, [
      { type: 'visor', color: 0x4a4a4a, details: 0x1a1a1a },
      { type: 'helmet', color: 0xffff00, details: 0x1a1a1a },
      { type: 'helmet', color: 0x32cd32, details: 0x00ff00 },
    ]);
    if (upgradeLevel >= 5) {
      graphics.circle(-3, headY - 2, 1).fill(0x00ff00); // Indicator lights
      graphics.circle(3, headY - 2, 1).fill(0x00ff00);
    }

    this.finalizeBarrelGraphics(barrel, graphics);
  }

  public renderShootingEffect(barrel: Container, _type: string, _upgradeLevel: number): void {
    const flash = new Graphics();

    // Sludge launcher - toxic splash
    const sludgeTip = -8;
    // Toxic green splash
    flash.circle(0, sludgeTip, 4).fill({ color: 0x32cd32, alpha: 0.9 });
    flash.circle(0, sludgeTip, 6).fill({ color: 0x00ff00, alpha: 0.7 });
    flash.circle(0, sludgeTip, 9).fill({ color: 0x228b22, alpha: 0.5 });
    // Toxic drips
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const dist = 5 + Math.random() * 3;
      const dropX = Math.cos(angle) * dist;
      const dropY = sludgeTip + Math.sin(angle) * dist;
      flash.circle(dropX, dropY, 1.5).fill({ color: 0x32cd32, alpha: 0.8 });
    }

    barrel.addChild(flash);
    this.applyShootingEffect(barrel, flash);
  }
}
