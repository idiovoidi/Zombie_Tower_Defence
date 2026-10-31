/**
 * Provider interfaces for analytics / AI — keep this module a leaf.
 * Do not import concrete classes from objects/ or utils/ (breaks boundaries + causes cycles).
 */

/**
 * Core game state — money, lives, wave, and game status.
 * Wave number is owned by WaveManager; GameManager.getWave() delegates to it.
 */
export interface IGameStateProvider {
  getMoney(): number;
  getLives(): number;
  getWave(): number;
  getCurrentState(): string;
  /** Lives the current run began with (levels differ). Optional for lightweight test doubles. */
  getStartingLives?(): number;
}

/**
 * Tower population for analytics (counts only — no Tower class import).
 */
export interface ITowerStateProvider {
  getPlacedTowerCount(): number;
}

/**
 * Zombie population for analytics (counts only — no Zombie class import).
 */
export interface IZombieStateProvider {
  getZombieCount(): number;
}

/**
 * Minimal balance-tracking surface used by StatTracker without importing BalanceTrackingManager.
 */
export interface BalanceTrackingReporter {
  isEnabled(): boolean;
  generateReportData(): unknown;
}

/**
 * Balance tracking access for analytics systems.
 */
export interface IBalanceTrackingProvider {
  getBalanceTrackingManager(): BalanceTrackingReporter;
}

/**
 * Snapshot returned by IStatTracker.getCurrentStats().
 */
export interface StatTrackerSnapshot {
  currentWave: number;
  highestWave: number;
  currentMoney: number;
  currentLives: number;
  totalDamage: number;
  averageDPS: number;
  peakDPS: number;
  totalKills: number;
  accuracy: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  economyEfficiency: number;
  damagePerDollar: number;
  killsPerDollar: number;
}

/**
 * Narrow stat-tracker surface for AI / UI / providers (no concrete StatTracker import).
 */
export interface IStatTracker {
  startTracking(aiModeEnabled?: boolean): void;
  setAIModeEnabled(enabled: boolean): void;
  trackTowerBuilt(towerType: string, cost: number): void;
  getCurrentStats(): StatTrackerSnapshot;
  exportCurrentStats(): void;
  isActive(): boolean;
}

/**
 * Stat tracker access for analytics and AI systems.
 */
export interface IStatTrackerProvider {
  getStatTracker(): IStatTracker;
}

/**
 * AI action interface — placing towers and starting waves.
 */
export interface IAIActionProvider {
  getTowerPlacementManager(): {
    startPlacement(type: string): void;
    placeTower(x: number, y: number): unknown;
    cancelPlacement(): void;
    isInPlacementMode(): boolean;
  };
  startNextWave(): void;
}
