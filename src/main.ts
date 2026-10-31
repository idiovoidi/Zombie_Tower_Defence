import { DevConfig } from './config/devConfig';
import { GameConfig } from './config/gameConfig';
import { createApp } from './core/Application';
import { registerDebugConsoleAPIs } from './core/DebugConsole';
import { bindDebugHotkeys } from './core/DebugHotkeys';
import { startGameLoop } from './core/GameLoop';
import { bindInput } from './core/InputBindings';
import { createUI, setupCampClickCallback, syncGameHud } from './core/UISetup';
import {
  applyUrlDevOverrides,
  PathDebugOverlay,
  registerDevApi,
  TowerRangeDebugOverlay,
} from './debug';
import { GameManager } from './managers/GameManager';
import { InputManager } from './managers/InputManager';
import { TimeControlManager } from './managers/TimeControlManager';
import { DebugUtils } from './utils/DebugUtils';

(async () => {
  applyUrlDevOverrides();

  DebugUtils.setEnabled(DevConfig.DEBUG.ENABLED);
  DebugUtils.setLogLevel(DevConfig.DEBUG.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error');
  DebugUtils.info('Initializing game...');

  const { app, pixelArtRenderer, scaleManager } = await createApp();

  const gameManager = new GameManager(app);
  const timeControlManager = new TimeControlManager();
  const inputManager = new InputManager(app, scaleManager);
  inputManager.setCamera(gameManager.getCamera());
  gameManager.setInputManager(inputManager);

  const worldContainer = gameManager.getWorldContainer();
  const pathOverlay = new PathDebugOverlay(worldContainer);
  const rangeOverlay = new TowerRangeDebugOverlay(worldContainer);

  const refreshPathOverlay = (): void => {
    pathOverlay.refresh(gameManager.getMapManager().getCurrentMap());
  };
  const refreshRangeOverlay = (): void => {
    rangeOverlay.update(gameManager.getTowerCombatManager().getTowers());
  };

  const ui = createUI(app, gameManager, timeControlManager);
  bindInput(inputManager, gameManager, timeControlManager, ui.towerShop, ui.bottomBar);
  bindDebugHotkeys(inputManager, gameManager, scaleManager, {
    refreshPathOverlay,
    refreshRangeOverlay,
  });

  gameManager.init();

  const mapRenderer = gameManager.getMapRenderer();
  mapRenderer?.setOnMapRendered(() => refreshPathOverlay());
  refreshPathOverlay();

  if (DevConfig.TESTING.SKIP_MENU && DevConfig.TESTING.AUTO_START_GAME) {
    DebugUtils.info('Quick start enabled - skipping menus');
    const defaultLevel = DevConfig.TESTING.DEFAULT_LEVEL || 'level1';
    gameManager.startGameWithLevel(defaultLevel);
    ui.uiManager.setState(GameConfig.GAME_STATES.PLAYING);
    setupCampClickCallback(gameManager, ui.campUpgradePanel);
    syncGameHud(gameManager, ui);
    refreshPathOverlay();
  } else {
    // Apply the main-menu visibility set (hides HUD, shop, level select, etc.)
    ui.uiManager.setState(GameConfig.GAME_STATES.MAIN_MENU);
    gameManager.showMenuBackdrop();
    refreshPathOverlay();
  }

  startGameLoop(app, gameManager, timeControlManager, ui, pixelArtRenderer, {
    updateRangeOverlay: refreshRangeOverlay,
    updateCamera: deltaMs => inputManager.updateCamera(deltaMs),
  });
  await registerDebugConsoleAPIs(gameManager, timeControlManager);
  registerDevApi({
    gameManager,
    timeControlManager,
    pathOverlay,
    rangeOverlay,
    refreshPathOverlay,
  });
})();
