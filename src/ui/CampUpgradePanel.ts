import { Container, Graphics } from 'pixi.js';
import { GameConfig } from '../config/gameConfig';
import { UI_COLORS } from '../config/uiTheme';
import type { CampUpgrade, CampUpgradeManager } from '../managers/CampUpgradeManager';
import { TextureGenerator } from '../utils/textureGenerator';
import { MetalUI } from './theme/MetalUI';
import { UIComponent } from './UIComponent';

const PANEL_WIDTH = 440;
const PANEL_HEIGHT = 470;
const CARD_X = 20;
const CARD_WIDTH = PANEL_WIDTH - CARD_X * 2;
const CARD_HEIGHT = 108;
const CARD_START_Y = 92;
const CARD_STEP = CARD_HEIGHT + 12;
const PIP_SIZE = 12;
const PIP_GAP = 4;

export class CampUpgradePanel extends UIComponent {
  private contentContainer!: Container;
  private campUpgradeManager: CampUpgradeManager | null = null;
  private upgradeCards: Map<string, Container> = new Map();
  private moneyAvailable = 0;
  private onUpgradeCallback: ((upgradeId: string, cost: number) => boolean) | null = null;

  constructor() {
    super();
    this.createPanel();
    this.visible = false; // Hidden by default
  }

  public setCampUpgradeManager(manager: CampUpgradeManager): void {
    this.campUpgradeManager = manager;
    this.updateUpgradeDisplay();
  }

  private createPanel(): void {
    const { SCREEN_WIDTH: w, SCREEN_HEIGHT: h } = GameConfig;

    // Dimmed backdrop: clicking outside the panel closes it
    const backdrop = MetalUI.createOverlay(w, h, 0.72);
    backdrop.eventMode = 'static';
    backdrop.on('pointerdown', event => {
      event.stopPropagation();
      this.hide();
    });
    this.addChild(backdrop);

    this.contentContainer = new Container();
    this.contentContainer.position.set((w - PANEL_WIDTH) / 2, (h - PANEL_HEIGHT) / 2);
    // Swallow clicks on the panel body so they don't fall through to the backdrop
    this.contentContainer.eventMode = 'static';
    this.contentContainer.on('pointerdown', event => event.stopPropagation());

    this.contentContainer.addChild(
      MetalUI.createMetalPanel({
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        cautionTop: true,
        cautionBottom: true,
        rivets: true,
        cache: true,
      })
    );

    const titleBar = MetalUI.createTitleBar(
      PANEL_WIDTH - 40,
      48,
      'CAMP UPGRADES',
      'FORTIFY THE SURVIVORS',
      UI_COLORS.WARNING
    );
    titleBar.position.set(20, 22);
    this.contentContainer.addChild(titleBar);

    const closeButton = MetalUI.createMetalButton({
      label: 'X',
      variant: 'danger',
      width: 38,
      height: 32,
      fontSize: 16,
      onClick: () => this.hide(),
    });
    closeButton.position.set(PANEL_WIDTH - 20 - 8 - 6 - 38, 30);
    this.contentContainer.addChild(closeButton);

    this.addChild(this.contentContainer);
  }

  public setUpgradeCallback(callback: (upgradeId: string, cost: number) => boolean): void {
    this.onUpgradeCallback = callback;
  }

  public setMoneyAvailable(money: number): void {
    if (this.moneyAvailable === money) {
      return;
    }
    this.moneyAvailable = money;
    if (this.visible) {
      this.updateUpgradeDisplay();
    }
  }

  private updateUpgradeDisplay(): void {
    if (!this.campUpgradeManager) {
      return;
    }

    for (const card of this.upgradeCards.values()) {
      this.contentContainer.removeChild(card);
      card.destroy({ children: true });
    }
    this.upgradeCards.clear();

    let y = CARD_START_Y;
    for (const upgrade of this.campUpgradeManager.getAvailableUpgrades()) {
      const card = this.createUpgradeCard(upgrade);
      card.position.set(CARD_X, y);
      this.contentContainer.addChild(card);
      this.upgradeCards.set(upgrade.id, card);
      y += CARD_STEP;
    }
  }

  private createUpgradeCard(upgrade: CampUpgrade): Container {
    const card = new Container();
    const manager = this.campUpgradeManager;
    const canUpgrade = manager ? manager.canUpgrade(upgrade.id) : false;
    const cost = manager ? manager.getUpgradeCost(upgrade.id) : 0;
    const canAfford = this.moneyAvailable >= cost;

    card.addChild(TextureGenerator.createConcrete(CARD_WIDTH, CARD_HEIGHT));

    // Frame colour doubles as status: green = buyable, amber = can't afford yet, grey = maxed
    const frameColor = !canUpgrade
      ? UI_COLORS.METAL_FRAME
      : canAfford
        ? UI_COLORS.READY_DIM
        : UI_COLORS.WARNING;
    const frame = new Graphics();
    frame.rect(0, 0, CARD_WIDTH, CARD_HEIGHT).stroke({ width: 3, color: frameColor });
    card.addChild(frame);
    MetalUI.addCornerRivets(card, CARD_WIDTH, CARD_HEIGHT, 4, false);

    const name = MetalUI.createStencilText(upgrade.name.toUpperCase(), {
      fontSize: 18,
      fill: UI_COLORS.WARNING,
      letterSpacing: 1,
      strokeWidth: 3,
    });
    name.position.set(14, 10);
    card.addChild(name);

    card.addChild(this.createLevelPips(upgrade, CARD_WIDTH - 14, 14));

    const description = MetalUI.createBodyText(
      upgrade.description,
      13,
      UI_COLORS.TEXT_DIM,
      CARD_WIDTH - 28
    );
    description.style.align = 'left';
    description.position.set(14, 38);
    card.addChild(description);

    const buttonWidth = CARD_WIDTH - 28;
    const buttonHeight = 30;
    const button = MetalUI.createMetalButton({
      label: canUpgrade ? `UPGRADE  ·  $${cost}` : 'MAX LEVEL',
      variant: !canUpgrade ? 'neutral' : canAfford ? 'ready' : 'alert',
      width: buttonWidth,
      height: buttonHeight,
      fontSize: 14,
      onClick: canUpgrade && canAfford ? () => this.purchaseUpgrade(upgrade.id) : undefined,
    });
    button.position.set(14, CARD_HEIGHT - buttonHeight - 10);
    if (!canUpgrade || !canAfford) {
      // Inert: no hover/click response, visibly dimmed
      button.eventMode = 'none';
      button.cursor = 'default';
      button.alpha = canUpgrade ? 0.75 : 0.55;
    }
    card.addChild(button);

    return card;
  }

  /** Row of squares, one per upgrade level; filled squares are purchased levels. */
  private createLevelPips(upgrade: CampUpgrade, rightEdge: number, y: number): Graphics {
    const pips = new Graphics();
    const total = upgrade.maxLevel;
    const width = total * PIP_SIZE + (total - 1) * PIP_GAP;
    for (let i = 0; i < total; i++) {
      const x = rightEdge - width + i * (PIP_SIZE + PIP_GAP);
      const filled = i < upgrade.level;
      pips
        .rect(x, y, PIP_SIZE, PIP_SIZE)
        .fill({ color: filled ? UI_COLORS.WARNING : UI_COLORS.METAL_DARK, alpha: filled ? 1 : 0.9 })
        .stroke({ width: 1, color: filled ? 0x8a6d00 : UI_COLORS.METAL_LIGHT });
    }
    return pips;
  }

  private purchaseUpgrade(upgradeId: string): void {
    if (!this.campUpgradeManager || !this.onUpgradeCallback) {
      return;
    }

    const cost = this.campUpgradeManager.getUpgradeCost(upgradeId);
    const success = this.onUpgradeCallback(upgradeId, cost);

    if (success) {
      this.campUpgradeManager.purchaseUpgrade(upgradeId);
      this.updateUpgradeDisplay();
    }
  }

  public override show(): void {
    this.visible = true;
    this.updateUpgradeDisplay();
  }

  public override hide(): void {
    this.visible = false;
  }

  public override update(_deltaTime: number): void {
    // Update logic if needed
  }
}
