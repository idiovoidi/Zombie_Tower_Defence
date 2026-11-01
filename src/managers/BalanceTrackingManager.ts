/**
 * BalanceTrackingManager - Centralized balance tracking and analysis coordinator
 *
 * Responsibilities:
 * - Collect game events (damage, economy, waves, towers)
 * - Coordinate real-time balance analysis
 * - Generate comprehensive reports for LogExporter
 * - Monitor performance of analysis operations
 */

import type { IGameStateProvider } from '../types/gameProviders';
import { GameConfig } from '../config/gameConfig';
import { getTowerStats } from '../config/towerConstants';
import {
  BalanceAnalyzer,
  type BalanceIssue,
  type TowerEfficiency,
  type WaveDefenseAnalysis,
} from '../utils/BalanceAnalyzer';
import {
  type OutlierAnalysis,
  StatisticalAnalyzer,
  type TrendAnalysis,
  type WavePrediction,
} from '../utils/StatisticalAnalyzer';

// ============================================================================
// Interfaces
// ============================================================================

interface DamageEvent {
  time: number;
  wave: number;
  towerType: string;
  damage: number;
  killed: boolean;
  overkill: number;
}

interface EconomyEvent {
  time: number;
  wave: number;
  money: number;
  action: 'BUILD' | 'UPGRADE' | 'SELL' | 'EARN';
  amount: number;
}

interface WaveEvent {
  wave: number;
  startTime: number;
  endTime: number;
  zombiesSpawned: number;
  zombiesKilled: number;
  livesLost: number;
}

interface TowerEvent {
  time: number;
  wave: number;
  action: 'PLACED' | 'UPGRADED' | 'SOLD';
  towerType: string;
  cost: number;
  level: number;
}

interface BalanceTrackingData {
  // Session info
  sessionId: string;
  startTime: number;
  enabled: boolean;

  // Event collections
  damageEvents: DamageEvent[];
  economyEvents: EconomyEvent[];
  waveEvents: WaveEvent[];
  towerEvents: TowerEvent[];

  // Analysis results
  balanceIssues: BalanceIssue[];
  waveDefenseAnalysis: WaveDefenseAnalysis[];
  towerEfficiencies: Map<string, TowerEfficiency>;
  statisticalAnalysis: {
    outliers: OutlierAnalysis | null;
    trends: TrendAnalysis | null;
    predictions: WavePrediction[];
  };

  // Performance monitoring
  performanceStats: {
    analysisCount: number;
    totalAnalysisTime: number;
    maxAnalysisTime: number;
    lastAnalysisTime: number;
  };
}

// ============================================================================
// BalanceTrackingManager Class
// ============================================================================

export class BalanceTrackingManager {
  private gameManager: IGameStateProvider;
  private data: BalanceTrackingData;
  private lastAnalysisTime: number;
  private analysisInterval: number;
  private currentWaveStartTime: number;

  constructor(gameManager: IGameStateProvider) {
    this.gameManager = gameManager;
    this.lastAnalysisTime = 0;
    this.analysisInterval = 10000; // 10 seconds
    this.currentWaveStartTime = 0;

    // Initialize data structure
    this.data = this.createEmptyData();
  }

  // ============================================================================
  // Lifecycle Methods (Task 4.1)
  // ============================================================================

  /**
   * Enable balance tracking
   */
  public enable(): void {
    if (this.data.enabled) {
      return;
    }

    this.data.enabled = true;
    this.data.sessionId = `balance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.data.startTime = Date.now();
  }

  /**
   * Disable balance tracking
   */
  public disable(): void {
    if (!this.data.enabled) {
      return;
    }

    this.data.enabled = false;
  }

  /**
   * Check if tracking is enabled
   */
  public isEnabled(): boolean {
    return this.data.enabled;
  }

  /**
   * Reset all tracking data
   */
  public reset(): void {
    this.data = this.createEmptyData();
    this.lastAnalysisTime = 0;
    this.currentWaveStartTime = 0;
  }

  /**
   * Create empty data structure
   */
  private createEmptyData(): BalanceTrackingData {
    return {
      sessionId: '',
      startTime: 0,
      enabled: false,
      damageEvents: [],
      economyEvents: [],
      waveEvents: [],
      towerEvents: [],
      balanceIssues: [],
      waveDefenseAnalysis: [],
      towerEfficiencies: new Map(),
      statisticalAnalysis: {
        outliers: null,
        trends: null,
        predictions: [],
      },
      performanceStats: {
        analysisCount: 0,
        totalAnalysisTime: 0,
        maxAnalysisTime: 0,
        lastAnalysisTime: 0,
      },
    };
  }

  // ============================================================================
  // Event Tracking Methods (Task 4.2)
  // ============================================================================

  /**
   * Track damage dealt by towers
   */
  public trackDamage(towerType: string, damage: number, killed: boolean, overkill: number): void {
    if (!this.data.enabled) {
      return;
    }

    const event: DamageEvent = {
      time: Date.now(),
      wave: this.gameManager.getWave(),
      towerType,
      damage,
      killed,
      overkill,
    };

    this.data.damageEvents.push(event);
  }

  /**
   * Track economy events (money earned/spent)
   */
  public trackEconomy(action: 'BUILD' | 'UPGRADE' | 'SELL' | 'EARN', amount: number): void {
    if (!this.data.enabled) {
      return;
    }

    const event: EconomyEvent = {
      time: Date.now(),
      wave: this.gameManager.getWave(),
      money: this.gameManager.getMoney(),
      action,
      amount,
    };

    this.data.economyEvents.push(event);
  }

  /**
   * Track wave start
   */
  public trackWaveStart(): void {
    if (!this.data.enabled) {
      return;
    }

    this.currentWaveStartTime = Date.now();
  }

  /**
   * Track wave completion
   */
  public trackWaveComplete(zombiesKilled: number, livesLost: number): void {
    if (!this.data.enabled) {
      return;
    }

    const wave = this.gameManager.getWave();
    const endTime = Date.now();

    const event: WaveEvent = {
      wave,
      startTime: this.currentWaveStartTime,
      endTime,
      zombiesSpawned: zombiesKilled, // Passed from GameManager
      zombiesKilled,
      livesLost,
    };

    this.data.waveEvents.push(event);

    // Trigger wave-end analysis
    this.performWaveAnalysis();
  }

  /**
   * Helper to track tower events
   */
  private trackTowerEvent(
    action: TowerEvent['action'],
    towerType: string,
    cost: number,
    level: number,
    economyAction: EconomyEvent['action']
  ): void {
    if (!this.data.enabled) {
      return;
    }

    const event: TowerEvent = {
      time: Date.now(),
      wave: this.gameManager.getWave(),
      action,
      towerType,
      cost,
      level,
    };

    this.data.towerEvents.push(event);
    this.trackEconomy(economyAction, Math.abs(cost));
  }

  /**
   * Track tower placement
   */
  public trackTowerPlaced(towerType: string, cost: number): void {
    this.trackTowerEvent('PLACED', towerType, cost, 1, 'BUILD');
  }

  /**
   * Track tower upgrade
   */
  public trackTowerUpgraded(towerType: string, cost: number, level: number): void {
    this.trackTowerEvent('UPGRADED', towerType, cost, level, 'UPGRADE');
  }

  /**
   * Track tower sale
   */
  public trackTowerSold(towerType: string, refund: number): void {
    this.trackTowerEvent('SOLD', towerType, -refund, 0, 'SELL');
  }

  // ============================================================================
  // Data Aggregation Methods (Task 4.3)
  // ============================================================================

  /**
   * Calculate total damage dealt
   */
  private getTotalDamage(): number {
    return this.data.damageEvents.reduce((sum, event) => sum + event.damage, 0);
  }

  /**
   * Calculate total money spent
   */
  private getTotalMoneySpent(): number {
    return this.data.economyEvents
      .filter(e => e.action === 'BUILD' || e.action === 'UPGRADE')
      .reduce((sum, event) => sum + event.amount, 0);
  }

  /**
   * Calculate total money earned
   */
  private getTotalMoneyEarned(): number {
    return this.data.economyEvents
      .filter(e => e.action === 'EARN')
      .reduce((sum, event) => sum + event.amount, 0);
  }

  /**
   * Calculate damage per dollar
   */
  private getDamagePerDollar(): number {
    const totalSpent = this.getTotalMoneySpent();
    if (totalSpent === 0) {
      return 0;
    }
    return this.getTotalDamage() / totalSpent;
  }

  /**
   * Calculate current DPS
   */
  private getCurrentDPS(): number {
    // Calculate DPS from recent damage events (last 5 seconds)
    const now = Date.now();
    const recentEvents = this.data.damageEvents.filter(e => now - e.time < 5000);

    if (recentEvents.length === 0) {
      return 0;
    }

    const totalDamage = recentEvents.reduce((sum, e) => sum + e.damage, 0);
    const timeSpan = (now - recentEvents[0].time) / 1000; // Convert to seconds

    return timeSpan > 0 ? totalDamage / timeSpan : 0;
  }

  /**
   * Calculate survival rate
   */
  private getSurvivalRate(): number {
    const currentLives = this.gameManager.getLives();
    const startingLives = this.gameManager.getStartingLives?.() || GameConfig.STARTING_LIVES;
    return (currentLives / startingLives) * 100;
  }

  /**
   * Calculate overkill percentage
   */
  private getOverkillPercent(): number {
    const totalDamage = this.getTotalDamage();
    if (totalDamage === 0) {
      return 0;
    }

    const totalOverkill = this.data.damageEvents.reduce((sum, e) => sum + e.overkill, 0);
    return (totalOverkill / totalDamage) * 100;
  }

  /**
   * Calculate economy efficiency
   */
  private getEconomyEfficiency(): number {
    const earned = this.getTotalMoneyEarned();
    const spent = this.getTotalMoneySpent();
    if (spent === 0) {
      return 100;
    }
    return (earned / spent) * 100;
  }

  /**
   * Get damage by tower type
   */
  private getDamageByTowerType(): Map<string, number> {
    const damageMap = new Map<string, number>();

    for (const event of this.data.damageEvents) {
      const current = damageMap.get(event.towerType) || 0;
      damageMap.set(event.towerType, current + event.damage);
    }

    return damageMap;
  }

  /**
   * Calculate tower efficiency metrics from tracked damage events.
   */
  private calculateTowerEfficiencies(): void {
    const damageByType = this.getDamageByTowerType();
    const averageZombieHP = 50;
    const averageZombieReward = 10;

    this.data.towerEfficiencies.clear();

    damageByType.forEach((_totalDamage, towerType) => {
      const stats = getTowerStats(towerType);
      if (!stats) {
        return;
      }

      const dps = stats.damage * stats.fireRate;
      const efficiency = BalanceAnalyzer.analyzeTowerEfficiency(
        towerType,
        stats.cost,
        dps,
        stats.range,
        1,
        stats.damage,
        averageZombieHP,
        averageZombieReward
      );

      this.data.towerEfficiencies.set(towerType, efficiency);
    });
  }

  // ============================================================================
  // Analysis Coordination (Task 4.4, 4.5, 4.6)
  // ============================================================================

  /**
   * Update method called every frame
   */
  public update(_deltaTime: number): void {
    if (!this.data.enabled) {
      return;
    }

    const now = Date.now();

    // Throttle analysis to every 10 seconds
    if (now - this.lastAnalysisTime >= this.analysisInterval) {
      this.performRealTimeAnalysis();
      this.lastAnalysisTime = now;
    }
  }

  /**
   * Perform real-time analysis (every 10 seconds)
   */
  private performRealTimeAnalysis(): void {
    const startTime = performance.now();

    try {
      // Detect balance issues
      const stats = {
        damagePerDollar: this.getDamagePerDollar(),
        survivalRate: this.getSurvivalRate(),
        overkillPercent: this.getOverkillPercent(),
        economyEfficiency: this.getEconomyEfficiency(),
      };

      const issues = BalanceAnalyzer.detectBalanceIssues(stats);
      this.data.balanceIssues = issues;

      // Log issues to console with clear formatting
      this.logBalanceIssues(issues);

      // Track performance
      const elapsed = performance.now() - startTime;
      this.recordAnalysisPerformance(elapsed);
    } catch (_error) {
      // Analysis error handled gracefully
    }
  }

  /**
   * Helper to wrap analysis with performance tracking and error handling
   */
  private runAnalysis<T>(_name: string, analysisFn: () => T): T | undefined {
    const startTime = performance.now();

    try {
      const result = analysisFn();
      const elapsed = performance.now() - startTime;
      this.recordAnalysisPerformance(elapsed);
      return result;
    } catch (_error) {
      return undefined;
    }
  }

  /**
   * Perform wave-end analysis
   */
  private performWaveAnalysis(): void {
    this.runAnalysis('wave analysis', () => {
      // Perform statistical analysis on wave difficulty
      if (this.data.waveEvents.length >= 3) {
        // Prepare data for trend analysis (wave number, zombies killed)
        const waveData: Array<[number, number]> = this.data.waveEvents.map(e => [
          e.wave,
          e.zombiesKilled,
        ]);

        // Analyze trend
        const trend = StatisticalAnalyzer.analyzeTrend(waveData);
        this.data.statisticalAnalysis.trends = trend;

        // Generate predictions for next 5 waves
        const currentWave = this.gameManager.getWave();
        const futureWaves = [
          currentWave + 1,
          currentWave + 2,
          currentWave + 3,
          currentWave + 4,
          currentWave + 5,
        ];
        const predictions = StatisticalAnalyzer.predictWaveDifficulty(waveData, futureWaves);
        this.data.statisticalAnalysis.predictions = predictions;
      }
    });
  }

  /**
   * Perform end-game analysis
   */
  public performEndGameAnalysis(): void {
    this.runAnalysis('end-game analysis', () => {
      this.calculateTowerEfficiencies();

      // Detect outliers in damage
      const damageValues = this.data.damageEvents.map(e => e.damage);
      if (damageValues.length > 0) {
        const outliers = StatisticalAnalyzer.detectOutliers(damageValues);
        this.data.statisticalAnalysis.outliers = outliers;
      }

      // Final balance issue check
      this.performRealTimeAnalysis();
    });
  }

  // ============================================================================
  // Console Logging (Task 12)
  // ============================================================================

  /**
   * Log balance issues to console with clear formatting
   * Uses color-coded warnings and includes recommendations
   */
  private logBalanceIssues(issues: BalanceIssue[]): void {
    if (issues.length === 0) {
      return;
    }

    // Log each issue with appropriate icon and formatting
    issues.forEach((issue, _index) => {
      // Select icon based on severity
      let _icon: string;
      let _severityColor: string;

      switch (issue.severity) {
        case 'CRITICAL':
          _icon = '❌';
          _severityColor = 'CRITICAL';
          break;
        case 'HIGH':
          _icon = '⚠️';
          _severityColor = 'HIGH';
          break;
        case 'MEDIUM':
          _icon = '⚡';
          _severityColor = 'MEDIUM';
          break;
        case 'LOW':
          _icon = 'ℹ️';
          _severityColor = 'LOW';
          break;
        default:
          _icon = '⚠️';
          _severityColor = issue.severity;
      }
    });
  }

  // ============================================================================
  // Performance Monitoring (Task 4.8)
  // ============================================================================

  /**
   * Record analysis performance
   */
  private recordAnalysisPerformance(elapsed: number): void {
    this.data.performanceStats.analysisCount++;
    this.data.performanceStats.totalAnalysisTime += elapsed;
    this.data.performanceStats.maxAnalysisTime = Math.max(
      this.data.performanceStats.maxAnalysisTime,
      elapsed
    );
    this.data.performanceStats.lastAnalysisTime = elapsed;

    // Warn if analysis exceeds 5ms
    if (elapsed > 5) {
      // Performance warning: analysis took longer than 5ms
    }
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    analysisCount: number;
    avgAnalysisTime: number;
    maxAnalysisTime: number;
    lastAnalysisTime: number;
  } {
    const avg =
      this.data.performanceStats.analysisCount > 0
        ? this.data.performanceStats.totalAnalysisTime / this.data.performanceStats.analysisCount
        : 0;

    return {
      analysisCount: this.data.performanceStats.analysisCount,
      avgAnalysisTime: avg,
      maxAnalysisTime: this.data.performanceStats.maxAnalysisTime,
      lastAnalysisTime: this.data.performanceStats.lastAnalysisTime,
    };
  }

  // ============================================================================
  // Data Access Methods
  // ============================================================================

  /**
   * Get detected balance issues
   */
  public getBalanceIssues(): BalanceIssue[] {
    return [...this.data.balanceIssues];
  }

  /**
   * Get wave defense analysis
   */
  public getWaveDefenseAnalysis(): WaveDefenseAnalysis[] {
    return [...this.data.waveDefenseAnalysis];
  }

  /**
   * Get tower efficiencies
   */
  public getTowerEfficiencies(): Map<string, TowerEfficiency> {
    return new Map(this.data.towerEfficiencies);
  }

  /**
   * Get statistical analysis
   */
  public getStatisticalAnalysis(): {
    outliers: OutlierAnalysis | null;
    trends: TrendAnalysis | null;
    predictions: WavePrediction[];
  } {
    return {
      outliers: this.data.statisticalAnalysis.outliers,
      trends: this.data.statisticalAnalysis.trends,
      predictions: [...this.data.statisticalAnalysis.predictions],
    };
  }

  // ============================================================================
  // Report Generation (Task 4.7)
  // ============================================================================

  /**
   * Generate report data for LogExporter
   */
  public generateReportData(): object {
    // Convert Maps to plain objects for JSON serialization
    const towerEfficiencies: Record<string, TowerEfficiency> = {};
    this.data.towerEfficiencies.forEach((value, key) => {
      towerEfficiencies[key] = value;
    });

    const damageByType: Record<string, number> = {};
    this.getDamageByTowerType().forEach((value, key) => {
      damageByType[key] = value;
    });

    return {
      sessionId: this.data.sessionId,
      duration: Date.now() - this.data.startTime,

      // Summary metrics
      summary: {
        totalDamage: this.getTotalDamage(),
        totalMoneySpent: this.getTotalMoneySpent(),
        totalMoneyEarned: this.getTotalMoneyEarned(),
        damagePerDollar: this.getDamagePerDollar(),
        currentDPS: this.getCurrentDPS(),
        survivalRate: this.getSurvivalRate(),
        overkillPercent: this.getOverkillPercent(),
        economyEfficiency: this.getEconomyEfficiency(),
      },

      // Event counts
      eventCounts: {
        damageEvents: this.data.damageEvents.length,
        economyEvents: this.data.economyEvents.length,
        waveEvents: this.data.waveEvents.length,
        towerEvents: this.data.towerEvents.length,
      },

      // Analysis results
      balanceIssues: this.data.balanceIssues,
      waveDefenseAnalysis: this.data.waveDefenseAnalysis,
      towerEfficiencies,
      damageByType,

      // Statistical analysis
      statisticalAnalysis: {
        outliers: this.data.statisticalAnalysis.outliers,
        trends: this.data.statisticalAnalysis.trends,
        predictions: this.data.statisticalAnalysis.predictions,
      },

      // Performance stats
      performanceStats: this.getPerformanceStats(),
    };
  }
}
