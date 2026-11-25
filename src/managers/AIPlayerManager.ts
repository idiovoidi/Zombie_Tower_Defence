import { TowerConstants } from '@config/towerConstants';
import type {
  IAIActionProvider,
  IGameStateProvider,
  IStatTrackerProvider,
} from '../types/gameProviders';
import { DebugUtils } from '../utils/DebugUtils';

interface PlacementZone {
  x: number;
  y: number;
  priority: number; // Higher = better position
}

// Tower types ordered by cost (cheapest first) for budget-aware purchasing
const TOWER_PRIORITY: Array<{ type: string; cost: number }> = [
  { type: 'MachineGun', cost: TowerConstants.MACHINE_GUN.cost },
  { type: 'Shotgun', cost: TowerConstants.SHOTGUN.cost },
  { type: 'Flame', cost: TowerConstants.FLAME.cost },
  { type: 'Sludge', cost: TowerConstants.SLUDGE.cost },
  { type: 'Sniper', cost: TowerConstants.SNIPER.cost },
  { type: 'Grenade', cost: TowerConstants.GRENADE.cost },
  { type: 'Tesla', cost: TowerConstants.TESLA.cost },
].sort((a, b) => a.cost - b.cost);

// How long to wait in WAVE_COMPLETE before auto-starting the next wave (ms)
const WAVE_START_DELAY_MS = 3000;

type GameManagerDep = IGameStateProvider & IStatTrackerProvider & IAIActionProvider;

export class AIPlayerManager {
  private gameManager: GameManagerDep;
  private enabled = false;
  private updateTimer = 0;
  private updateInterval = 1.0; // Check every 1 second
  private placementZones: PlacementZone[] = [];
  private nextZoneIndex = 0; // Tracks which zone to place in next
  private lastLogTime = 0;
  private lastState = '';
  private currentWaveDecisions = 0;
  private waveCompleteEnteredAt: number | null = null;

  constructor(gameManager: GameManagerDep) {
    this.gameManager = gameManager;
    this.initializePlacementZones();
  }

  // Initialize strategic placement zones based on the path
  private initializePlacementZones(): void {
    // These zones are strategically placed to cover the default map path.
    // Priority: corners and choke points are better.
    this.placementZones = [
      // Early path coverage
      { x: 150, y: 300, priority: 10 },
      { x: 280, y: 440, priority: 9 },
      // First corner (high priority)
      { x: 280, y: 550, priority: 15 },
      { x: 350, y: 500, priority: 12 },
      // Mid path
      { x: 500, y: 500, priority: 8 },
      { x: 450, y: 350, priority: 10 },
      // Second corner (high priority)
      { x: 450, y: 250, priority: 14 },
      { x: 550, y: 250, priority: 13 },
      // Third corner (high priority)
      { x: 650, y: 300, priority: 14 },
      { x: 650, y: 450, priority: 12 },
      // Late path coverage
      { x: 750, y: 550, priority: 11 },
      { x: 850, y: 600, priority: 10 },
      // Additional coverage
      { x: 350, y: 350, priority: 7 },
      { x: 550, y: 400, priority: 7 },
      { x: 750, y: 450, priority: 8 },
    ];

    // Sort by priority (highest first)
    this.placementZones.sort((a, b) => b.priority - a.priority);
  }

  // Enable or disable the AI
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    const statTracker = this.gameManager.getStatTracker();
    if (enabled) {
      statTracker.startTracking(true);
      this.lastLogTime = Date.now();
      this.lastState = this.gameManager.getCurrentState();
      this.currentWaveDecisions = 0;
      this.waveCompleteEnteredAt = null;
      DebugUtils.debug('🤖 AI Player enabled — autoplay active');
    } else {
      this.logFinalStats();
      statTracker.exportCurrentStats();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getLastLogTime(): number {
    return this.lastLogTime;
  }

  public getLastState(): string {
    return this.lastState;
  }

  public getCurrentWaveDecisions(): number {
    return this.currentWaveDecisions;
  }

  public resetWaveDecisions(): void {
    this.currentWaveDecisions = 0;
  }

  public update(deltaTime: number): void {
    if (!this.enabled) {
      return;
    }

    this.updateTimer += deltaTime;
    if (this.updateTimer >= this.updateInterval) {
      this.updateTimer = 0;
      this.currentWaveDecisions++;

      // Check if we should log periodic stats (every 10 seconds)
      const now = Date.now();
      if (now - this.lastLogTime >= 10000) {
        this.lastLogTime = now;
        this.logPeriodicStats();
      }

      // Track state changes
      const currentState = this.gameManager.getCurrentState();
      if (currentState !== this.lastState) {
        this.lastState = currentState;
      }

      // --- Actual autoplay decisions ---
      this.trySpendMoney();
      this.tryStartNextWave(currentState);
    }
  }

  /**
   * Spend available money on towers, working through placement zones in priority order.
   * Tries the most expensive affordable tower that fits the current budget.
   * Note: money deduction is handled automatically by GameManager's tower-placed callback.
   */
  private trySpendMoney(): void {
    const money = this.gameManager.getMoney();
    if (this.nextZoneIndex >= this.placementZones.length) {
      return; // All zones filled
    }

    // Find the best tower we can afford
    const affordable = TOWER_PRIORITY.filter(t => t.cost <= money);
    if (affordable.length === 0) {
      return; // Can't afford anything yet
    }

    // Pick the most expensive affordable tower (best value for money)
    const chosen = affordable[affordable.length - 1];
    const zone = this.placementZones[this.nextZoneIndex];
    if (zone === undefined) {
      return;
    }

    const placementManager = this.gameManager.getTowerPlacementManager();

    // Enter placement mode and immediately place at the target zone.
    // GameManager's onTowerPlacedCallback handles the money deduction automatically.
    placementManager.startPlacement(chosen.type);
    const tower = placementManager.placeTower(zone.x, zone.y);

    if (tower !== null) {
      this.nextZoneIndex++;
      DebugUtils.debug(
        `🤖 AI placed ${chosen.type} at (${zone.x}, ${zone.y}) — zone ${this.nextZoneIndex}/${this.placementZones.length}`
      );
    } else {
      // Placement failed (invalid position) — cancel and skip this zone
      DebugUtils.debug(`🤖 AI placement failed at (${zone.x}, ${zone.y}), skipping zone`);
      placementManager.cancelPlacement();
      this.nextZoneIndex++;
    }
  }

  /**
   * Auto-start the next wave after a short delay once WAVE_COMPLETE is reached.
   */
  private tryStartNextWave(currentState: string): void {
    const isWaveComplete = currentState === 'WaveComplete';

    if (!isWaveComplete) {
      this.waveCompleteEnteredAt = null;
      return;
    }

    const now = Date.now();
    if (this.waveCompleteEnteredAt === null) {
      this.waveCompleteEnteredAt = now;
      DebugUtils.debug(`🤖 AI waiting ${WAVE_START_DELAY_MS / 1000}s before starting next wave…`);
      return;
    }

    if (now - this.waveCompleteEnteredAt >= WAVE_START_DELAY_MS) {
      this.waveCompleteEnteredAt = null;
      this.resetWaveDecisions();
      DebugUtils.debug(`🤖 AI starting next wave (wave ${this.gameManager.getWave() + 1})`);
      this.gameManager.startNextWave();
    }
  }

  private logPeriodicStats(): void {
    const statTracker = this.gameManager.getStatTracker();
    const stats = statTracker.getCurrentStats();
    DebugUtils.debug(
      `🤖 AI Periodic Stats — Wave: ${stats?.currentWave ?? 0}, Decisions this wave: ${this.currentWaveDecisions}, Zones filled: ${this.nextZoneIndex}/${this.placementZones.length}`
    );
  }

  private logFinalStats(): void {
    DebugUtils.debug(
      `🤖 AI Final Stats — Total decisions: ${this.currentWaveDecisions}, Zones filled: ${this.nextZoneIndex}/${this.placementZones.length}`
    );
  }
}
