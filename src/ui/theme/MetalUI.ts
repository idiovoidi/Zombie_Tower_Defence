import { Container, Graphics, Text, type TextStyleOptions } from 'pixi.js';
import { UI_COLORS, UI_FONTS, UI_LAYOUT } from '../../config/uiTheme';
import { TextureGenerator } from '../../utils/textureGenerator';

export type MetalButtonVariant = 'ready' | 'alert' | 'neutral' | 'danger';

export interface MetalButtonOptions {
  width?: number;
  height?: number;
  label: string;
  variant?: MetalButtonVariant;
  fontSize?: number;
  onClick?: () => void;
}

export interface MetalPanelOptions {
  width: number;
  height: number;
  inset?: number;
  rivets?: boolean;
  cautionTop?: boolean;
  cautionBottom?: boolean;
  cache?: boolean;
}

const VARIANT_COLORS: Record<
  MetalButtonVariant,
  { frame: number; hover: number; text: number; glow: number }
> = {
  ready: {
    frame: UI_COLORS.READY_DIM,
    hover: UI_COLORS.READY,
    text: UI_COLORS.READY,
    glow: UI_COLORS.READY,
  },
  alert: {
    frame: UI_COLORS.ALERT,
    hover: UI_COLORS.WARNING,
    text: UI_COLORS.ALERT,
    glow: UI_COLORS.ALERT,
  },
  neutral: {
    frame: 0x4488aa,
    hover: UI_COLORS.RANGE,
    text: UI_COLORS.TEXT,
    glow: UI_COLORS.RANGE,
  },
  danger: {
    frame: UI_COLORS.DANGER,
    hover: UI_COLORS.ALERT,
    text: UI_COLORS.LIVES,
    glow: UI_COLORS.ALERT,
  },
};

export class MetalUI {
  static createRivet(radius = UI_LAYOUT.RIVET_RADIUS): Graphics {
    const rivet = new Graphics();
    rivet.circle(0, 0, radius).fill(UI_COLORS.RIVET);
    rivet.circle(0, 0, radius - 1).fill(UI_COLORS.RIVET_MID);
    rivet.circle(-1, -1, Math.max(1, radius - 2)).fill(UI_COLORS.RIVET_HIGHLIGHT);
    return rivet;
  }

  static addCornerRivets(
    parent: Container,
    width: number,
    height: number,
    inset = 3,
    includeMidpoints = false
  ): void {
    const positions: Array<[number, number]> = [
      [inset, inset],
      [width - inset, inset],
      [inset, height - inset],
      [width - inset, height - inset],
    ];

    if (includeMidpoints) {
      positions.push(
        [width / 2, inset],
        [width / 2, height - inset],
        [inset, height / 2],
        [width - inset, height / 2]
      );
    }

    for (const [x, y] of positions) {
      const rivet = MetalUI.createRivet();
      rivet.position.set(x, y);
      parent.addChild(rivet);
    }
  }

  static createCautionStripe(width: number, height = 5): Container {
    const stripe = new Container();
    const base = new Graphics();
    base.rect(0, 0, width, height).fill(UI_COLORS.WARNING);
    stripe.addChild(base);

    for (let x = -10; x < width; x += 20) {
      const band = new Graphics();
      band.rect(x, 0, 10, height).fill(UI_COLORS.METAL_DARK);
      stripe.addChild(band);
    }

    return stripe;
  }

  /**
   * Corrugated outer + rusty inner metal panel with optional rivets and caution edges.
   */
  static createMetalPanel(options: MetalPanelOptions): Container {
    const { width, height, inset = 10, rivets = true, cautionTop = false, cautionBottom = false } =
      options;
    const panel = new Container();
    panel.cullableChildren = false;

    const metalBg = TextureGenerator.createCorrugatedMetal(width, height);
    panel.addChild(metalBg);

    const innerW = Math.max(1, width - inset * 2);
    const innerH = Math.max(1, height - inset * 2);
    const innerBg = TextureGenerator.createRustyMetal(innerW, innerH);
    innerBg.position.set(inset, inset);
    panel.addChild(innerBg);

    const frame = new Graphics();
    frame.rect(0, 0, width, height).stroke({ width: 3, color: UI_COLORS.METAL_DARK });
    panel.addChild(frame);

    if (rivets) {
      MetalUI.addCornerRivets(panel, width, height, 3, true);
    }

    if (cautionTop) {
      const top = MetalUI.createCautionStripe(width, 5);
      panel.addChild(top);
    }

    if (cautionBottom) {
      const bottom = MetalUI.createCautionStripe(width, 5);
      bottom.position.set(0, height - 5);
      panel.addChild(bottom);
    }

    if (options.cache !== false) {
      panel.cacheAsTexture(true);
    }

    return panel;
  }

  /**
   * Centered riveted caution panel with a title bar already attached.
   * Used by full-screen modal menus (main menu, game over, ...).
   */
  static createMenuPanel(options: {
    screenWidth: number;
    screenHeight: number;
    width: number;
    height: number;
    /** Vertical nudge from true center (negative = up). */
    offsetY: number;
    title: string;
    subtitle: string;
    titleBarY: number;
    titleColor?: number;
  }): Container {
    const panel = new Container();
    panel.position.set(
      (options.screenWidth - options.width) / 2,
      (options.screenHeight - options.height) / 2 + options.offsetY
    );

    panel.addChild(
      MetalUI.createMetalPanel({
        width: options.width,
        height: options.height,
        cautionTop: true,
        cautionBottom: true,
        rivets: true,
      })
    );

    const titleBar = MetalUI.createTitleBar(
      options.width - 40,
      48,
      options.title,
      options.subtitle,
      options.titleColor ?? UI_COLORS.ALERT
    );
    titleBar.position.set(20, options.titleBarY);
    panel.addChild(titleBar);
    return panel;
  }

  static createTitleBar(
    width: number,
    height: number,
    title: string,
    subtitle?: string,
    titleColor: number = UI_COLORS.ALERT
  ): Container {
    const bar = new Container();

    const bg = new Graphics();
    bg.rect(0, 0, width, height).fill(UI_COLORS.METAL_MID);
    bg.rect(0, 0, width, height).stroke({ width: 2, color: UI_COLORS.METAL_DARK });
    bar.addChild(bg);

    const cautionLeft = new Graphics();
    cautionLeft.rect(0, 0, 8, height).fill(UI_COLORS.WARNING);
    bar.addChild(cautionLeft);

    const cautionRight = new Graphics();
    cautionRight.rect(width - 8, 0, 8, height).fill(UI_COLORS.WARNING);
    bar.addChild(cautionRight);

    const titleText = new Text({
      text: title,
      style: {
        fontFamily: UI_FONTS.HEADER,
        fontSize: subtitle ? 22 : 26,
        fill: titleColor,
        stroke: { color: 0x000000, width: 3 },
        fontWeight: 'bold',
        letterSpacing: 2,
      },
    });
    titleText.anchor.set(0.5, 0.5);
    titleText.position.set(width / 2, subtitle ? height * 0.38 : height / 2);
    bar.addChild(titleText);

    if (subtitle) {
      const sub = new Text({
        text: subtitle,
        style: {
          fontFamily: UI_FONTS.BODY,
          fontSize: 9,
          fill: UI_COLORS.TEXT_DIM,
          fontWeight: 'bold',
          letterSpacing: 1,
        },
      });
      sub.anchor.set(0.5, 0.5);
      sub.position.set(width / 2, height * 0.72);
      bar.addChild(sub);
    }

    return bar;
  }

  static createStencilText(
    text: string,
    options: {
      fontSize?: number;
      fill?: number;
      letterSpacing?: number;
      strokeWidth?: number;
    } = {}
  ): Text {
    return new Text({
      text,
      style: {
        fontFamily: UI_FONTS.HEADER,
        fontSize: options.fontSize ?? 36,
        fill: options.fill ?? UI_COLORS.ALERT,
        stroke: { color: 0x000000, width: options.strokeWidth ?? 4 },
        fontWeight: 'bold',
        letterSpacing: options.letterSpacing ?? 3,
        align: 'center',
      },
    });
  }

  static createMonoText(text: string, fontSize = 16, fill: number = UI_COLORS.TEXT): Text {
    return new Text({
      text,
      style: {
        fontFamily: UI_FONTS.MONO,
        fontSize,
        fill,
        fontWeight: 'bold',
      } as TextStyleOptions,
    });
  }

  static createBodyText(
    text: string,
    fontSize = 14,
    fill: number = UI_COLORS.TEXT_DIM,
    wordWrapWidth?: number
  ): Text {
    return new Text({
      text,
      style: {
        fontFamily: UI_FONTS.BODY,
        fontSize,
        fill,
        wordWrap: wordWrapWidth !== undefined,
        wordWrapWidth,
        align: 'center',
      },
    });
  }

  static createOverlay(width: number, height: number, alpha = 0.75): Graphics {
    const overlay = new Graphics();
    overlay.rect(0, 0, width, height).fill({ color: UI_COLORS.OVERLAY, alpha });
    return overlay;
  }

  /**
   * Concrete plate button with metal frame, caution wash, and hover glow.
   * Label Text is stored as `button.labelText` for later updates.
   */
  static createMetalButton(options: MetalButtonOptions): Container & { labelText: Text; frame: Graphics } {
    const width = options.width ?? UI_LAYOUT.BUTTON_WIDTH;
    const height = options.height ?? UI_LAYOUT.BUTTON_HEIGHT;
    const variant = options.variant ?? 'ready';
    const colors = VARIANT_COLORS[variant];

    const button = new Container() as Container & { labelText: Text; frame: Graphics };
    button.eventMode = 'static';
    button.cursor = 'pointer';

    const concrete = TextureGenerator.createConcrete(width, height);
    concrete.alpha = 0.85;
    button.addChild(concrete);

    for (let x = 0; x < width; x += 20) {
      const stripe = new Graphics();
      stripe.rect(x, 0, 10, height).fill({ color: UI_COLORS.WARNING, alpha: 0.08 });
      button.addChild(stripe);
    }

    const frame = new Graphics();
    frame.rect(0, 0, width, height).stroke({ width: 3, color: colors.frame });
    button.addChild(frame);
    button.frame = frame;

    const inner = new Graphics();
    inner.rect(3, 3, width - 6, height - 6).stroke({ width: 1, color: colors.glow });
    inner.alpha = 0.45;
    button.addChild(inner);

    MetalUI.addCornerRivets(button, width, height, 5, false);

    const labelText = new Text({
      text: options.label,
      style: {
        fontFamily: UI_FONTS.HEADER,
        fontSize: options.fontSize ?? 18,
        fill: colors.text,
        stroke: { color: 0x000000, width: 3 },
        fontWeight: 'bold',
        letterSpacing: 2,
      },
    });
    labelText.anchor.set(0.5);
    labelText.position.set(width / 2, height / 2);
    button.addChild(labelText);
    button.labelText = labelText;

    const led = new Graphics();
    led.circle(width - 12, 12, 3).fill(colors.glow);
    led.alpha = 0.55;
    button.addChild(led);

    button.on('pointerover', () => {
      frame.clear();
      frame.rect(0, 0, width, height).stroke({ width: 4, color: colors.hover });
      labelText.style.fill = UI_COLORS.HOVER;
      concrete.alpha = 1;
      led.alpha = 1;
    });

    button.on('pointerout', () => {
      frame.clear();
      frame.rect(0, 0, width, height).stroke({ width: 3, color: colors.frame });
      labelText.style.fill = colors.text;
      concrete.alpha = 0.85;
      led.alpha = 0.55;
    });

    if (options.onClick) {
      button.on('pointerdown', event => {
        event.stopPropagation();
        options.onClick?.();
      });
    }

    return button;
  }

  /**
   * Compact metal control button (time controls, icon buttons).
   */
  static createControlButton(
    label: string,
    size: number,
    onClick: () => void
  ): Container & { bg: Graphics; labelText: Text } {
    const button = new Container() as Container & { bg: Graphics; labelText: Text };
    button.eventMode = 'static';
    button.cursor = 'pointer';

    const bg = new Graphics();
    bg.rect(0, 0, size, size).fill(UI_COLORS.BUTTON_IDLE);
    bg.rect(0, 0, size, size).stroke({ width: 2, color: UI_COLORS.METAL_LIGHT });
    button.addChild(bg);
    button.bg = bg;

    const labelText = new Text({
      text: label,
      style: {
        fontFamily: UI_FONTS.HEADER,
        fontSize: size > 32 ? 14 : 12,
        fill: UI_COLORS.TEXT,
        fontWeight: 'bold',
        letterSpacing: 1,
      },
    });
    labelText.anchor.set(0.5);
    labelText.position.set(size / 2, size / 2);
    button.addChild(labelText);
    button.labelText = labelText;

    button.on('pointerdown', event => {
      event.stopPropagation();
      onClick();
    });

    return button;
  }

  static paintControlButton(
    bg: Graphics,
    size: number,
    fill: number,
    border: number
  ): void {
    bg.clear();
    bg.rect(0, 0, size, size).fill(fill);
    bg.rect(0, 0, size, size).stroke({ width: 2, color: border });
  }

  /**
   * Level / selection card with concrete face and metal frame.
   */
  static createSelectCard(
    width: number,
    height: number,
    title: string,
    subtitle: string,
    accent: number,
    onClick: () => void
  ): Container {
    const card = new Container();
    card.eventMode = 'static';
    card.cursor = 'pointer';

    const concrete = TextureGenerator.createConcrete(width, height);
    concrete.alpha = 0.88;
    card.addChild(concrete);

    const frame = new Graphics();
    frame.rect(0, 0, width, height).stroke({ width: 2, color: UI_COLORS.METAL_MID });
    card.addChild(frame);

    const accentBar = new Graphics();
    accentBar.rect(0, 0, 6, height).fill(accent);
    card.addChild(accentBar);

    const inner = new Graphics();
    inner.rect(10, 8, width - 18, height - 16).fill({ color: UI_COLORS.METAL_PANEL, alpha: 0.65 });
    card.addChild(inner);

    const titleText = new Text({
      text: title.toUpperCase(),
      style: {
        fontFamily: UI_FONTS.HEADER,
        fontSize: 15,
        fill: UI_COLORS.WARNING,
        stroke: { color: 0x000000, width: 2 },
        fontWeight: 'bold',
        letterSpacing: 1,
      },
    });
    titleText.anchor.set(0.5, 0.5);
    titleText.position.set(width / 2 + 2, height * 0.38);
    card.addChild(titleText);

    const subText = new Text({
      text: subtitle,
      style: {
        fontFamily: UI_FONTS.MONO,
        fontSize: 11,
        fill: UI_COLORS.TEXT_DIM,
      },
    });
    subText.anchor.set(0.5, 0.5);
    subText.position.set(width / 2 + 2, height * 0.68);
    card.addChild(subText);

    MetalUI.addCornerRivets(card, width, height, 4, false);

    card.on('pointerover', () => {
      frame.clear();
      frame.rect(0, 0, width, height).stroke({ width: 3, color: UI_COLORS.WARNING });
      concrete.alpha = 1;
    });

    card.on('pointerout', () => {
      frame.clear();
      frame.rect(0, 0, width, height).stroke({ width: 2, color: UI_COLORS.METAL_MID });
      concrete.alpha = 0.88;
    });

    card.on('pointerdown', event => {
      event.stopPropagation();
      onClick();
    });

    return card;
  }
}
