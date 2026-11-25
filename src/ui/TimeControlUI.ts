import { Container, Graphics, Text } from 'pixi.js';
import { UI_COLORS, UI_FONTS } from '../config/uiTheme';
import {
  type TimeControlManager,
  type TimeControlState,
  TimeSpeed,
} from '../managers/TimeControlManager';
import { TextureGenerator } from '../utils/textureGenerator';
import { MetalUI } from './theme/MetalUI';
import { UIComponent } from './UIComponent';

/**
 * TimeControlUI — apocalyptic command strip for pause / speed.
 */
export class TimeControlUI extends UIComponent {
  private timeControlManager: TimeControlManager;
  private pauseButton!: Container & { bg: Graphics; labelText: Text };
  private slowSpeedButton!: Container & { bg: Graphics; labelText: Text };
  private normalSpeedButton!: Container & { bg: Graphics; labelText: Text };
  private fastSpeedButton!: Container & { bg: Graphics; labelText: Text };
  private veryFastSpeedButton!: Container & { bg: Graphics; labelText: Text };
  private statusText!: Text;
  private buttonSize = 36;
  private buttonSpacing = 6;
  private railPadding = 6;

  constructor(timeControlManager: TimeControlManager) {
    super();
    this.timeControlManager = timeControlManager;
    this.createUI();

    this.timeControlManager.setOnStateChangeCallback(state => {
      this.updateUI(state);
    });
  }

  private createUI(): void {
    const count = 5;
    const railWidth =
      this.railPadding * 2 + count * this.buttonSize + (count - 1) * this.buttonSpacing;
    const railHeight = this.buttonSize + this.railPadding * 2 + 18;

    const rail = new Container();
    const metal = TextureGenerator.createCorrugatedMetal(railWidth, railHeight);
    metal.alpha = 0.95;
    rail.addChild(metal);

    const frame = new Graphics();
    frame.rect(0, 0, railWidth, railHeight).stroke({ width: 2, color: UI_COLORS.METAL_DARK });
    rail.addChild(frame);

    const caution = MetalUI.createCautionStripe(railWidth, 3);
    rail.addChild(caution);

    MetalUI.addCornerRivets(rail, railWidth, railHeight, 3, false);
    this.addChild(rail);

    const y = this.railPadding + 2;
    let x = this.railPadding;

    this.pauseButton = MetalUI.createControlButton('II', this.buttonSize, () => {
      this.timeControlManager.togglePause();
    });
    this.pauseButton.position.set(x, y);
    this.addChild(this.pauseButton);
    x += this.buttonSize + this.buttonSpacing;

    this.slowSpeedButton = MetalUI.createControlButton('.5', this.buttonSize, () => {
      this.timeControlManager.setSpeed(TimeSpeed.SLOW);
    });
    this.slowSpeedButton.position.set(x, y);
    this.addChild(this.slowSpeedButton);
    x += this.buttonSize + this.buttonSpacing;

    this.normalSpeedButton = MetalUI.createControlButton('1x', this.buttonSize, () => {
      this.timeControlManager.setSpeed(TimeSpeed.NORMAL);
    });
    this.normalSpeedButton.position.set(x, y);
    this.addChild(this.normalSpeedButton);
    x += this.buttonSize + this.buttonSpacing;

    this.fastSpeedButton = MetalUI.createControlButton('2x', this.buttonSize, () => {
      this.timeControlManager.setSpeed(TimeSpeed.FAST);
    });
    this.fastSpeedButton.position.set(x, y);
    this.addChild(this.fastSpeedButton);
    x += this.buttonSize + this.buttonSpacing;

    this.veryFastSpeedButton = MetalUI.createControlButton('4x', this.buttonSize, () => {
      this.timeControlManager.setSpeed(TimeSpeed.VERY_FAST);
    });
    this.veryFastSpeedButton.position.set(x, y);
    this.addChild(this.veryFastSpeedButton);

    this.statusText = new Text({
      text: '',
      style: {
        fontSize: 10,
        fill: UI_COLORS.TEXT_DIM,
        fontFamily: UI_FONTS.MONO,
        fontWeight: 'bold',
        letterSpacing: 1,
      },
    });
    this.statusText.position.set(this.railPadding, this.buttonSize + this.railPadding + 4);
    this.addChild(this.statusText);

    this.updateUI(this.timeControlManager.getState());
  }

  private updateUI(state: TimeControlState): void {
    this.updateButtonVisuals(state);
    this.updateStatusText(state);
  }

  private paintButton(
    button: Container & { bg: Graphics; labelText: Text },
    active: boolean,
    activeFill: number = UI_COLORS.BUTTON_ACTIVE,
    activeBorder: number = UI_COLORS.READY
  ): void {
    if (active) {
      MetalUI.paintControlButton(button.bg, this.buttonSize, activeFill, activeBorder);
      button.labelText.style.fill = UI_COLORS.WARNING;
    } else {
      MetalUI.paintControlButton(
        button.bg,
        this.buttonSize,
        UI_COLORS.BUTTON_IDLE,
        UI_COLORS.METAL_LIGHT
      );
      button.labelText.style.fill = UI_COLORS.TEXT;
    }
  }

  private updateButtonVisuals(state: TimeControlState): void {
    if (state.isPaused) {
      MetalUI.paintControlButton(
        this.pauseButton.bg,
        this.buttonSize,
        UI_COLORS.PAUSED,
        UI_COLORS.PAUSED_BORDER
      );
      if (this.pauseButton.labelText.text !== '>') {
        this.pauseButton.labelText.text = '>';
      }
      this.pauseButton.labelText.style.fill = UI_COLORS.WARNING;
    } else {
      MetalUI.paintControlButton(
        this.pauseButton.bg,
        this.buttonSize,
        UI_COLORS.BUTTON_IDLE,
        UI_COLORS.METAL_LIGHT
      );
      if (this.pauseButton.labelText.text !== 'II') {
        this.pauseButton.labelText.text = 'II';
      }
      this.pauseButton.labelText.style.fill = UI_COLORS.TEXT;
    }

    this.paintButton(this.slowSpeedButton, !state.isPaused && state.speed === TimeSpeed.SLOW);
    this.paintButton(this.normalSpeedButton, !state.isPaused && state.speed === TimeSpeed.NORMAL);
    this.paintButton(this.fastSpeedButton, !state.isPaused && state.speed === TimeSpeed.FAST);
    this.paintButton(
      this.veryFastSpeedButton,
      !state.isPaused && state.speed === TimeSpeed.VERY_FAST
    );
  }

  private updateStatusText(state: TimeControlState): void {
    if (state.isPaused) {
      const next = state.isPlacementPause ? 'PAUSED · PLACE' : 'PAUSED';
      if (this.statusText.text !== next) {
        this.statusText.text = next;
      }
      this.statusText.style.fill = UI_COLORS.PAUSED_BORDER;
      return;
    }

    switch (state.speed) {
      case TimeSpeed.SLOW:
        if (this.statusText.text !== '0.5x') {
          this.statusText.text = '0.5x';
        }
        this.statusText.style.fill = UI_COLORS.RANGE;
        break;
      case TimeSpeed.FAST:
        if (this.statusText.text !== '2x') {
          this.statusText.text = '2x';
        }
        this.statusText.style.fill = UI_COLORS.WARNING;
        break;
      case TimeSpeed.VERY_FAST:
        if (this.statusText.text !== '4x') {
          this.statusText.text = '4x';
        }
        this.statusText.style.fill = 0xff6600;
        break;
      default:
        if (this.statusText.text !== '') {
          this.statusText.text = '';
        }
        break;
    }
  }

  public getControlWidth(): number {
    const count = 5;
    return this.railPadding * 2 + count * this.buttonSize + (count - 1) * this.buttonSpacing;
  }

  public getControlHeight(): number {
    return this.buttonSize + this.railPadding * 2 + 18;
  }

  public update(_deltaTime: number): void {
    // Event-driven updates only
  }
}
