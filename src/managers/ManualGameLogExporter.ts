import { type GameLogEntry, LogExporter } from '../utils/LogExporter';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

export interface ManualGameLogInput {
  highestWave: number;
  finalMoney: number;
  finalLives: number;
  startLives: number;
  /** Balance-tracking report, when tracking was enabled for the run. */
  balanceData?: Record<string, unknown>;
}

/** Export a log file for a human-played run (AI runs are exported by AIPlayerManager). */
export function exportManualGameLog(input: ManualGameLogInput): void {
  const { highestWave, finalMoney, finalLives, startLives, balanceData } = input;

  const frameTime = PerformanceMonitor.getMetrics().frameTime || 0;
  const fps = frameTime > 0 ? Math.round(1000 / frameTime) : 60;
  const now = new Date().toISOString();

  const logEntry = {
    timestamp: now,
    sessionId: LogExporter.getSessionId(),
    isAIRun: false,
    duration: 0,
    startTime: now,
    endTime: now,
    gameData: {
      highestWave,
      finalMoney,
      finalLives,
      startLives,
      survivalRate: Number.parseFloat(((finalLives / startLives) * 100).toFixed(1)),
      livesLost: startLives - finalLives,
    },
    performanceStats: {
      waveMemorySnapshots: PerformanceMonitor.getWaveMemorySnapshots(),
      memoryGrowthRate: PerformanceMonitor.getMemoryGrowthRate(),
      averageFrameTime: frameTime,
      peakFrameTime: frameTime,
      averageFPS: fps,
      lowestFPS: fps,
    },
  } as GameLogEntry;

  LogExporter.exportLog(logEntry, balanceData);
}
