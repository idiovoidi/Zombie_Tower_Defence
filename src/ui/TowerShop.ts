import { Container, Graphics, Text } from 'pixi.js';
import { GameConfig } from '../config/gameConfig';
import { UI_DIMENSIONS } from '../config/visualConstants';
import { TowerManager } from '../managers/TowerManager';
import { TextureGenerator } from '../utils/textureGenerator';
import { UIComponent } from './UIComponent';

// Extended Container type for tower shop buttons
interface TowerButton extends Container {
  bgGraphics: Graphics;
  frame: Graphics;
  led: Graphics;
  costText: Text;
}

export class TowerShop extends UIComponent {
  private towerButtons: Map<string, TowerButton> = new Map();
  private selectedTowerType: string | null = null;
  private towerManager: TowerManager;
  private onTowerSelectCallback: ((type: string) => void) | null = null;
  private lastAffordabilityMoney: number | null = null;

  constructor(towerManager: TowerManager = TowerManager.getInstance()) {
    super();
    this.towerManager = towerManager;
    this.createShopUI();
  }

  public setTowerManager(towerManager: TowerManager): void {
    this.towerManager = towerManager;
  }

  private createShopUI(): void {
    const shopWidth = 220;
    const shopHeight = GameConfig.SCREEN_HEIGHT;

    this.addSideRail(GameConfig.SCREEN_HEIGHT - GameConfig.UI_BOTTOM_BAR_HEIGHT);

    // Main panel background - corrugated metal
    const metalBg = TextureGenerator.createCorrugatedMetal(shopWidth, shopHeight);
    this.addChild(metalBg);

    // Inner panel - rusty metal plate
    const innerBg = TextureGenerator.createRustyMetal(shopWidth - 20, shopHeight - 20);
    innerBg.position.set(10, 10);
    this.addChild(innerBg);

    // Riveted border frame
    const frame = new Graphics();
    frame.rect(0, 0, shopWidth, shopHeight).stroke({ width: 3, color: 0x2a2a2a });
    this.addChild(frame);

    // Corner rivets
    this.addRivets(frame, shopWidth, shopHeight);

    // Title bar - weathered metal
    const titleBg = new Graphics();
    titleBg.rect(10, 10, shopWidth - 20, 40).fill(0x3a3a3a);
    titleBg.rect(10, 10, shopWidth - 20, 40).stroke({ width: 2, color: 0x1a1a1a });
    this.addChild(titleBg);

    // Caution stripes on title bar edges
    const cautionLeft = new Graphics();
    cautionLeft.rect(10, 10, 8, 40).fill(0xffcc00);
    this.addChild(cautionLeft);
    const cautionRight = new Graphics();
    cautionRight.rect(shopWidth - 18, 10, 8, 40).fill(0xffcc00);
    this.addChild(cautionRight);

    // Title text with apocalyptic styling
    const title = new Text({
      text: 'ARMORY',
      style: {
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 22,
        fill: 0xff3333,
        stroke: { color: 0x000000, width: 3 },
        fontWeight: 'bold',
        letterSpacing: 2,
      },
    });
    title.anchor.set(0.5, 0.5);
    title.position.set(shopWidth / 2, 25);
    this.addChild(title);

    // Subtitle
    const subtitle = new Text({
      text: 'DEFENSE SYSTEMS',
      style: {
        fontFamily: 'Arial',
        fontSize: 9,
        fill: 0xcccccc,
        fontWeight: 'bold',
        letterSpacing: 1,
      },
    });
    subtitle.anchor.set(0.5, 0.5);
    subtitle.position.set(shopWidth / 2, 42);
    this.addChild(subtitle);

    // Create tower buttons
    const towerTypes = this.towerManager.getTowerTypes();
    let yPos = 65;

    for (const type of towerTypes) {
      const button = this.createTowerButton(type, yPos);
      this.towerButtons.set(type, button);
      this.addChild(button);
      yPos += 88;
    }

    // Bottom warning label
    const warning = new Text({
      text: 'AUTHORIZED PERSONNEL ONLY',
      style: {
        fontFamily: 'Arial',
        fontSize: 8,
        fill: 0xffcc00,
        fontWeight: 'bold',
      },
    });
    warning.anchor.set(0.5, 0.5);
    warning.position.set(shopWidth / 2, shopHeight - 15);
    this.addChild(warning);
  }

  /**
   * Metal rail filling the gap between the playfield (1024px) and the shop column,
   * so the map is framed instead of ending in a black strip. Drawn left of the shop.
   */
  private addSideRail(height: number): void {
    const railWidth =
      GameConfig.SCREEN_WIDTH - GameConfig.UI_SHOP_WIDTH - UI_DIMENSIONS.PLAY_AREA_WIDTH;
    if (railWidth <= 0) {
      return;
    }

    const rail = new Container();
    rail.position.set(-railWidth, 0);

    rail.addChild(TextureGenerator.createCorrugatedMetal(railWidth, height));

    const edge = new Graphics();
    // Dark inner shadow where the rail meets the map, hazard dashes along it
    edge.rect(0, 0, 3, height).fill({ color: 0x000000, alpha: 0.55 });
    for (let y = 0; y < height; y += 24) {
      edge.rect(3, y, 5, 12).fill({ color: 0xffcc00, alpha: 0.85 });
      edge.rect(3, y + 12, 5, 12).fill({ color: 0x1a1a1a, alpha: 0.9 });
    }
    edge.rect(0, 0, railWidth, height).stroke({ width: 2, color: 0x2a2a2a });
    rail.addChild(edge);

    for (let y = 40; y < height - 20; y += 96) {
      const rivet = new Graphics();
      rivet.circle(0, 0, 4).fill(0x5a5a5a);
      rivet.circle(0, 0, 3).fill(0x6a6a6a);
      rivet.circle(-1, -1, 2).fill(0x8a8a8a);
      rivet.position.set(railWidth / 2 + 3, y);
      rail.addChild(rivet);
    }

    this.addChild(rail);
  }

  private addRivets(_container: Container, width: number, height: number): void {
    const rivetPositions = [
      [3, 3],
      [width - 3, 3],
      [3, height - 3],
      [width - 3, height - 3],
      [width / 2, 3],
      [width / 2, height - 3],
      [3, height / 2],
      [width - 3, height / 2],
    ];

    rivetPositions.forEach(([x, y]) => {
      const rivet = new Graphics();
      rivet.circle(0, 0, 4).fill(0x5a5a5a);
      rivet.circle(0, 0, 3).fill(0x6a6a6a);
      rivet.circle(-1, -1, 2).fill(0x8a8a8a);
      rivet.position.set(x, y);
      this.addChild(rivet);
    });
  }

  private createTowerButton(type: string, yPos: number): TowerButton {
    const button = new Container() as TowerButton;
    button.position.set(8, yPos);
    button.eventMode = 'static';
    button.cursor = 'pointer';

    const stats = this.towerManager.getTowerStats(type);
    if (!stats) {
      return button;
    }

    // Button background - concrete texture
    const concreteBg = TextureGenerator.createConcrete(184, 82);
    concreteBg.alpha = 0.8;
    button.addChild(concreteBg);

    // Metal frame
    const frame = new Graphics();
    frame.rect(0, 0, 184, 82).stroke({ width: 2, color: 0x3a3a3a });
    button.addChild(frame);

    // Inner border
    const innerBorder = new Graphics();
    innerBorder.rect(2, 2, 180, 78).stroke({ width: 1, color: 0x5a5a5a });
    button.addChild(innerBorder);

    // Icon background plate - riveted metal
    const iconPlate = new Graphics();
    iconPlate.rect(6, 6, 50, 70).fill(0x4a4a4a);
    iconPlate.rect(6, 6, 50, 70).stroke({ width: 1, color: 0x2a2a2a });
    button.addChild(iconPlate);

    // Icon plate rivets
    [
      [8, 8],
      [54, 8],
      [8, 74],
      [54, 74],
    ].forEach(([x, y]) => {
      const rivet = new Graphics();
      rivet.circle(x, y, 2).fill(0x6a6a6a);
      button.addChild(rivet);
    });

    // Tower icon
    const icon = this.createTowerIcon(type);
    icon.position.set(31, 41);
    button.addChild(icon);

    // Info panel background
    const infoBg = new Graphics();
    infoBg.rect(60, 6, 118, 70).fill({ color: 0x2a2a2a, alpha: 0.7 });
    button.addChild(infoBg);

    // Tower name with stencil font style
    const name = new Text({
      text: this.getTowerDisplayName(type).toUpperCase(),
      style: {
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 13,
        fill: 0xffcc00,
        stroke: { color: 0x000000, width: 2 },
        fontWeight: 'bold',
        letterSpacing: 1,
      },
    });
    name.position.set(65, 10);
    button.addChild(name);

    // Cost display with dollar sign
    const costLabel = new Text({
      text: 'COST:',
      style: {
        fontFamily: 'Arial',
        fontSize: 9,
        fill: 0x888888,
        fontWeight: 'bold',
      },
    });
    costLabel.position.set(65, 30);
    button.addChild(costLabel);

    const cost = new Text({
      text: `$${stats.cost}`,
      style: {
        fontFamily: 'Courier New, monospace',
        fontSize: 14,
        fill: 0x00ff00,
        fontWeight: 'bold',
      },
    });
    cost.position.set(100, 27);
    button.addChild(cost);

    // Stats display
    const dmgLabel = new Text({
      text: `DMG: ${stats.damage}`,
      style: {
        fontFamily: 'Courier New, monospace',
        fontSize: 10,
        fill: 0xff6666,
      },
    });
    dmgLabel.position.set(65, 48);
    button.addChild(dmgLabel);

    const rngLabel = new Text({
      text: `RNG: ${stats.range}`,
      style: {
        fontFamily: 'Courier New, monospace',
        fontSize: 10,
        fill: 0x66ccff,
      },
    });
    rngLabel.position.set(65, 62);
    button.addChild(rngLabel);

    // Hotkey indicator (dynamically imported to avoid circular dependencies)
    import('../config/hotkeyConfig').then(({ getHotkeyForTowerType, formatHotkey }) => {
      const hotkey = getHotkeyForTowerType(type);
      if (hotkey) {
        // Hotkey background badge
        const hotkeyBg = new Graphics();
        hotkeyBg.roundRect(140, 48, 32, 24, 4).fill({ color: 0x1a1a1a, alpha: 0.9 });
        hotkeyBg.roundRect(140, 48, 32, 24, 4).stroke({ width: 1, color: 0xffcc00 });
        button.addChild(hotkeyBg);

        // Hotkey text
        const hotkeyText = new Text({
          text: formatHotkey(hotkey.key),
          style: {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 0xffcc00,
            fontWeight: 'bold',
          },
        });
        hotkeyText.anchor.set(0.5, 0.5);
        hotkeyText.position.set(156, 60);
        button.addChild(hotkeyText);
      }
    });

    // Status indicator LED
    const led = new Graphics();
    led.circle(170, 15, 4).fill(0x00ff00);
    led.circle(170, 15, 3).fill(0x00ff00);
    led.alpha = 0.5;
    button.addChild(led);

    // Store references for hover effects and affordability updates
    (button as TowerButton).bgGraphics = concreteBg;
    (button as TowerButton).frame = frame;
    (button as TowerButton).led = led;
    (button as TowerButton).costText = cost;

    // Hover effects
    button.on('pointerover', () => {
      frame.clear();
      frame.rect(0, 0, 184, 82).stroke({ width: 3, color: 0xffcc00 });
      led.alpha = 1.0;
      concreteBg.alpha = 1.0;
    });

    button.on('pointerout', () => {
      if (this.selectedTowerType !== type) {
        frame.clear();
        frame.rect(0, 0, 184, 82).stroke({ width: 2, color: 0x3a3a3a });
        led.alpha = 0.5;
        concreteBg.alpha = 0.8;
      }
    });

    button.on('pointerdown', event => {
      event.stopPropagation();
      this.selectTower(type);
    });

    return button;
  }

  private createTowerIcon(type: string): Graphics {
    const icon = new Graphics();
    const scale = 0.5; // Scale down to fit in icon plate

    switch (type) {
      case GameConfig.TOWER_TYPES.MACHINE_GUN: {
        // Level 1 Machine Gun - Wooden barricade
        const mgBaseSize = 15;
        icon
          .rect(-mgBaseSize * scale, -5 * scale, mgBaseSize * 2 * scale, 25 * scale)
          .fill(0x8b7355);
        icon.stroke({ width: 1, color: 0x654321 });
        // Wood planks
        for (let i = -mgBaseSize; i < mgBaseSize; i += 6) {
          icon
            .moveTo(i * scale, -5 * scale)
            .lineTo(i * scale, 20 * scale)
            .stroke({ width: 1, color: 0x654321, alpha: 0.3 });
        }
        // Sandbags
        icon.roundRect(-12 * scale, 12 * scale, 10 * scale, 6 * scale, 2 * scale).fill(0x8b7355);
        icon.roundRect(2 * scale, 12 * scale, 10 * scale, 6 * scale, 2 * scale).fill(0x8b7355);
        // Little man
        icon.rect(-3 * scale, -13 * scale, 6 * scale, 8 * scale).fill(0x654321);
        icon.rect(-4 * scale, -11 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(2 * scale, -11 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(-1 * scale, -10 * scale, 2 * scale, 8 * scale).fill(0x2f4f4f);
        icon.circle(0, -18 * scale, 5 * scale).fill(0xffdbac);
        icon.rect(-5 * scale, -21 * scale, 10 * scale, 2 * scale).fill(0x8b0000); // Bandana
        break;
      }

      case GameConfig.TOWER_TYPES.SNIPER: {
        // Level 1 Sniper - Wooden platform
        const sniperHeight = 30;
        icon.rect(-12 * scale, -10 * scale, 24 * scale, sniperHeight * scale).fill(0x8b7355);
        icon.stroke({ width: 1, color: 0x654321 });
        // Wood planks
        for (let y = -10; y < sniperHeight - 10; y += 5) {
          icon
            .moveTo(-12 * scale, y * scale)
            .lineTo(12 * scale, y * scale)
            .stroke({ width: 1, color: 0x654321, alpha: 0.3 });
        }
        // Wooden roof
        icon
          .moveTo(-12 * scale, -10 * scale)
          .lineTo(0, -18 * scale)
          .lineTo(12 * scale, -10 * scale)
          .fill(0x654321);
        // Window
        icon.rect(-6 * scale, -5 * scale, 12 * scale, 6 * scale).fill(0x4a4a4a);
        // Little man
        icon.rect(-3 * scale, -15 * scale, 6 * scale, 8 * scale).fill(0x654321);
        icon.rect(-4 * scale, -13 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(2 * scale, -13 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(-1 * scale, -12 * scale, 2 * scale, 12 * scale).fill(0x1a1a1a);
        icon.circle(0, -20 * scale, 5 * scale).fill(0xffdbac);
        icon.circle(0, -23 * scale, 6 * scale).fill(0x654321); // Boonie hat
        break;
      }

      case GameConfig.TOWER_TYPES.SHOTGUN: {
        // Level 1 Shotgun - Sandbag wall
        const shotgunWidth = 36;
        icon
          .roundRect(
            (-shotgunWidth / 2) * scale,
            -8 * scale,
            shotgunWidth * scale,
            28 * scale,
            8 * scale
          )
          .fill(0x8b7355);
        icon.stroke({ width: 1, color: 0x654321 });
        // Sandbag texture
        for (let x = -shotgunWidth / 2 + 5; x < shotgunWidth / 2; x += 8) {
          icon
            .roundRect(x * scale, -5 * scale, 7 * scale, 10 * scale, 2 * scale)
            .fill({ color: 0x654321, alpha: 0.3 });
          icon
            .roundRect(x * scale, 5 * scale, 7 * scale, 10 * scale, 2 * scale)
            .fill({ color: 0x654321, alpha: 0.3 });
        }
        // Firing gap
        icon.rect(-8 * scale, 0, 16 * scale, 6 * scale).fill(0x4a4a4a);
        // Little man
        icon.rect(-3 * scale, -11 * scale, 6 * scale, 8 * scale).fill(0x654321);
        icon.rect(-4 * scale, -9 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(2 * scale, -9 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(-3 * scale, -8 * scale, 2 * scale, 8 * scale).fill(0xa0522d);
        icon.rect(1 * scale, -8 * scale, 2 * scale, 8 * scale).fill(0xa0522d);
        icon.circle(0, -16 * scale, 5 * scale).fill(0xffdbac);
        icon.rect(-5 * scale, -19 * scale, 10 * scale, 3 * scale).fill(0x654321); // Cap
        break;
      }

      case GameConfig.TOWER_TYPES.FLAME: {
        // Level 1 Flame - Barrel platform
        const flameSize = 18;
        icon.circle(0, 5 * scale, flameSize * scale).fill(0x8b4513);
        icon.stroke({ width: 1, color: 0x654321 });
        // Oil barrels
        icon.rect(-8 * scale, -5 * scale, 6 * scale, 12 * scale).fill(0x4a4a4a);
        icon.rect(2 * scale, -5 * scale, 6 * scale, 12 * scale).fill(0x4a4a4a);
        // Barrel bands
        icon.rect(-8 * scale, -2 * scale, 6 * scale, 2 * scale).fill(0x5a5a5a);
        icon.rect(2 * scale, -2 * scale, 6 * scale, 2 * scale).fill(0x5a5a5a);
        // Warning paint
        icon.circle(-5 * scale, 0, 3 * scale).fill({ color: 0xff4500, alpha: 0.7 });
        icon.circle(5 * scale, 0, 3 * scale).fill({ color: 0xff4500, alpha: 0.7 });
        // Little man
        icon.rect(-3 * scale, -13 * scale, 6 * scale, 8 * scale).fill(0x654321);
        icon.rect(-4 * scale, -11 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(2 * scale, -11 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(-1.5 * scale, -10 * scale, 3 * scale, 8 * scale).fill(0xff0000);
        icon.rect(-1 * scale, -11 * scale, 2 * scale, 6 * scale).fill(0x8b0000);
        icon.circle(0, -18 * scale, 5 * scale).fill(0xffdbac);
        icon.rect(-4 * scale, -19 * scale, 8 * scale, 2 * scale).fill(0x1a1a1a); // Goggles
        break;
      }

      case GameConfig.TOWER_TYPES.TESLA: {
        // Level 1 Tesla - Scavenged tech
        const teslaWidth = 32;
        icon
          .rect((-teslaWidth / 2) * scale, -5 * scale, teslaWidth * scale, 25 * scale)
          .fill(0x5a5a5a);
        icon.stroke({ width: 1, color: 0x3a3a3a });
        // Exposed wiring
        icon
          .moveTo((-teslaWidth / 2) * scale + 5 * scale, 0)
          .lineTo((teslaWidth / 2) * scale - 5 * scale, 0)
          .stroke({ width: 1, color: 0x00ced1 });
        icon
          .moveTo((-teslaWidth / 2) * scale + 5 * scale, 10 * scale)
          .lineTo((teslaWidth / 2) * scale - 5 * scale, 10 * scale)
          .stroke({ width: 1, color: 0x00ced1 });
        // Makeshift panels
        icon.rect(-12 * scale, 2 * scale, 8 * scale, 6 * scale).fill(0x4a4a4a);
        icon.rect(4 * scale, 2 * scale, 8 * scale, 6 * scale).fill(0x4a4a4a);
        // Basic indicators
        icon.circle(-8 * scale, 5 * scale, 2 * scale).fill(0x00ffff);
        icon.circle(8 * scale, 5 * scale, 2 * scale).fill(0x00ffff);
        // Little man
        icon.rect(-3 * scale, -13 * scale, 6 * scale, 8 * scale).fill(0x4a4a4a);
        icon.rect(-4 * scale, -11 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(2 * scale, -11 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.circle(0, -10 * scale, 3 * scale).fill(0x7fffd4);
        icon.rect(-2 * scale, -10 * scale, 4 * scale, 7 * scale).fill(0x00bfff);
        icon.circle(0, -18 * scale, 5 * scale).fill(0xffdbac);
        icon.rect(-4 * scale, -19 * scale, 8 * scale, 2 * scale).fill(0x4a4a4a); // Goggles
        break;
      }

      case GameConfig.TOWER_TYPES.GRENADE: {
        // Level 1 Grenade - Makeshift launcher
        const grenadeWidth = 20;
        icon
          .rect(-grenadeWidth * scale, -5 * scale, grenadeWidth * 2 * scale, 25 * scale)
          .fill(0x6b8e23);
        icon.stroke({ width: 1, color: 0x556b2f });
        // Ammo crates
        icon.rect(-12 * scale, 2 * scale, 10 * scale, 8 * scale).fill(0x8b7355);
        icon.rect(2 * scale, 2 * scale, 10 * scale, 8 * scale).fill(0x8b7355);
        // Grenade symbols
        icon.circle(-7 * scale, 6 * scale, 2 * scale).fill(0x2f4f2f);
        icon.circle(7 * scale, 6 * scale, 2 * scale).fill(0x2f4f2f);
        // Little man
        icon.rect(-3 * scale, -13 * scale, 6 * scale, 8 * scale).fill(0x6b8e23);
        icon.rect(-4 * scale, -11 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(2 * scale, -11 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(-2 * scale, -10 * scale, 4 * scale, 8 * scale).fill(0x556b2f);
        icon.circle(0, -18 * scale, 5 * scale).fill(0xffdbac);
        icon.rect(-5 * scale, -21 * scale, 10 * scale, 3 * scale).fill(0x6b8e23); // Helmet
        break;
      }

      case GameConfig.TOWER_TYPES.SLUDGE: {
        // Level 1 Sludge - Toxic barrel platform
        const sludgeWidth = 18;
        icon
          .rect(-sludgeWidth * scale, -5 * scale, sludgeWidth * 2 * scale, 25 * scale)
          .fill(0x3b2f4a);
        icon.stroke({ width: 1, color: 0x2a2038 });
        // Toxic barrels
        icon.rect(-10 * scale, 0 * scale, 8 * scale, 12 * scale).fill(0x228b22);
        icon.rect(2 * scale, 0 * scale, 8 * scale, 12 * scale).fill(0x228b22);
        // Toxic symbols
        icon.circle(-6 * scale, 6 * scale, 2 * scale).fill({ color: 0x00ff00, alpha: 0.7 });
        icon.circle(6 * scale, 6 * scale, 2 * scale).fill({ color: 0x00ff00, alpha: 0.7 });
        // Little man with gas mask
        icon.rect(-3 * scale, -13 * scale, 6 * scale, 8 * scale).fill(0x654321);
        icon.rect(-4 * scale, -11 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(2 * scale, -11 * scale, 2 * scale, 4 * scale).fill(0xffdbac);
        icon.rect(-2 * scale, -10 * scale, 4 * scale, 10 * scale).fill(0x228b22);
        icon.circle(0, -18 * scale, 5 * scale).fill(0xffdbac);
        icon.circle(0, -18 * scale, 4 * scale).fill(0x4a4a4a); // Gas mask
        break;
      }
    }

    return icon;
  }

  private getTowerDisplayName(type: string): string {
    switch (type) {
      case GameConfig.TOWER_TYPES.MACHINE_GUN:
        return 'Machine Gun';
      case GameConfig.TOWER_TYPES.SNIPER:
        return 'Sniper';
      case GameConfig.TOWER_TYPES.SHOTGUN:
        return 'Shotgun';
      case GameConfig.TOWER_TYPES.FLAME:
        return 'Flame';
      case GameConfig.TOWER_TYPES.TESLA:
        return 'Tesla';
      case GameConfig.TOWER_TYPES.GRENADE:
        return 'Grenade';
      case GameConfig.TOWER_TYPES.SLUDGE:
        return 'Sludge';
      default:
        return type;
    }
  }

  public setTowerSelectCallback(callback: (type: string) => void): void {
    this.onTowerSelectCallback = callback;
  }

  public getSelectedTowerType(): string | null {
    return this.selectedTowerType;
  }

  public clearSelection(): void {
    if (this.selectedTowerType) {
      const button = this.towerButtons.get(this.selectedTowerType);
      if (button) {
        const frame = button.getChildAt(1) as Graphics;
        const led = button.led;
        const bgGraphics = button.bgGraphics;
        frame.clear();
        frame.rect(0, 0, 184, 82).stroke({ width: 2, color: 0x3a3a3a });
        led.alpha = 0.5;
        bgGraphics.alpha = 0.8;
      }
      this.selectedTowerType = null;
    }
  }

  /**
   * Select a tower type programmatically (e.g., via hotkey)
   * @param type Tower type to select
   */
  public selectTower(type: string): void {
    // Clear previous selection
    this.clearSelection();

    // Select new tower
    const button = this.towerButtons.get(type);
    if (button) {
      this.selectedTowerType = type;

      // Update button visuals
      const frame = button.getChildAt(1) as Graphics;
      const led = button.led;
      const bgGraphics = button.bgGraphics;

      frame.clear();
      frame.rect(0, 0, 184, 82).stroke({ width: 3, color: 0x00ff00 });
      led.alpha = 1;
      bgGraphics.alpha = 1;

      // Trigger callback
      if (this.onTowerSelectCallback) {
        this.onTowerSelectCallback(type);
      }
    }
  }

  public update(_deltaTime: number): void {
    // Update logic if needed
  }

  // Update button affordability based on current money
  public updateAffordability(currentMoney: number): void {
    if (this.lastAffordabilityMoney === currentMoney) {
      return;
    }
    this.lastAffordabilityMoney = currentMoney;

    this.towerButtons.forEach((button, type) => {
      const stats = this.towerManager.getTowerStats(type);
      if (!stats) {
        return;
      }

      const canAfford = currentMoney >= stats.cost;
      const led = button.led;
      const costText = button.costText;

      if (canAfford) {
        // Can afford - normal appearance
        button.alpha = 1.0;
        button.eventMode = 'static';
        button.cursor = 'pointer';
        if (led) {
          led.tint = 0x00ff00; // Green LED
        }
        if (costText) {
          costText.style.fill = 0x00ff00; // Green cost
        }
      } else {
        // Cannot afford - grayed out
        button.alpha = 0.6;
        button.eventMode = 'none';
        button.cursor = 'not-allowed';
        if (led) {
          led.tint = 0xff0000; // Red LED
        }
        if (costText) {
          costText.style.fill = 0xff0000; // Red cost
        }
      }
    });
  }
}
