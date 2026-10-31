import { Container, Text } from 'pixi.js';
import { GameConfig } from '../config/gameConfig';
import { UI_COLORS, UI_FONTS, UI_LAYOUT } from '../config/uiTheme';
import type { LevelData } from '../managers/LevelManager';
import { describeCampaignLevel, type LevelProgressInfo } from './levelCardInfo';
import { MetalUI } from './theme/MetalUI';
import { UIComponent } from './UIComponent';

export class LevelSelectMenu extends UIComponent {
  private levelCards: Container[] = [];
  private cardsLayer: Container;
  private sectionLabel: Text;
  private onLevelSelectCallback: ((levelId: string) => void) | null = null;
  private onBackCallback: (() => void) | null = null;

  constructor() {
    super();

    const { SCREEN_WIDTH: w, SCREEN_HEIGHT: h } = GameConfig;

    this.addChild(MetalUI.createOverlay(w, h, 0.5));

    const header = MetalUI.createTitleBar(
      Math.min(720, w - 80),
      52,
      'SELECT DEPLOYMENT',
      'CHOOSE YOUR BATTLEFIELD',
      UI_COLORS.WARNING
    );
    header.position.set((w - Math.min(720, w - 80)) / 2, 28);
    this.addChild(header);

    this.sectionLabel = new Text({
      text: 'CAMPAIGN SECTORS',
      style: {
        fontFamily: UI_FONTS.MONO,
        fontSize: 12,
        fill: UI_COLORS.TEXT_MUTED,
        letterSpacing: 2,
      },
    });
    this.sectionLabel.anchor.set(0.5, 0);
    this.sectionLabel.position.set(w / 2, 100);
    this.addChild(this.sectionLabel);

    this.cardsLayer = new Container();
    this.addChild(this.cardsLayer);

    const backButton = MetalUI.createMetalButton({
      label: 'BACK',
      variant: 'danger',
      width: 160,
      height: 44,
      fontSize: 16,
      onClick: () => this.onBackClicked(),
    });
    backButton.position.set(40, h - 70);
    this.addChild(backButton);

    const footer = new Text({
      text: 'SURVIVAL DEPENDS ON YOUR CHOICE',
      style: {
        fontFamily: UI_FONTS.BODY,
        fontSize: 10,
        fill: UI_COLORS.WARNING,
        fontWeight: 'bold',
        letterSpacing: 1,
      },
    });
    footer.anchor.set(1, 0.5);
    footer.position.set(w - 40, h - 48);
    this.addChild(footer);
  }

  public updateLevels(levels: LevelData[], progress?: LevelProgressInfo): void {
    for (const card of this.levelCards) {
      card.destroy({ children: true });
    }
    this.levelCards = [];
    this.cardsLayer.removeChildren();

    const campaign = levels.filter(l => !l.id.startsWith('custom_'));
    const custom = levels.filter(l => l.id.startsWith('custom_'));

    const hasCustom = custom.length > 0;
    this.sectionLabel.text = hasCustom
      ? 'CAMPAIGN SECTORS  ·  CUSTOM OPS'
      : 'CAMPAIGN SECTORS';

    campaign.forEach((level, index) => {
      this.createLevelCard(level, index, false, progress);
    });

    custom.forEach((level, index) => {
      this.createLevelCard(level, campaign.length + index, true, progress);
    });
  }

  private createLevelCard(
    level: LevelData,
    index: number,
    isCustom: boolean,
    progress?: LevelProgressInfo
  ): void {
    const cardW = UI_LAYOUT.LEVEL_CARD_WIDTH;
    const cardH = UI_LAYOUT.LEVEL_CARD_HEIGHT;
    const cols = 4;
    const gapX = 24;
    const gapY = 20;
    const gridWidth = cols * cardW + (cols - 1) * gapX;
    const startX = (GameConfig.SCREEN_WIDTH - gridWidth) / 2;
    const startY = 130;

    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    const accent = isCustom ? UI_COLORS.RANGE : UI_COLORS.READY_DIM;
    const subtitle = isCustom
      ? `${level.difficulty} · CUSTOM`
      : describeCampaignLevel(level, progress);

    const locked = progress?.isUnlocked ? !progress.isUnlocked(level.id) : false;
    const card = MetalUI.createSelectCard(
      cardW,
      cardH,
      level.name,
      subtitle,
      locked ? UI_COLORS.TEXT_MUTED : accent,
      () => {
        if (!locked) {
          this.onLevelSelected(level.id);
        }
      }
    );
    if (locked) {
      card.alpha = 0.45;
      card.cursor = 'not-allowed';
    }
    card.position.set(x, y);
    this.cardsLayer.addChild(card);
    this.levelCards.push(card);
  }

  public update(_deltaTime: number): void {
    // Level select is static
  }

  private onLevelSelected(levelId: string): void {
    this.onLevelSelectCallback?.(levelId);
  }

  private onBackClicked(): void {
    this.onBackCallback?.();
  }

  public setLevelSelectCallback(callback: (levelId: string) => void): void {
    this.onLevelSelectCallback = callback;
  }

  public setBackCallback(callback: () => void): void {
    this.onBackCallback = callback;
  }
}
