import type { Application } from 'pixi.js';
import { DebugConstants } from '../config/debugConstants';
import { GameConfig } from '../config/gameConfig';
import { AIControlPanel } from '../ui/AIControlPanel';
import { MapSelectPanel } from '../ui/MapSelectPanel';
import { StatsPanel } from '../ui/StatsPanel';
import { WaveInfoPanel } from '../ui/WaveInfoPanel';
import { ZombieBestiary } from '../ui/ZombieBestiary';
import { DebugUtils } from '../utils/DebugUtils';
import type { GameManager } from './GameManager';
import type { WaveManager } from './WaveManager';

/**
 * Centralized manager for all debug/test UI panels
 * Handles wave info, bestiary, stats, and AI control panels
 */
export class DebugTestUIManager {
  private app: Application;
  private waveInfoPanel: WaveInfoPanel | null = null;
  private bestiaryPanel: ZombieBestiary | null = null;
  private statsPanel: StatsPanel | null = null;
  private aiControlPanel: AIControlPanel | null = null;
  private mapSelectPanel: MapSelectPanel | null = null;
  private gameManager: GameManager | null = null;
  private waveManager: WaveManager | null = null;

  private readonly LEFT_SIDE_X = 20;
  private readonly RIGHT_SIDE_OFFSET = 20;

  constructor(app: Application) {
    this.app = app;
  }

  public initialize(gameManager: GameManager, waveManager: WaveManager): void {
    this.gameManager = gameManager;
    this.waveManager = waveManager;

    this.createWaveInfoPanel();
    this.createBestiaryPanel();
    this.createStatsPanel();
    this.createAIControlPanel();
    this.createMapSelectPanel();

    this.layoutPanels();

    if (!DebugConstants.ENABLED) {
      this.hideAllPanels();
    }
  }

  /**
   * Production builds must not show debug UI. Each panel owns an always-visible toggle
   * button (some sit partly off-screen), so hide the panels themselves, not just their content.
   */
  private hideAllPanels(): void {
    const panels = [
      this.waveInfoPanel,
      this.bestiaryPanel,
      this.statsPanel,
      this.aiControlPanel,
      this.mapSelectPanel,
    ];
    for (const panel of panels) {
      if (!panel) {
        continue;
      }
      panel.visible = false;
      // UIPanel subclasses also own a separately-attached content container
      if ('getContentContainer' in panel) {
        panel.close();
        panel.getContentContainer().visible = false;
      }
    }
  }

  private createWaveInfoPanel(): void {
    if (!this.waveManager) {
      return;
    }
    this.waveInfoPanel = new WaveInfoPanel();
    this.waveInfoPanel.setWaveManager(this.waveManager);
    this.app.stage.addChild(this.waveInfoPanel.getContentContainer());
  }

  private createBestiaryPanel(): void {
    this.bestiaryPanel = new ZombieBestiary();
    this.app.stage.addChild(this.bestiaryPanel);
    this.app.stage.addChild(this.bestiaryPanel.getContentContainer());

    if (DebugConstants.ENABLED) {
      this.bestiaryPanel.show();
    } else {
      this.bestiaryPanel.hide();
    }
  }

  private createStatsPanel(): void {
    if (!this.gameManager) {
      return;
    }
    this.statsPanel = new StatsPanel(this.gameManager);
    this.app.stage.addChild(this.statsPanel);

    if (DebugConstants.ENABLED) {
      this.statsPanel.show();
    } else {
      this.statsPanel.hide();
    }
  }

  private createAIControlPanel(): void {
    this.aiControlPanel = new AIControlPanel();
    this.app.stage.addChild(this.aiControlPanel);

    if (DebugConstants.ENABLED) {
      this.aiControlPanel.show();
    } else {
      this.aiControlPanel.hide();
    }
  }

  private createMapSelectPanel(): void {
    if (!this.gameManager) {
      return;
    }
    const mapManager = this.gameManager.getMapManager();
    this.mapSelectPanel = new MapSelectPanel();
    this.mapSelectPanel.setMapsProvider(
      () => mapManager.getAvailableMaps(),
      () => mapManager.getCurrentMapName()
    );
    this.mapSelectPanel.setSelectCallback(mapName => this.selectMap(mapName));
    this.app.stage.addChild(this.mapSelectPanel.getContentContainer());
  }

  private layoutPanels(): void {
    const screenWidth = GameConfig.SCREEN_WIDTH;
    const screenHeight = GameConfig.SCREEN_HEIGHT;
    const leftX = this.LEFT_SIDE_X;
    const rightX = screenWidth - this.RIGHT_SIDE_OFFSET;

    if (this.aiControlPanel) {
      this.aiControlPanel.position.set(leftX, 10);
    }

    if (this.statsPanel) {
      const panelWidth = 280;
      this.statsPanel.position.set(rightX - panelWidth, 10);
    }

    if (this.bestiaryPanel) {
      this.bestiaryPanel.position.set(rightX, screenHeight - 94);
    }
  }

  public update(deltaTime: number): void {
    if (this.bestiaryPanel?.visible) {
      this.bestiaryPanel.update(deltaTime);
    }

    if (this.statsPanel?.visible) {
      this.statsPanel.update();
    }

    if (this.aiControlPanel?.visible) {
      this.aiControlPanel.update(deltaTime);
    }
  }

  public updateWaveInfo(wave: number): void {
    if (this.waveInfoPanel) {
      this.waveInfoPanel.updateCurrentWave(wave);
    }
  }

  public setZombieSpawnCallback(callback: (type: string) => void): void {
    if (this.bestiaryPanel) {
      this.bestiaryPanel.setSpawnCallback(callback);
    }
  }

  public showAll(): void {
    this.bestiaryPanel?.show();
    this.statsPanel?.show();
    this.aiControlPanel?.show();
  }

  public hideAll(): void {
    this.bestiaryPanel?.hide();
    this.statsPanel?.hide();
    this.aiControlPanel?.hide();
  }

  public toggleAll(): void {
    const isVisible = this.statsPanel?.visible ?? false;
    if (isVisible) {
      this.hideAll();
    } else {
      this.showAll();
    }
  }

  public getWaveInfoPanel(): WaveInfoPanel | null {
    return this.waveInfoPanel;
  }

  public getBestiaryPanel(): ZombieBestiary | null {
    return this.bestiaryPanel;
  }

  public getStatsPanel(): StatsPanel | null {
    return this.statsPanel;
  }

  public getAIControlPanel(): AIControlPanel | null {
    return this.aiControlPanel;
  }

  public getMapSelectPanel(): MapSelectPanel | null {
    return this.mapSelectPanel;
  }

  private currentLevelIndex = 1;
  private readonly maxLevel = 7;

  public progressToNextLevel(): void {
    if (!this.gameManager) {
      DebugUtils.warn('Cannot progress: GameManager not initialized');
      return;
    }

    this.currentLevelIndex++;
    if (this.currentLevelIndex > this.maxLevel) {
      this.currentLevelIndex = 1;
    }

    const levelId = `level${this.currentLevelIndex}`;
    const levelManager = this.gameManager.getLevelManager();

    levelManager.unlockLevel(levelId);
    DebugUtils.info(`🔓 Unlocked ${levelId}`);

    const success = levelManager.loadLevel(levelId);
    if (success) {
      this.gameManager.startGameWithLevel(levelId);
      DebugUtils.info(`🎮 Started ${levelId}`);
    } else {
      DebugUtils.error(`Failed to load ${levelId}`);
    }
  }

  public selectMap(mapName: string): void {
    if (!this.gameManager) {
      DebugUtils.warn('Cannot select map: GameManager not initialized');
      return;
    }

    const success = this.gameManager.startGameWithMap(mapName);
    if (success) {
      DebugUtils.info(`🗺️ Loaded map: ${mapName}`);
    } else {
      DebugUtils.error(`Failed to load map: ${mapName}`);
    }
  }

  public openWaveInfoPanel(): void {
    this.waveInfoPanel?.open();
  }

  public openBestiaryPanel(): void {
    this.bestiaryPanel?.open();
  }

  public openStatsPanel(): void {
    this.statsPanel?.show();
  }

  public openAIControlPanel(): void {
    if (!this.aiControlPanel) {
      return;
    }
    if (this.aiControlPanel.visible) {
      this.aiControlPanel.hide();
    } else {
      this.aiControlPanel.show();
    }
  }

  public openMapSelectPanel(): void {
    this.mapSelectPanel?.open();
  }

  public setAIToggleCallback(callback: (enabled: boolean) => void): void {
    this.aiControlPanel?.setToggleCallback(callback);
  }

  public dispose(): void {
    this.waveInfoPanel?.destroy();
    this.waveInfoPanel = null;

    this.bestiaryPanel?.destroy();
    this.bestiaryPanel = null;

    this.statsPanel?.destroy();
    this.statsPanel = null;

    this.aiControlPanel?.destroy();
    this.aiControlPanel = null;

    this.mapSelectPanel?.destroy();
    this.mapSelectPanel = null;
  }

  public onResize(): void {
    this.layoutPanels();
  }
}
