import type { ITower } from '../objects/Tower.interface';
import type { ResourceCost, ResourceManager } from './ResourceManager';

/** Catalog for purchase / upgrade prices — typically TowerManager. */
export interface TowerCostCatalog {
  getTowerCost(type: string): number;
  calculateUpgradeCost(type: string, upgradeLevel: number): number;
}

/** Fraction of invested cost refunded on sell. */
const TOWER_SELL_REFUND_RATIO = 0.75;

/**
 * Upgrade eligibility and cost calculations.
 * Spending and tower mutation are owned by EconomyState (single money path).
 */
export class UpgradeManager {
  private resourceManager: ResourceManager;
  private costCatalog: TowerCostCatalog;

  constructor(resourceManager: ResourceManager, costCatalog: TowerCostCatalog) {
    this.resourceManager = resourceManager;
    this.costCatalog = costCatalog;
  }

  /**
   * Whether the tower can be upgraded and the player can afford it.
   */
  public canUpgrade(tower: ITower): boolean {
    if (!tower.canUpgrade()) {
      return false;
    }
    return this.resourceManager.canAfford(this.getUpgradeCost(tower));
  }

  /**
   * Cost to purchase the next upgrade at the tower's current level.
   * Uses the shared TowerManager / towerConstants formula.
   */
  public getUpgradeCost(tower: ITower): ResourceCost {
    return {
      money: this.costCatalog.calculateUpgradeCost(tower.getType(), tower.getUpgradeLevel()),
    };
  }

  /**
   * Total money invested in purchase + all upgrades already applied.
   */
  public getInvestedCost(tower: ITower): number {
    let total = this.costCatalog.getTowerCost(tower.getType());
    const level = tower.getUpgradeLevel();
    for (let i = 1; i < level; i++) {
      total += this.costCatalog.calculateUpgradeCost(tower.getType(), i);
    }
    return total;
  }

  /**
   * Refund value when selling the tower.
   */
  public getSellValue(tower: ITower): number {
    return Math.floor(this.getInvestedCost(tower) * TOWER_SELL_REFUND_RATIO);
  }

  public getResourceManager(): ResourceManager {
    return this.resourceManager;
  }

  public getCostCatalog(): TowerCostCatalog {
    return this.costCatalog;
  }
}
