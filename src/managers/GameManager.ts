import { type Application, Container, Graphics } from 'pixi.js';
import { DebugConstants } from '../config/debugConstants';
import { DevConfig } from '../config/devConfig';
import { GameConfig } from '../config/gameConfig';
import { CAMERA, UI_DIMENSIONS } from '../config/visualConstants';
import { configureTowerRuntime } from '../core/towerRuntime';
import { type CustomMapDocument, registerCustomMap } from '../customMaps';
import type { Tower } from '../objects/Tower';
import type { ITower } from '../objects/Tower.interface';
import type { Zombie } from '../objects/Zombie';
import { EffectManager } from '../renderers/effects/EffectManager';
import { VignetteOverlay } from '../renderers/effects/VignetteOverlay';
import type { SludgePoolEffect } from '../renderers/effects/SludgePoolEffect';
import { VisualMapRenderer } from '../renderers/VisualMapRenderer';
import type { IStatTracker } from '../types/gameProviders';
import { Camera } from '../utils/Camera';
import { EffectCleanupManager } from '../utils/EffectCleanupManager';
import { EventBus, GameEvents } from '../utils/EventBus';
import { LogExporter } from '../utils/LogExporter';
import { OptimizationValidator } from '../utils/OptimizationValidator';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { ResourceCleanupManager } from '../utils/ResourceCleanupManager';
import { TowerRangeVisualizer } from '../utils/TowerRangeVisualizer';
import { VisualEffects } from '../utils/VisualEffects';
import { AnalyticsState } from './AnalyticsState';
import { EconomyState } from './EconomyState';
import type { InputManager } from './InputManager';
import { LevelManager } from './LevelManager';
import { LevelState } from './LevelState';
import { exportManualGameLog } from './ManualGameLogExporter';
import { MapManager } from './MapManager';
import { ProjectileManager } from './ProjectileManager';
import { SludgePoolManager } from './SludgePoolManager';
import { TowerCombatManager } from './TowerCombatManager';
import { TowerManager } from './TowerManager';
import { TowerPlacementManager } from './TowerPlacementManager';
import { WaveManager } from './WaveManager';
import { trackFrameTelemetry } from './FrameTelemetry';
import { ZombieManager } from './ZombieManager';

export interface GameManagerDeps {
  eventBus?: EventBus;
  towerManager?: TowerManager;
  rangeVisualizer?: TowerRangeVisualizer;
}

/**
 * GameManager - Session orchestrator / composition root for a play session.
 *
 * Owns LevelState, EconomyState, and AnalyticsState. Prefer those for domain work;
 * manager getters remain for UI/debug/AI providers.
 */
export class GameManager {
  private app: Application;
  private currentState: string;
  private lives: number;
  private score: number;

  private readonly eventBus: EventBus;
  private readonly rangeVisualizer: TowerRangeVisualizer;

  private levelState!: LevelState;
  private economyState!: EconomyState;
  private analyticsState!: AnalyticsState;

  private mapManager: MapManager;
  private levelManager: LevelManager;
  private visualMapRenderer: VisualMapRenderer | null = null;
  private effectManager: EffectManager;

  private towerManager: TowerManager;
  private towerPlacementManager: TowerPlacementManager;
  private zombieManager: ZombieManager;
  private waveManager: WaveManager;
  private projectileManager: ProjectileManager;
  private towerCombatManager: TowerCombatManager;
  private sludgePoolManager: SludgePoolManager;

  private viewportContainer: Container;
  private worldContainer: Container;
  private playAreaMask: Graphics;
  private gameContainer: Container;
  private camera: Camera;
  private waveStartLives = 0;
  /** Lives at the start of the current run (levels differ; used for logs and survival rate). */
  private startingLives = 0;

  constructor(app: Application, deps: GameManagerDeps = {}) {
    this.app = app;
    this.currentState = GameConfig.GAME_STATES.MAIN_MENU;

    this.lives = DebugConstants.ENABLED ? DebugConstants.STARTING_LIVES : GameConfig.STARTING_LIVES;
    this.score = 0;

    this.eventBus = deps.eventBus ?? EventBus.create();
    EventBus.setInstance(this.eventBus);

    this.towerManager = deps.towerManager ?? new TowerManager();
    TowerManager.setInstance(this.towerManager);

    this.rangeVisualizer = deps.rangeVisualizer ?? new TowerRangeVisualizer();
    TowerRangeVisualizer.setInstance(this.rangeVisualizer);

    configureTowerRuntime({
      towerManager: this.towerManager,
      eventBus: this.eventBus,
      rangeVisualizer: this.rangeVisualizer,
    });

    // Fixed play-area viewport (mask stays put); camera transforms only worldContainer.
    this.viewportContainer = new Container();
    app.stage.addChildAt(this.viewportContainer, 0);

    this.playAreaMask = new Graphics()
      .rect(0, 0, UI_DIMENSIONS.PLAY_AREA_WIDTH, UI_DIMENSIONS.HEIGHT)
      .fill(0xffffff);
    this.playAreaMask.eventMode = 'none';
    this.viewportContainer.addChild(this.playAreaMask);
    this.viewportContainer.mask = this.playAreaMask;

    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
    this.viewportContainer.addChild(this.worldContainer);

    // Screen-space edge darkening above the (panning) world, clipped by the play-area mask
    this.viewportContainer.addChild(
      new VignetteOverlay(UI_DIMENSIONS.PLAY_AREA_WIDTH, UI_DIMENSIONS.HEIGHT)
    );

    this.gameContainer = new Container();
    this.gameContainer.sortableChildren = true;
    this.gameContainer.zIndex = CAMERA.GAME_CONTENT_Z_INDEX;
    this.worldContainer.addChild(this.gameContainer);

    this.camera = new Camera(
      this.worldContainer,
      {
        worldWidth: UI_DIMENSIONS.PLAY_AREA_WIDTH,
        worldHeight: UI_DIMENSIONS.HEIGHT,
        viewportWidth: UI_DIMENSIONS.PLAY_AREA_WIDTH,
        viewportHeight: UI_DIMENSIONS.HEIGHT,
      },
      { maxZoom: CAMERA.MAX_ZOOM, zoomStep: CAMERA.ZOOM_STEP }
    );

    this.effectManager = new EffectManager(this.gameContainer);

    this.mapManager = new MapManager();
    this.levelManager = new LevelManager(this.mapManager);

    this.waveManager = new WaveManager();
    this.zombieManager = new ZombieManager(this.gameContainer, this.waveManager, this.mapManager);
    this.projectileManager = new ProjectileManager(this.gameContainer);
    this.towerPlacementManager = new TowerPlacementManager(
      this.gameContainer,
      this.towerManager,
      this.mapManager,
      this.effectManager.getContainer()
    );
    this.towerCombatManager = new TowerCombatManager(1024, 768, this.eventBus);
    this.sludgePoolManager = new SludgePoolManager();

    this.waveManager.reset(this.getStartingWave());

    this.initializeStateObjects();
    this.setupEventListeners();
    this.setupTowerPlacementCallbacks();
  }

  /** Single source of truth for session start wave (WaveManager owns the counter). */
  private getStartingWave(): number {
    return DebugConstants.ENABLED ? DebugConstants.START_AT_WAVE : 1;
  }

  private initializeStateObjects(): void {
    this.levelState = new LevelState({
      container: this.gameContainer,
      mapManager: this.mapManager,
      worldWidth: 1024,
      worldHeight: 768,
      towerManager: this.towerManager,
      waveManager: this.waveManager,
      zombieManager: this.zombieManager,
      projectileManager: this.projectileManager,
      towerPlacementManager: this.towerPlacementManager,
      towerCombatManager: this.towerCombatManager,
      effectManager: this.effectManager,
    });

    const startingMoney = DebugConstants.ENABLED
      ? DebugConstants.STARTING_MONEY
      : GameConfig.STARTING_MONEY;
    this.economyState = new EconomyState({
      startingMoney,
      costCatalog: this.towerManager,
      eventBus: this.eventBus,
    });

    this.analyticsState = new AnalyticsState({
      gameManager: this,
      eventBus: this.eventBus,
    });
  }

  private setupEventListeners(): void {
    this.eventBus.on(GameEvents.DAMAGE_DEALT, data => {
      if (data.killed && data.overkill > 100) {
        const intensity = Math.min(8, data.overkill / 50);
        VisualEffects.triggerScreenShake(this.gameContainer, intensity, 150);
      }
    });

    this.eventBus.on(GameEvents.SLUDGE_POOL_CREATED, data => {
      const pool = data.pool as SludgePoolEffect | null;
      if (pool) {
        this.sludgePoolManager.addPool(pool);
      }
    });
  }

  private setupTowerPlacementCallbacks(): void {
    this.towerPlacementManager.setTowerPlacedCallback((tower: Tower) => {
      const cost = this.towerManager.getTowerCost(tower.getType());
      if (this.spendMoney(cost)) {
        this.eventBus.emit(GameEvents.TOWER_PLACED, {
          type: tower.getType(),
          cost: cost,
        });
      }
    });
  }

  public init(): void {
    // Initialization complete - GameManager ready
  }

  public startGame(): void {
    this.currentState = GameConfig.GAME_STATES.PLAYING;
    this.zombieManager.startWave();

    // Mark arrays as dirty to ensure initial population
    if (this.towerPlacementManager.getPlacedTowers().length > 0) {
      this.towerCombatManager.setTowers(this.towerPlacementManager.getPlacedTowers());
    }
    if (this.zombieManager.getZombies().length > 0) {
      const zombies = this.zombieManager.getZombies();
      this.towerCombatManager.setZombies(zombies);
      this.effectManager.setZombies(zombies); // For fire pool damage
    }

    PerformanceMonitor.recordWaveMemory(this.getWave());
  }

  /** Shared start-of-run reset: clears state, restarts analytics and the wave counter. */
  private resetRunState(): void {
    this.waveManager.setBaseDifficulty(1);
    this.clearGameState();
    EffectCleanupManager.clearAll();
    LogExporter.newSession();

    this.analyticsState.getBalanceTrackingManager().reset();
    this.analyticsState.getBalanceTrackingManager().enable();

    this.score = 0;
    this.waveManager.reset(this.getStartingWave());
  }

  /** Shared end-of-setup: enter PLAYING, start tracking, seed towers, kick off wave 1. */
  private launchRun(): void {
    this.currentState = GameConfig.GAME_STATES.PLAYING;

    const aiEnabled = this.analyticsState.getAIPlayerManager().isEnabled();
    this.analyticsState.getStatTracker().startTracking(aiEnabled);

    this.spawnStarterTower();

    if (DevConfig.TESTING?.SPAWN_TEST_TOWERS) {
      this.spawnTestTowers();
    }

    this.startingLives = this.lives;
    this.waveStartLives = this.lives;
    // Own startWave; WAVE_START is notification-only for analytics
    this.zombieManager.startWave();
    this.eventBus.emit(GameEvents.WAVE_START, { wave: this.getWave() });
  }

  /**
   * Draw a level's map behind the menus without starting a run, so the main menu and level
   * select sit over the battlefield instead of a black screen.
   */
  public showMenuBackdrop(levelId = 'level1'): void {
    const level = this.levelManager.getLevel(levelId);
    if (!level || !this.mapManager.loadMap(level.map)) {
      return;
    }
    this.visualMapRenderer?.renderMap(level.map);
    this.syncCameraToCurrentMap();
  }

  public startGameWithLevel(levelId: string): void {
    this.prepareWaveOverridesForLevel(levelId);

    if (!this.levelManager.loadLevel(levelId)) {
      return;
    }

    const level = this.levelManager.getCurrentLevel();
    if (!level) {
      return;
    }

    this.resetRunState();
    this.waveManager.setBaseDifficulty(WaveManager.DIFFICULTY_SCALE[level.difficulty] ?? 1);

    if (!DebugConstants.ENABLED) {
      this.economyState.reset(level.startingMoney);
      this.lives = level.startingLives;
    }
    this.visualMapRenderer?.renderMap(level.map);
    this.syncCameraToCurrentMap();

    this.launchRun();
  }

  /**
   * Debug helper: load a map layout by name and restart play.
   * Prefers the campaign/custom level that owns the map when one exists.
   */
  public startGameWithMap(mapName: string): boolean {
    const levelId = this.levelManager.findLevelIdByMap(mapName);
    if (levelId) {
      this.levelManager.unlockLevel(levelId);
      this.startGameWithLevel(levelId);
      return true;
    }

    if (!this.mapManager.loadMap(mapName)) {
      return false;
    }

    this.prepareWaveOverridesForLevel('');
    // No level owns this map: don't let the previous level's id/totalWaves leak into this run
    this.levelManager.clearCurrentLevel();
    this.resetRunState();

    this.visualMapRenderer?.renderMap(mapName);
    this.syncCameraToCurrentMap();

    this.launchRun();
    return true;
  }

  private prepareWaveOverridesForLevel(levelId: string): void {
    if (!levelId.startsWith('custom_')) {
      this.waveManager.clearWaveOverrides();
    }
  }

  /**
   * Register a custom map document into managers and start playing it.
   */
  public startCustomMap(doc: CustomMapDocument): void {
    const { levelId } = registerCustomMap(doc, {
      mapManager: this.mapManager,
      levelManager: this.levelManager,
      waveManager: this.waveManager,
    });
    this.startGameWithLevel(levelId);
  }

  private clearGameState(): void {
    ResourceCleanupManager.cleanupGameResources({
      zombieManager: this.zombieManager,
      towerPlacementManager: this.towerPlacementManager,
      projectileManager: this.projectileManager,
      effectManager: this.effectManager,
      towerCombatManager: this.levelState.getTowerCombatManager(),
      waveManager: this.waveManager,
    });
  }

  private cleanupWaveObjects(): void {
    ResourceCleanupManager.cleanupWaveResources({
      zombieManager: this.zombieManager,
      projectileManager: this.projectileManager,
      effectManager: this.effectManager,
    });

    // Clear sludge pools and goo effects
    this.sludgePoolManager.clear();

    this.levelState.cleanupWave();
  }

  private spawnStarterTower(): void {
    const starterTower = { x: 280, y: 440, type: GameConfig.TOWER_TYPES.MACHINE_GUN };
    this.towerPlacementManager.startPlacement(starterTower.type);
    const tower = this.towerPlacementManager.placeTower(starterTower.x, starterTower.y);
    if (tower) {
      // Starter tower placed successfully
    } else {
      // Failed to place starter tower - position may be invalid
    }

    const _placedTowers = this.towerPlacementManager.getPlacedTowers();
  }

  private spawnTestTowers(): void {
    const testTowers = [
      { x: 300, y: 300, type: GameConfig.TOWER_TYPES.SNIPER },
      { x: 500, y: 300, type: GameConfig.TOWER_TYPES.SHOTGUN },
    ];

    testTowers.forEach((config, _index) => {
      this.towerPlacementManager.startPlacement(config.type);
      const tower = this.towerPlacementManager.placeTower(config.x, config.y);
      if (tower) {
        // Test tower placed successfully
      } else {
        // Failed to place test tower
      }
    });
  }

  public pauseGame(): void {
    if (this.currentState === GameConfig.GAME_STATES.PLAYING) {
      this.currentState = GameConfig.GAME_STATES.PAUSED;
      this.eventBus.emit(GameEvents.GAME_PAUSE);
    }
  }

  public resumeGame(): void {
    if (this.currentState === GameConfig.GAME_STATES.PAUSED) {
      this.currentState = GameConfig.GAME_STATES.PLAYING;
      this.eventBus.emit(GameEvents.GAME_RESUME);
    }
  }

  public gameOver(): void {
    if (this.currentState === GameConfig.GAME_STATES.GAME_OVER) {
      return;
    }

    this.currentState = GameConfig.GAME_STATES.GAME_OVER;

    const finalScore = this.getWave() * 1000 + this.getMoney();
    this.score = finalScore;

    const level = this.levelManager.getCurrentLevel();
    if (level) {
      this.levelManager.recordBestWave(level.id, this.getWave());
    }

    // Emit game over event
    this.eventBus.emit(GameEvents.GAME_OVER, { score: finalScore });

    if (this.analyticsState.isBalanceTrackingEnabled()) {
      this.analyticsState.getBalanceTrackingManager().performEndGameAnalysis();
    }

    if (!this.analyticsState.getAIPlayerManager().isEnabled()) {
      this.exportManualGameLog();
    }

    setTimeout(() => {
      this.clearGameState();
    }, 100);
  }

  private exportManualGameLog(): void {
    const balanceData = this.analyticsState.isBalanceTrackingEnabled()
      ? (this.analyticsState.getBalanceTrackingManager().generateReportData() as Record<
          string,
          unknown
        >)
      : undefined;

    exportManualGameLog({
      highestWave: this.getWave(),
      finalMoney: this.getMoney(),
      finalLives: this.lives,
      startLives: this.startingLives > 0 ? this.startingLives : this.lives,
      balanceData,
    });
  }

  public victory(): void {
    if (this.currentState === GameConfig.GAME_STATES.VICTORY) {
      return;
    }
    this.currentState = GameConfig.GAME_STATES.VICTORY;

    const level = this.levelManager.getCurrentLevel();
    const wave = this.getWave();
    const finalScore = wave * 1000 + this.getMoney() + this.lives * 10;
    this.score = finalScore;

    let unlockedLevelIds: string[] = [];
    if (level) {
      unlockedLevelIds = this.levelManager.markCompleted(level.id);
      this.levelManager.recordBestWave(level.id, wave);
    }

    this.eventBus.emit(GameEvents.GAME_VICTORY, {
      levelId: level?.id ?? '',
      wave,
      score: finalScore,
      livesRemaining: this.lives,
      unlockedLevelIds,
    });

    if (this.analyticsState.isBalanceTrackingEnabled()) {
      this.analyticsState.getBalanceTrackingManager().performEndGameAnalysis();
    }
    this.clearGameState();
  }

  public getCurrentState(): string {
    return this.currentState;
  }

  public addMoney(amount: number): void {
    this.economyState.addMoney(amount);
  }

  public spendMoney(amount: number): boolean {
    return this.economyState.spendMoney(amount);
  }

  public addLives(amount: number): void {
    this.lives += amount;
    this.eventBus.emit(GameEvents.LIVES_CHANGED, { lives: this.lives });
  }

  public loseLife(amount = 1): void {
    if (DebugConstants.ENABLED && DebugConstants.DISABLE_GAME_OVER) {
      return;
    }

    this.lives -= amount;
    // Trigger screen shake scaling with damage
    VisualEffects.triggerScreenShake(this.gameContainer, Math.min(15, amount * 4), 250);

    // Emit life lost event (UI listens for damage flash)
    this.eventBus.emit(GameEvents.LIFE_LOST, { amount, lives: this.lives });
    this.eventBus.emit(GameEvents.LIVES_CHANGED, { lives: this.lives });
    if (this.lives <= 0) {
      this.lives = 0;
      this.gameOver();
    }
  }

  public nextWave(): void {
    this.currentState = GameConfig.GAME_STATES.WAVE_COMPLETE;
  }

  public addScore(points: number): void {
    this.score += points;
  }

  public getScore(): number {
    return this.score;
  }

  public getMoney(): number {
    return this.economyState.getMoney();
  }

  /** Lives the current run began with (0 before any run). */
  public getStartingLives(): number {
    return this.startingLives;
  }

  public getLives(): number {
    return this.lives;
  }

  /** Wave number — owned by WaveManager. */
  public getWave(): number {
    return this.waveManager.getCurrentWave();
  }

  // Manager getters - delegate to contextual state objects
  public getTowerManager(): TowerManager {
    return this.towerManager;
  }

  public getWaveManager(): WaveManager {
    return this.waveManager;
  }

  public getMapManager(): MapManager {
    return this.mapManager;
  }

  public getLevelManager(): LevelManager {
    return this.levelManager;
  }

  public getAvailableLevels() {
    return this.levelManager.getAvailableLevels();
  }

  public getCurrentLevel() {
    return this.levelManager.getCurrentLevel();
  }

  public getZombieManager(): ZombieManager {
    return this.zombieManager;
  }

  public getTowerPlacementManager(): TowerPlacementManager {
    return this.towerPlacementManager;
  }

  public getMapRenderer(): VisualMapRenderer | null {
    return this.visualMapRenderer;
  }

  public getWorldContainer(): Container {
    return this.worldContainer;
  }

  public getCamera(): Camera {
    return this.camera;
  }

  public setInputManager(inputManager: InputManager): void {
    if (!this.visualMapRenderer) {
      this.visualMapRenderer = new VisualMapRenderer(
        this.app,
        this.mapManager,
        inputManager,
        this.worldContainer
      );
    }
  }

  private syncCameraToCurrentMap(): void {
    const mapData = this.mapManager.getCurrentMap();
    const width = mapData?.width ?? UI_DIMENSIONS.PLAY_AREA_WIDTH;
    const height = mapData?.height ?? UI_DIMENSIONS.HEIGHT;
    this.camera.setWorldSize(width, height);
    this.camera.reset();
    this.towerCombatManager.setWorldSize(width, height);
  }

  public getAIPlayerManager() {
    return this.analyticsState.getAIPlayerManager();
  }

  public getStatTracker(): IStatTracker {
    return this.analyticsState.getStatTracker();
  }

  public getBalanceTrackingManager() {
    return this.analyticsState.getBalanceTrackingManager();
  }

  public getBalanceIssues() {
    return this.analyticsState.getBalanceTrackingManager().getBalanceIssues();
  }

  public getTowerCombatManager(): TowerCombatManager {
    return this.towerCombatManager;
  }

  // Interface implementations for granular state providers
  public getPlacedTowers(): Tower[] {
    return this.towerPlacementManager.getPlacedTowers();
  }

  public getPlacedTowerCount(): number {
    return this.towerPlacementManager.getPlacedTowers().length;
  }

  public getZombies(): Zombie[] {
    return this.zombieManager.getZombies();
  }

  public getZombieCount(): number {
    return this.zombieManager.getZombies().length;
  }

  public enableBalanceTracking(): void {
    this.analyticsState.enableBalanceTracking();
  }

  public disableBalanceTracking(): void {
    this.analyticsState.disableBalanceTracking();
  }

  public isBalanceTrackingEnabled(): boolean {
    return this.analyticsState.isBalanceTrackingEnabled();
  }

  // Contextual state getters (new API)
  public getEventBus(): EventBus {
    return this.eventBus;
  }

  public getLevelState(): LevelState {
    return this.levelState;
  }

  public getEconomyState(): EconomyState {
    return this.economyState;
  }

  /**
   * Upgrade a tower through the economy owner (spend + mutate + events).
   */
  public upgradeTower(tower: ITower): boolean {
    return this.economyState.upgradeTower(tower);
  }

  /**
   * Sell a tower through the economy owner (refund + events). Caller removes it from the map.
   */
  public sellTower(tower: ITower): number {
    return this.economyState.sellTower(tower);
  }

  public getAnalyticsState(): AnalyticsState {
    return this.analyticsState;
  }

  public update(deltaTime: number): void {
    PerformanceMonitor.startFrame();
    OptimizationValidator.trackFrame();

    // Update visual map renderer
    PerformanceMonitor.startMeasure('visualMapRenderer');
    if (this.visualMapRenderer) {
      this.visualMapRenderer.updateFog(deltaTime);
    }
    PerformanceMonitor.endMeasure('visualMapRenderer');

    // Update analytics state (includes AI, stat tracker, balance tracking)
    PerformanceMonitor.startMeasure('analyticsState');
    this.analyticsState.update(deltaTime);
    PerformanceMonitor.endMeasure('analyticsState');

    // Combat tick owned by LevelState (effects, zombies, sync, towers, projectiles)
    const isPlaying = this.currentState === GameConfig.GAME_STATES.PLAYING;
    PerformanceMonitor.startMeasure('levelState');
    this.levelState.update(deltaTime, isPlaying);
    PerformanceMonitor.endMeasure('levelState');

    // Update sludge pool manager
    PerformanceMonitor.startMeasure('sludgePoolManager');
    this.sludgePoolManager.update(this.towerCombatManager);
    PerformanceMonitor.endMeasure('sludgePoolManager');

    if (isPlaying) {
      // Check wave completion
      if (this.zombieManager.isWaveComplete()) {
        this.onWaveComplete();
      }

      // Process zombie rewards and end-of-path damage
      const zombies = this.zombieManager.getZombies();
      for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];

        const healthComponent = zombie.getComponent('Health') as unknown as {
          isAlive: () => boolean;
        };
        if (healthComponent && !healthComponent.isAlive()) {
          const reward = zombie.getReward();
          this.addMoney(reward);
          this.addScore(10);

          // Emit zombie killed event - AnalyticsState listens and handles detailed tracking
          this.eventBus.emit(GameEvents.ZOMBIE_KILLED, {
            reward,
            type: zombie.getType(),
          });
          continue;
        }

        if (zombie.hasReachedEnd()) {
          const damage = zombie.getDamage();
          this.loseLife(damage);
          this.zombieManager.removeZombie(i);
        }
      }
    }

    if (isPlaying) {
      trackFrameTelemetry({
        zombieManager: this.zombieManager,
        towerPlacementManager: this.towerPlacementManager,
        projectileManager: this.projectileManager,
        effectManager: this.effectManager,
      });
    }

    PerformanceMonitor.endFrame();
  }

  private onWaveComplete(): void {
    this.currentState = GameConfig.GAME_STATES.WAVE_COMPLETE;
    this.cleanupWaveObjects();

    const wave = this.getWave();

    // Calculate wave stats for event
    const zombieGroups = this.waveManager.getCurrentWaveZombies();
    let totalZombiesSpawned = 0;
    for (const group of zombieGroups) {
      const adjustedCount = this.waveManager.calculateZombieCount(group.count, wave, group.type);
      totalZombiesSpawned += adjustedCount;
    }
    const livesLostThisWave = this.waveStartLives - this.lives;

    const bonus = 50 + wave * 10;
    this.addMoney(bonus);

    // Emit wave complete event - AnalyticsState listens and handles tracking
    this.eventBus.emit(GameEvents.WAVE_COMPLETE, {
      wave,
      zombiesSpawned: totalZombiesSpawned,
      livesLost: livesLostThisWave,
    });

    // Clearing the level's final wave wins it (levels without totalWaves are endless)
    const level = this.levelManager.getCurrentLevel();
    if (level) {
      this.levelManager.recordBestWave(level.id, wave);
      if (level.totalWaves !== undefined && wave >= level.totalWaves) {
        this.victory();
      }
    }
  }

  public startNextWave(): void {
    // A finished run (won or lost) must not start another wave via debug hotkeys / dev API
    if (
      this.currentState === GameConfig.GAME_STATES.VICTORY ||
      this.currentState === GameConfig.GAME_STATES.GAME_OVER
    ) {
      return;
    }

    this.waveManager.nextWave();
    ResourceCleanupManager.cleanupWaveResources({
      projectileManager: this.projectileManager,
      effectManager: this.effectManager,
    });

    this.zombieManager.startWave();
    this.currentState = GameConfig.GAME_STATES.PLAYING;

    const wave = this.getWave();
    this.waveStartLives = this.lives;
    PerformanceMonitor.recordWaveMemory(wave);

    // WAVE_START is notification-only — startWave already owned above
    this.eventBus.emit(GameEvents.WAVE_START, { wave });
  }
}
