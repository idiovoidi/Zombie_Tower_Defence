import { Text } from 'pixi.js';
import { GameConfig } from '../config/gameConfig';
import { UI_COLORS, UI_FONTS, UI_LAYOUT } from '../config/uiTheme';
import { MetalUI } from './theme/MetalUI';
import { UIComponent } from './UIComponent';

export interface VictorySummary {
  score: number;
  wave: number;
  livesRemaining: number;
  /** Display names of levels unlocked by this win. */
  unlockedLevelNames: string[];
}

/** Shown when the final wave of a level is cleared. */
export class VictoryScreen extends UIComponent {
  private scoreText: Text;
  private detailText: Text;
  private unlockText: Text;
  private onLevelSelectCallback: (() => void) | null = null;
  private onMainMenuCallback: (() => void) | null = null;

  constructor() {
    super();

    const { SCREEN_WIDTH: w, SCREEN_HEIGHT: h } = GameConfig;
    const panelW = 480;
    const panelH = 410;

    this.addChild(MetalUI.createOverlay(w, h, 0.75));

    const panel = MetalUI.createMenuPanel({
      screenWidth: w,
      screenHeight: h,
      width: panelW,
      height: panelH,
      offsetY: -10,
      title: 'CAMP SECURED',
      subtitle: 'ALL WAVES CLEARED',
      titleBarY: 22,
      titleColor: UI_COLORS.READY,
    });
    this.addChild(panel);

    const title = MetalUI.createStencilText('VICTORY', {
      fontSize: 42,
      fill: UI_COLORS.READY,
      letterSpacing: 4,
      strokeWidth: 4,
    });
    title.anchor.set(0.5);
    title.position.set(panelW / 2, 115);
    panel.addChild(title);

    this.scoreText = MetalUI.createMonoText('SCORE: 0', 24, UI_COLORS.WARNING);
    this.scoreText.anchor.set(0.5);
    this.scoreText.position.set(panelW / 2, 160);
    panel.addChild(this.scoreText);

    this.detailText = MetalUI.createMonoText('', 14, UI_COLORS.TEXT_DIM);
    this.detailText.anchor.set(0.5);
    this.detailText.position.set(panelW / 2, 192);
    panel.addChild(this.detailText);

    this.unlockText = MetalUI.createMonoText('', 13, UI_COLORS.READY);
    this.unlockText.anchor.set(0.5);
    this.unlockText.position.set(panelW / 2, 222);
    panel.addChild(this.unlockText);

    const levelsButton = MetalUI.createMetalButton({
      label: 'LEVEL SELECT',
      variant: 'ready',
      width: UI_LAYOUT.BUTTON_WIDTH,
      height: UI_LAYOUT.BUTTON_HEIGHT,
      fontSize: 18,
      onClick: () => this.onLevelSelectCallback?.(),
    });
    levelsButton.position.set((panelW - UI_LAYOUT.BUTTON_WIDTH) / 2, 255);
    panel.addChild(levelsButton);

    const menuButton = MetalUI.createMetalButton({
      label: 'MAIN MENU',
      variant: 'neutral',
      width: UI_LAYOUT.BUTTON_WIDTH,
      height: UI_LAYOUT.BUTTON_HEIGHT,
      fontSize: 18,
      onClick: () => this.onMainMenuCallback?.(),
    });
    menuButton.position.set((panelW - UI_LAYOUT.BUTTON_WIDTH) / 2, 320);
    panel.addChild(menuButton);

    const footer = new Text({
      text: 'THE DEAD REST - FOR NOW',
      style: {
        fontFamily: UI_FONTS.BODY,
        fontSize: 9,
        fill: UI_COLORS.TEXT_MUTED,
        letterSpacing: 2,
      },
    });
    footer.anchor.set(0.5);
    footer.position.set(panelW / 2, panelH - 22);
    panel.addChild(footer);

    this.visible = false;
  }

  public update(_deltaTime: number): void {
    // No animations needed
  }

  public showVictory(summary: VictorySummary): void {
    this.scoreText.text = `SCORE: ${summary.score}`;
    this.detailText.text = `WAVE ${summary.wave}  ·  ${summary.livesRemaining} SURVIVORS`;
    this.unlockText.text =
      summary.unlockedLevelNames.length > 0
        ? `NEW SECTOR UNLOCKED: ${summary.unlockedLevelNames.join(', ').toUpperCase()}`
        : '';
    this.visible = true;
  }

  public setLevelSelectCallback(callback: () => void): void {
    this.onLevelSelectCallback = callback;
  }

  public setMainMenuCallback(callback: () => void): void {
    this.onMainMenuCallback = callback;
  }
}
