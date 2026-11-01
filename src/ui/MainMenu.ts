import { Text } from 'pixi.js';
import { GameConfig } from '../config/gameConfig';
import { UI_COLORS, UI_FONTS, UI_LAYOUT } from '../config/uiTheme';
import { MetalUI } from './theme/MetalUI';
import { UIComponent } from './UIComponent';

export class MainMenu extends UIComponent {
  private onStartCallback: (() => void) | null = null;
  private onMapCreatorCallback: (() => void) | null = null;

  constructor() {
    super();
    this.createMenu();
  }

  private createMenu(): void {
    const { SCREEN_WIDTH: w, SCREEN_HEIGHT: h } = GameConfig;
    const panelW = UI_LAYOUT.MENU_PANEL_WIDTH;
    const panelH = UI_LAYOUT.MENU_PANEL_HEIGHT;

    const overlay = MetalUI.createOverlay(w, h, 0.55);
    this.addChild(overlay);

    const panel = MetalUI.createMenuPanel({
      screenWidth: w,
      screenHeight: h,
      width: panelW,
      height: panelH,
      offsetY: -20,
      title: 'Z-TD',
      subtitle: 'SURVIVOR COMMAND',
      titleBarY: 24,
    });
    this.addChild(panel);

    const headline = MetalUI.createStencilText('ZOMBIE TOWER DEFENSE', {
      fontSize: 28,
      fill: UI_COLORS.WARNING,
      letterSpacing: 2,
      strokeWidth: 3,
    });
    headline.anchor.set(0.5);
    headline.position.set(panelW / 2, 115);
    panel.addChild(headline);

    const tagline = new Text({
      text: 'HOLD THE CAMP. HOLD THE LINE.',
      style: {
        fontFamily: UI_FONTS.MONO,
        fontSize: 13,
        fill: UI_COLORS.TEXT_DIM,
        letterSpacing: 1,
      },
    });
    tagline.anchor.set(0.5);
    tagline.position.set(panelW / 2, 150);
    panel.addChild(tagline);

    const startButton = MetalUI.createMetalButton({
      label: 'DEPLOY',
      variant: 'ready',
      width: UI_LAYOUT.BUTTON_WIDTH,
      height: UI_LAYOUT.BUTTON_HEIGHT,
      fontSize: 20,
      onClick: () => this.onStartClicked(),
    });
    startButton.position.set((panelW - UI_LAYOUT.BUTTON_WIDTH) / 2, 200);
    panel.addChild(startButton);

    const mapButton = MetalUI.createMetalButton({
      label: 'MAP CREATOR',
      variant: 'neutral',
      width: UI_LAYOUT.BUTTON_WIDTH,
      height: UI_LAYOUT.BUTTON_HEIGHT,
      fontSize: 18,
      onClick: () => this.onMapCreatorClicked(),
    });
    mapButton.position.set((panelW - UI_LAYOUT.BUTTON_WIDTH) / 2, 270);
    panel.addChild(mapButton);

    const footer = new Text({
      text: 'AUTHORIZED PERSONNEL ONLY',
      style: {
        fontFamily: UI_FONTS.BODY,
        fontSize: 10,
        fill: UI_COLORS.WARNING,
        fontWeight: 'bold',
        letterSpacing: 2,
      },
    });
    footer.anchor.set(0.5);
    footer.position.set(panelW / 2, panelH - 28);
    panel.addChild(footer);
  }

  public update(_deltaTime: number): void {
    // Main menu is static
  }

  private onStartClicked(): void {
    this.onStartCallback?.();
  }

  private onMapCreatorClicked(): void {
    this.onMapCreatorCallback?.();
  }

  public setStartCallback(callback: () => void): void {
    this.onStartCallback = callback;
  }

  public setMapCreatorCallback(callback: () => void): void {
    this.onMapCreatorCallback = callback;
  }
}
