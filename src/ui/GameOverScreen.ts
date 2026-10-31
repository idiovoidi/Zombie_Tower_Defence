import { Text } from 'pixi.js';
import { GameConfig } from '../config/gameConfig';
import { UI_COLORS, UI_FONTS, UI_LAYOUT } from '../config/uiTheme';
import { MetalUI } from './theme/MetalUI';
import { UIComponent } from './UIComponent';

export class GameOverScreen extends UIComponent {
  private scoreText: Text;
  private onMainMenuCallback: (() => void) | null = null;
  private onRestartCallback: (() => void) | null = null;

  constructor() {
    super();

    const { SCREEN_WIDTH: w, SCREEN_HEIGHT: h } = GameConfig;
    const panelW = 480;
    const panelH = 360;

    this.addChild(MetalUI.createOverlay(w, h, 0.82));

    const panel = MetalUI.createMenuPanel({
      screenWidth: w,
      screenHeight: h,
      width: panelW,
      height: panelH,
      offsetY: -10,
      title: 'SIGNAL LOST',
      subtitle: 'CAMP OVERRUN',
      titleBarY: 22,
    });
    this.addChild(panel);

    const title = MetalUI.createStencilText('GAME OVER', {
      fontSize: 42,
      fill: UI_COLORS.ALERT,
      letterSpacing: 4,
      strokeWidth: 4,
    });
    title.anchor.set(0.5);
    title.position.set(panelW / 2, 115);
    panel.addChild(title);

    this.scoreText = MetalUI.createMonoText('SCORE: 0', 22, UI_COLORS.WARNING);
    this.scoreText.anchor.set(0.5);
    this.scoreText.position.set(panelW / 2, 165);
    panel.addChild(this.scoreText);

    const restartButton = MetalUI.createMetalButton({
      label: 'REDEPLOY',
      variant: 'ready',
      width: UI_LAYOUT.BUTTON_WIDTH,
      height: UI_LAYOUT.BUTTON_HEIGHT,
      fontSize: 18,
      onClick: () => this.onRestartClicked(),
    });
    restartButton.position.set((panelW - UI_LAYOUT.BUTTON_WIDTH) / 2, 210);
    panel.addChild(restartButton);

    const menuButton = MetalUI.createMetalButton({
      label: 'MAIN MENU',
      variant: 'neutral',
      width: UI_LAYOUT.BUTTON_WIDTH,
      height: UI_LAYOUT.BUTTON_HEIGHT,
      fontSize: 18,
      onClick: () => this.onMainMenuClicked(),
    });
    menuButton.position.set((panelW - UI_LAYOUT.BUTTON_WIDTH) / 2, 275);
    panel.addChild(menuButton);

    const footer = new Text({
      text: 'THE DEAD DO NOT REST',
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

  public showGameOver(score: number): void {
    const next = `SCORE: ${score}`;
    if (this.scoreText.text !== next) {
      this.scoreText.text = next;
    }
    this.visible = true;
  }

  private onRestartClicked(): void {
    this.onRestartCallback?.();
  }

  private onMainMenuClicked(): void {
    this.onMainMenuCallback?.();
  }

  public setRestartCallback(callback: () => void): void {
    this.onRestartCallback = callback;
  }

  public setMainMenuCallback(callback: () => void): void {
    this.onMainMenuCallback = callback;
  }
}
