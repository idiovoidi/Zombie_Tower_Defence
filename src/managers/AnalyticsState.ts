/**
 * AnalyticsState - Contextual object that encapsulates analytics and AI managers
 *
 * This groups StatTracker, BalanceTrackingManager, and AIPlayerManager to handle
 * all analytics-related functionality in a cohesive unit.
 */

import type {
  IAIActionProvider,
  IBalanceTrackingProvider,
  IGameStateProvider,
  IStatTrackerProvider,
  ITowerStateProvider,
  IZombieStateProvider,
} from '../types/gameProviders';
import { EventBus, type EventSubscription, GameEvents } from '../utils/EventBus';
import { StatTracker } from '../utils/StatTracker';
import { AIPlayerManager } from './AIPlayerManager';
import { BalanceTrackingManager } from './BalanceTrackingManager';

interface AnalyticsConfig {
  gameManager: IGameStateProvider &
    ITowerStateProvider &
    IZombieStateProvider &
    IBalanceTrackingProvider &
    IStatTrackerProvider &
    IAIActionProvider;
  enabled?: boolean;
  eventBus?: EventBus;
}

export class AnalyticsState {
  private statTracker: StatTracker;
  private balanceTrackingManager: BalanceTrackingManager;
  private aiPlayerManager: AIPlayerManager;
  private readonly eventBus: EventBus;

  // Event subscriptions for cleanup
  private eventSubscriptions: EventSubscription[] = [];

  constructor(config: AnalyticsConfig) {
    const { gameManager } = config;
    this.eventBus = config.eventBus ?? EventBus.getInstance();

    // Initialize managers
    this.statTracker = new StatTracker(gameManager);
    this.balanceTrackingManager = new BalanceTrackingManager(gameManager);
    this.aiPlayerManager = new AIPlayerManager(gameManager);

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for wave start
    this.eventSubscriptions.push(
      this.eventBus.on(GameEvents.WAVE_START, () => {
        this.statTracker.trackWaveStart();
        if (this.balanceTrackingManager.isEnabled()) {
          this.balanceTrackingManager.trackWaveStart();
        }
      })
    );

    // Listen for wave complete
    this.eventSubscriptions.push(
      this.eventBus.on(GameEvents.WAVE_COMPLETE, data => {
        this.statTracker.trackWaveComplete();
        if (this.balanceTrackingManager.isEnabled()) {
          this.balanceTrackingManager.trackWaveComplete(data.zombiesSpawned, data.livesLost);
        }
      })
    );

    // Listen for damage dealt
    this.eventSubscriptions.push(
      this.eventBus.on(GameEvents.DAMAGE_DEALT, data => {
        this.statTracker.trackDamage(data.damage, data.towerType, data.killed, data.overkill);
        if (this.balanceTrackingManager.isEnabled()) {
          this.balanceTrackingManager.trackDamage(
            data.towerType,
            data.damage,
            data.killed,
            data.overkill
          );
        }
      })
    );

    // Listen for money earned
    this.eventSubscriptions.push(
      this.eventBus.on(GameEvents.MONEY_EARNED, amount => {
        this.statTracker.trackMoneyEarned(amount);
      })
    );

    // Listen for zombie killed (for detailed economy tracking)
    this.eventSubscriptions.push(
      this.eventBus.on(GameEvents.ZOMBIE_KILLED, data => {
        if (this.balanceTrackingManager.isEnabled()) {
          this.balanceTrackingManager.trackEconomy('EARN', data.reward);
        }
      })
    );

    // Listen for tower placed
    this.eventSubscriptions.push(
      this.eventBus.on(GameEvents.TOWER_PLACED, data => {
        this.statTracker.trackTowerBuilt(data.type, data.cost);
        if (this.balanceTrackingManager.isEnabled()) {
          this.balanceTrackingManager.trackTowerPlaced(data.type, data.cost);
        }
      })
    );

    // Listen for tower upgraded
    this.eventSubscriptions.push(
      this.eventBus.on(GameEvents.TOWER_UPGRADED, data => {
        this.statTracker.trackTowerUpgraded(data.type, data.cost, data.level);
        if (this.balanceTrackingManager.isEnabled()) {
          this.balanceTrackingManager.trackTowerUpgraded(data.type, data.cost, data.level);
        }
      })
    );

    // Listen for tower sold
    this.eventSubscriptions.push(
      this.eventBus.on(GameEvents.TOWER_SOLD, data => {
        this.statTracker.trackTowerSold(data.type, data.cost);
        if (this.balanceTrackingManager.isEnabled()) {
          this.balanceTrackingManager.trackTowerSold(data.type, data.cost);
        }
      })
    );

    // Listen for game over
    this.eventSubscriptions.push(
      this.eventBus.on(GameEvents.GAME_OVER, () => {
        if (this.balanceTrackingManager.isEnabled()) {
          this.balanceTrackingManager.performEndGameAnalysis();
        }
        if (!this.aiPlayerManager.isEnabled()) {
          this.statTracker.exportCurrentStats();
        }
      })
    );

    // Listen for victory
    this.eventSubscriptions.push(
      this.eventBus.on(GameEvents.GAME_VICTORY, () => {
        if (this.balanceTrackingManager.isEnabled()) {
          this.balanceTrackingManager.performEndGameAnalysis();
        }
      })
    );
  }

  // Manager getters
  public getStatTracker(): StatTracker {
    return this.statTracker;
  }

  public getBalanceTrackingManager(): BalanceTrackingManager {
    return this.balanceTrackingManager;
  }

  public getAIPlayerManager(): AIPlayerManager {
    return this.aiPlayerManager;
  }

  // Enable/disable tracking
  public enableBalanceTracking(): void {
    this.balanceTrackingManager.enable();
  }

  public disableBalanceTracking(): void {
    this.balanceTrackingManager.disable();
  }

  public isBalanceTrackingEnabled(): boolean {
    return this.balanceTrackingManager.isEnabled();
  }

  // AI management
  public setAIEnabled(enabled: boolean): void {
    this.aiPlayerManager.setEnabled(enabled);
    if (enabled) {
      this.statTracker.startTracking(true);
    }
  }

  public isAIEnabled(): boolean {
    return this.aiPlayerManager.isEnabled();
  }

  // Reset for new game
  public reset(aiMode = false): void {
    this.balanceTrackingManager.reset();
    this.statTracker.startTracking(aiMode);
  }

  // Update method
  public update(deltaTime: number): void {
    this.statTracker.update(deltaTime);
    this.balanceTrackingManager.update(deltaTime);
    // Note: AIPlayerManager is updated directly in main.ts with unscaled time
    // so it can make decisions even when the game is paused
  }

  /**
   * Dispose of resources and event listeners
   */
  public dispose(): void {
    // Unsubscribe from all events
    for (const sub of this.eventSubscriptions) {
      sub.unsubscribe();
    }
    this.eventSubscriptions = [];
  }
}
