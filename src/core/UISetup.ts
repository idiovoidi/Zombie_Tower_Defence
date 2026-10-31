import type { Application } from 'pixi.js';
import { DebugConstants } from '../config/debugConstants';
import { GameConfig } from '../config/gameConfig';
import { customMapStore, syncCustomMapsToManagers } from '../customMaps';
import { CampUpgradeManager } from '../managers/CampUpgradeManager';
import { DebugTestUIManager } from '../managers/DebugTestUIManager';
import type { GameManager } from '../managers/GameManager';
import type { TimeControlManager } from '../managers/TimeControlManager';
import { BottomBar } from '../ui/BottomBar';
import { CampUpgradePanel } from '../ui/CampUpgradePanel';
import { DebugInfoPanel } from '../ui/DebugInfoPanel';
import { GameOverScreen } from '../ui/GameOverScreen';
import { VictoryScreen } from '../ui/VictoryScreen';
import { LevelSelectMenu } from '../ui/LevelSelectMenu';
import { MainMenu } from '../ui/MainMenu';
import { MapEditorScreen } from '../ui/MapEditorScreen';
import { MoneyAnimation } from '../ui/MoneyAnimation';
import { TimeControlUI } from '../ui/TimeControlUI';
import { TowerInfoPanel } from '../ui/TowerInfoPanel';
import { TowerShop } from '../ui/TowerShop';
import { UIManager } from '../ui/UIManager';
import { DebugUtils } from '../utils/DebugUtils';
import { GameEvents } from '../utils/EventBus';
import { VisualEffects } from '../utils/VisualEffects';

export interface UIContext {
  uiManager: UIManager;
  bottomBar: BottomBar;
  towerShop: TowerShop;
  towerInfoPanel: TowerInfoPanel;
  campUpgradePanel: CampUpgradePanel;
  moneyAnimation: MoneyAnimation;
  debugTestUIManager: DebugTestUIManager;
  timeControlUI: TimeControlUI;
  gameOverScreen: GameOverScreen;
  victoryScreen: VictoryScreen;
  mainMenu: MainMenu;
  levelSelectMenu: LevelSelectMenu;
  mapEditorScreen: MapEditorScreen;
  debugInfoPanel: DebugInfoPanel;
}

export function createUI(
  app: Application,
  gameManager: GameManager,
  timeControlManager: TimeControlManager
): UIContext {
  const uiManager = new UIManager(app);

  const screenWidth = GameConfig.SCREEN_WIDTH;
  const screenHeight = GameConfig.SCREEN_HEIGHT;
  const shopWidth = GameConfig.UI_SHOP_WIDTH;
  const bottomBarHeight = GameConfig.UI_BOTTOM_BAR_HEIGHT;

  const bottomBarWidth = screenWidth - shopWidth;
  const bottomBar = new BottomBar(bottomBarWidth);
  bottomBar.position.set(0, screenHeight - bottomBarHeight);
  uiManager.registerComponent('bottomBar', bottomBar);

  const mainMenu = new MainMenu();
  uiManager.registerComponent('mainMenu', mainMenu);

  const levelSelectMenu = new LevelSelectMenu();
  uiManager.registerComponent('levelSelectMenu', levelSelectMenu);

  const mapEditorScreen = new MapEditorScreen();
  uiManager.registerComponent('mapEditorScreen', mapEditorScreen);
  mapEditorScreen.hide();

  const gameOverScreen = new GameOverScreen();
  uiManager.registerComponent('gameOverScreen', gameOverScreen);

  const victoryScreen = new VictoryScreen();
  uiManager.registerComponent('victoryScreen', victoryScreen);

  const towerManager = gameManager.getTowerManager();
  const towerShop = new TowerShop(towerManager);
  towerShop.position.set(screenWidth - shopWidth, 0);
  uiManager.registerComponent('towerShop', towerShop);

  const towerInfoPanel = new TowerInfoPanel(towerManager);
  const towerInfoPanelHeight = 300;
  // Align with shop column (220px) so the metal panel reads as shop continuation
  towerInfoPanel.position.set(screenWidth - shopWidth, screenHeight - towerInfoPanelHeight);
  uiManager.registerComponent('towerInfoPanel', towerInfoPanel);

  const timeControlUI = new TimeControlUI(timeControlManager);
  const timeControlWidth = timeControlUI.getControlWidth();
  timeControlUI.position.set(screenWidth - shopWidth - timeControlWidth - 10, 10);
  uiManager.registerComponent('timeControlUI', timeControlUI);

  const debugTestUIManager = new DebugTestUIManager(app);
  debugTestUIManager.initialize(gameManager, gameManager.getWaveManager());

  debugTestUIManager.setZombieSpawnCallback((type: string) => {
    DebugUtils.debug(`🧟 Spawning test zombie: ${type}`);
    gameManager.getZombieManager().spawnZombieType(type);
  });

  const debugInfoPanel = new DebugInfoPanel();
  debugInfoPanel.position.set(screenWidth - 20, screenHeight - 48);
  uiManager.registerComponent('debugInfoPanel', debugInfoPanel);
  app.stage.addChild(debugInfoPanel.getContentContainer());

  debugInfoPanel.setStatsCallback(() => debugTestUIManager.openStatsPanel());
  debugInfoPanel.setWaveInfoCallback(() => debugTestUIManager.openWaveInfoPanel());
  debugInfoPanel.setBestiaryCallback(() => debugTestUIManager.openBestiaryPanel());
  debugInfoPanel.setAIControlCallback(() => debugTestUIManager.openAIControlPanel());
  debugInfoPanel.setProgressToNextLevelCallback(() => debugTestUIManager.progressToNextLevel());
  debugInfoPanel.setMapSelectCallback(() => debugTestUIManager.openMapSelectPanel());
  debugInfoPanel.setMapCreatorCallback(() => {
    DebugUtils.debug('Opening map creator from debug panel');
    mapEditorScreen.newDocument();
    uiManager.setState(GameConfig.GAME_STATES.MAP_EDITOR);
  });

  debugTestUIManager.setAIToggleCallback((enabled: boolean) => {
    DebugUtils.debug(`AI Player ${enabled ? 'enabled' : 'disabled'}`);
    gameManager.getAIPlayerManager().setEnabled(enabled);
    gameManager.getStatTracker().setAIModeEnabled(enabled);
  });

  if (DebugConstants.ENABLED) {
    debugInfoPanel.show();
  } else {
    debugInfoPanel.hide();
  }

  const campUpgradeManager = new CampUpgradeManager();
  const campUpgradePanel = new CampUpgradePanel();
  campUpgradePanel.setCampUpgradeManager(campUpgradeManager);
  uiManager.registerComponent('campUpgradePanel', campUpgradePanel);
  campUpgradePanel.hide();

  campUpgradePanel.setUpgradeCallback((upgradeId: string, cost: number) => {
    if (gameManager.getMoney() >= cost) {
      gameManager.spendMoney(cost);
      DebugUtils.debug(`Purchased camp upgrade: ${upgradeId} for $${cost}`);
      return true;
    }
    DebugUtils.debug('Not enough money for camp upgrade');
    return false;
  });

  const moneyAnimation = new MoneyAnimation(app.stage);
  const eventBus = gameManager.getEventBus();

  // UI reactions via typed EventBus (no GameManager callback setters)
  eventBus.on(GameEvents.MONEY_EARNED, amount => {
    moneyAnimation.showMoneyGain(amount);
  });

  eventBus.on(GameEvents.LIFE_LOST, () => {
    VisualEffects.createDamageFlash(app.stage, GameConfig.SCREEN_WIDTH, GameConfig.SCREEN_HEIGHT);
  });

  eventBus.on(GameEvents.GAME_OVER, data => {
    gameOverScreen.showGameOver(data.score);
    uiManager.setState(GameConfig.GAME_STATES.GAME_OVER);
  });

  eventBus.on(GameEvents.GAME_VICTORY, data => {
    const levelManager = gameManager.getLevelManager();
    victoryScreen.showVictory({
      score: data.score,
      wave: data.wave,
      livesRemaining: data.livesRemaining,
      unlockedLevelNames: data.unlockedLevelIds
        .map(id => levelManager.getLevel(id)?.name)
        .filter((name): name is string => name !== undefined),
    });
    uiManager.setState(GameConfig.GAME_STATES.VICTORY);
  });

  // Event handlers
  let hudUi: UIContext | null = null;

  const refreshLevelSelect = (): void => {
    syncCustomMapsToManagers(customMapStore.list(), {
      mapManager: gameManager.getMapManager(),
      levelManager: gameManager.getLevelManager(),
    });
    const levelManager = gameManager.getLevelManager();
    // Campaign sectors always listed (locked ones dimmed); custom maps only once saved
    levelSelectMenu.updateLevels(
      [...levelManager.getAllCampaignLevels(), ...levelManager.getCustomLevels()],
      {
        isCompleted: id => levelManager.isLevelCompleted(id),
        bestWave: id => levelManager.getBestWave(id),
        isUnlocked: id => levelManager.isLevelUnlocked(id),
      }
    );
  };

  const pushHudAfterPlayStart = (): void => {
    if (hudUi) {
      syncGameHud(gameManager, hudUi);
    }
  };

  mainMenu.setStartCallback(() => {
    DebugUtils.debug('Starting game from main menu');
    uiManager.setState(GameConfig.GAME_STATES.LEVEL_SELECT);
    refreshLevelSelect();
  });

  mainMenu.setMapCreatorCallback(() => {
    DebugUtils.debug('Opening map creator');
    mapEditorScreen.newDocument();
    uiManager.setState(GameConfig.GAME_STATES.MAP_EDITOR);
  });

  mapEditorScreen.setBackCallback(() => {
    // Return to whatever gameplay/menu state the game is in (works with SKIP_MENU).
    const resumeState = gameManager.getCurrentState() || GameConfig.GAME_STATES.MAIN_MENU;
    uiManager.setState(resumeState);
  });

  mapEditorScreen.setDefaultWaveProvider(wave =>
    gameManager.getWaveManager().getDefaultWaveZombies(wave)
  );

  mapEditorScreen.setPlayCallback(doc => {
    DebugUtils.debug(`Playing custom map: ${doc.name}`);
    gameManager.startCustomMap(doc);
    uiManager.setState(gameManager.getCurrentState());
    setupCampClickCallback(gameManager, campUpgradePanel);
    pushHudAfterPlayStart();
  });

  levelSelectMenu.setLevelSelectCallback((levelId: string) => {
    DebugUtils.debug(`Loading level: ${levelId}`);
    if (levelId.startsWith('custom_')) {
      const docId = levelId.slice('custom_'.length);
      const doc = customMapStore.get(docId);
      if (!doc) {
        DebugUtils.debug(`Custom map not found: ${docId}`);
        return;
      }
      gameManager.startCustomMap(doc);
    } else {
      gameManager.startGameWithLevel(levelId);
    }
    uiManager.setState(gameManager.getCurrentState());
    setupCampClickCallback(gameManager, campUpgradePanel);
    pushHudAfterPlayStart();
  });

  levelSelectMenu.setBackCallback(() => {
    DebugUtils.debug('Returning to main menu');
    uiManager.setState(GameConfig.GAME_STATES.MAIN_MENU);
  });

  gameOverScreen.setRestartCallback(() => {
    DebugUtils.debug('Restarting game');
    const currentLevel = gameManager.getCurrentLevel();
    if (currentLevel) {
      if (currentLevel.id.startsWith('custom_')) {
        const docId = currentLevel.id.slice('custom_'.length);
        const doc = customMapStore.get(docId);
        if (doc) {
          gameManager.startCustomMap(doc);
        } else {
          gameManager.startGameWithLevel(currentLevel.id);
        }
      } else {
        gameManager.startGameWithLevel(currentLevel.id);
      }
      uiManager.setState(gameManager.getCurrentState());
      setupCampClickCallback(gameManager, campUpgradePanel);
      pushHudAfterPlayStart();
    }
  });

  gameOverScreen.setMainMenuCallback(() => {
    DebugUtils.debug('Returning to main menu from game over');
    uiManager.setState(GameConfig.GAME_STATES.MAIN_MENU);
  });

  victoryScreen.setLevelSelectCallback(() => {
    DebugUtils.debug('Returning to level select from victory');
    refreshLevelSelect();
    uiManager.setState(GameConfig.GAME_STATES.LEVEL_SELECT);
  });

  victoryScreen.setMainMenuCallback(() => {
    DebugUtils.debug('Returning to main menu from victory');
    uiManager.setState(GameConfig.GAME_STATES.MAIN_MENU);
  });

  // Next wave callback (BottomBar owns the button)
  bottomBar.setNextWaveCallback(createNextWaveCallback(bottomBar, gameManager));

  // Tower shop callbacks
  towerShop.setTowerSelectCallback((type: string) => {
    DebugUtils.debug(`Tower selected: ${type}`);
    const placementManager = gameManager.getTowerPlacementManager();
    placementManager.startPlacement(type);
    timeControlManager.startPlacement(true);
    const { affordable } = canAffordSelectedTower(towerShop, gameManager);
    placementManager.setCanAfford(affordable);
  });

  // Tower placement callbacks
  const placementManager = gameManager.getTowerPlacementManager();

  placementManager.setTowerSelectedCallback(tower => {
    if (tower) {
      towerInfoPanel.showTowerInfo(tower);
    } else {
      towerInfoPanel.hide();
    }
  });

  // Tower info panel callbacks — economy owns spend/upgrade/sell; analytics listens on EventBus
  towerInfoPanel.setEconomyState(gameManager.getEconomyState());

  towerInfoPanel.setUpgradeCallback(() => {
    const tower = placementManager.getSelectedTower();
    if (!tower) {
      return;
    }
    if (gameManager.upgradeTower(tower)) {
      placementManager.refreshSelectedTowerVisuals();
      towerInfoPanel.showTowerInfo(tower);
      DebugUtils.debug(`Tower upgraded to level ${tower.getUpgradeLevel()}`);
    } else {
      DebugUtils.debug('Not enough money to upgrade');
    }
  });

  towerInfoPanel.setSellCallback(() => {
    const tower = placementManager.getSelectedTower();
    if (!tower) {
      return;
    }
    const sellValue = gameManager.sellTower(tower);
    placementManager.removeSelectedTower();
    towerInfoPanel.hide();
    DebugUtils.debug(`Tower sold for $${sellValue}`);
  });

  const ui: UIContext = {
    uiManager,
    bottomBar,
    towerShop,
    towerInfoPanel,
    campUpgradePanel,
    moneyAnimation,
    debugTestUIManager,
    timeControlUI,
    gameOverScreen,
    victoryScreen,
    mainMenu,
    levelSelectMenu,
    mapEditorScreen,
    debugInfoPanel,
  };

  hudUi = ui;
  bindGameHudEvents(gameManager, ui);

  return ui;
}

/** Update everything that depends on the player's current money. */
function refreshMoneyDependents(gameManager: GameManager, ui: UIContext, money: number): void {
  ui.towerShop.updateAffordability(money);
  ui.campUpgradePanel.setMoneyAvailable(money);

  const placementManager = gameManager.getTowerPlacementManager();
  if (placementManager.isInPlacementMode()) {
    const { affordable } = canAffordSelectedTower(ui.towerShop, gameManager);
    placementManager.setCanAfford(affordable);
  }
}

/**
 * Push money/lives/wave/next-wave UI from game state (also used after level start).
 */
export function syncGameHud(gameManager: GameManager, ui: UIContext): void {
  const money = gameManager.getMoney();
  ui.bottomBar.updateMoney(money);
  ui.bottomBar.updateLives(gameManager.getLives());
  ui.bottomBar.updateWave(gameManager.getWave());
  refreshMoneyDependents(gameManager, ui, money);

  if (gameManager.getCurrentState() === GameConfig.GAME_STATES.WAVE_COMPLETE) {
    ui.bottomBar.showNextWaveButton();
  } else {
    ui.bottomBar.hideNextWaveButton();
  }
}

/**
 * Subscribe HUD surfaces to economy/wave events instead of polling every frame.
 */
export function bindGameHudEvents(gameManager: GameManager, ui: UIContext): void {
  const eventBus = gameManager.getEventBus();

  const refreshMoney = (): void => {
    const money = gameManager.getMoney();
    ui.bottomBar.updateMoney(money);
    refreshMoneyDependents(gameManager, ui, money);
  };

  const refreshLives = (): void => {
    ui.bottomBar.updateLives(gameManager.getLives());
  };

  const refreshWave = (): void => {
    ui.bottomBar.updateWave(gameManager.getWave());
  };

  eventBus.on(GameEvents.MONEY_EARNED, refreshMoney);
  eventBus.on(GameEvents.MONEY_SPENT, refreshMoney);
  eventBus.on(GameEvents.LIFE_LOST, refreshLives);
  eventBus.on(GameEvents.LIVES_CHANGED, refreshLives);
  eventBus.on(GameEvents.WAVE_START, () => {
    refreshWave();
    ui.bottomBar.hideNextWaveButton();
  });
  eventBus.on(GameEvents.WAVE_COMPLETE, () => {
    ui.bottomBar.showNextWaveButton();
  });

  syncGameHud(gameManager, ui);
}

function createNextWaveCallback(
  uiComponent: { hideNextWaveButton: () => void },
  gameManager: GameManager
): () => void {
  return () => {
    DebugUtils.debug('Starting next wave');
    gameManager.startNextWave();
    uiComponent.hideNextWaveButton();
  };
}

export function setupCampClickCallback(
  gameManager: GameManager,
  campUpgradePanel: CampUpgradePanel
): void {
  const mapRenderer = gameManager.getMapRenderer();
  if (mapRenderer) {
    DebugUtils.debug('Setting up camp click callback');
    mapRenderer.setCampClickCallback(() => {
      DebugUtils.debug('🏕️ Camp clicked - opening upgrade panel');
      campUpgradePanel.show();
    });
    DebugUtils.debug('Camp click callback set successfully');
  } else {
    DebugUtils.debug('⚠️ Map renderer not available');
  }
}

export function canAffordSelectedTower(
  towerShop: TowerShop,
  gameManager: GameManager
): { affordable: boolean; cost: number; selectedType: string | null } {
  const selectedType = towerShop.getSelectedTowerType();
  if (!selectedType) {
    return { affordable: false, cost: 0, selectedType: null };
  }
  const cost = gameManager.getTowerManager().getTowerCost(selectedType);
  return { affordable: gameManager.getMoney() >= cost, cost, selectedType };
}
