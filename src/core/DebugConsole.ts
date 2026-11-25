import { DevConfig } from '../config/devConfig';
import type { GameManager } from '../managers/GameManager';
import type { TimeControlManager } from '../managers/TimeControlManager';
import { DebugUtils } from '../utils/DebugUtils';
import { LogExporter } from '../utils/LogExporter';

export async function registerDebugConsoleAPIs(
  gameManager: GameManager,
  timeControlManager: TimeControlManager
): Promise<void> {
  window.LogExporter = LogExporter;

  if (import.meta.env.PROD) {
    DebugUtils.warn('⚠️ Running in production mode - server features disabled');
    DebugUtils.info('📊 LogExporter available in console (localStorage only)');
  } else {
    DebugUtils.info('📊 LogExporter available in console');
  }

  DebugUtils.info('💡 Commands:');
  DebugUtils.info('  LogExporter.viewStoredLogs() - View all stored logs');
  DebugUtils.info('  LogExporter.exportAllLogs() - Export all logs as files');
  DebugUtils.info('  LogExporter.exportAllLogsAsBundle() - Export as single bundle');
  DebugUtils.info('  LogExporter.getStoredLogCount() - Get number of stored logs');
  DebugUtils.info('  LogExporter.clearAllLogs() - Clear all stored logs');

  window.balanceTracking = {
    enable: () => gameManager.enableBalanceTracking(),
    disable: () => gameManager.disableBalanceTracking(),
    isEnabled: () => gameManager.isBalanceTrackingEnabled(),
    getReport: () => gameManager.getBalanceTrackingManager().generateReportData(),
    reset: () => gameManager.getBalanceTrackingManager().reset(),
  };
  DebugUtils.info('📊 Balance Tracking available in console');
  DebugUtils.info('💡 Balance Tracking Commands:');
  DebugUtils.info('  balanceTracking.enable() - Enable balance tracking');
  DebugUtils.info('  balanceTracking.disable() - Disable balance tracking');
  DebugUtils.info('  balanceTracking.isEnabled() - Check if tracking is enabled');
  DebugUtils.info('  balanceTracking.getReport() - Get current balance report');
  DebugUtils.info('  balanceTracking.reset() - Reset tracking data');

  if (DevConfig.DEBUG.ENABLED) {
    window.waveBalance = async () => {
      const { WaveBalancing, printWaveBalance } = await import('../config/waveBalancing');
      window.WaveBalancing = WaveBalancing;
      window.printWaveBalance = printWaveBalance;
      DebugUtils.debug('Wave balancing tools loaded!');
      DebugUtils.debug('Usage:');
      DebugUtils.debug('  printWaveBalance(1, 10) - Print balance report for waves 1-10');
      DebugUtils.debug(
        '  WaveBalancing.updateConfig({ difficultyMultiplier: 1.5 }) - Adjust difficulty'
      );
      DebugUtils.debug('  WaveBalancing.calculateZombieHealth(5) - Get zombie health for wave 5');
    };
    DebugUtils.debug('💡 Type waveBalance() in console to load wave balancing tools');
  }

  window.performanceTest = async () => {
    const { runBalancePerformanceTests, runFrameRateTest } = await import(
      '../utils/BalanceAnalysisPerformanceTest'
    );
    window.runBalancePerformanceTests = runBalancePerformanceTests;
    window.runFrameRateTest = runFrameRateTest;
    DebugUtils.debug('🔬 Performance testing tools loaded!');
    DebugUtils.debug('Usage:');
    DebugUtils.debug('  runBalancePerformanceTests() - Run all performance tests');
    DebugUtils.debug('  runFrameRateTest() - Test frame rate impact');
  };
  DebugUtils.debug('💡 Type performanceTest() in console to load performance testing tools');

  const { PerformanceMonitor } = await import('../utils/PerformanceMonitor');
  const { ResourceCleanupManager } = await import('../utils/ResourceCleanupManager');

  window.debugPerformance = () => {
    DebugUtils.debug('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    DebugUtils.debug('🔍 Performance Debug Information');
    DebugUtils.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    PerformanceMonitor.logMetrics();
    DebugUtils.debug('\n📦 Resource Cleanup State:');
    ResourceCleanupManager.logState();
    DebugUtils.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  };

  window.debugCleanup = () => {
    DebugUtils.debug('🧹 Forcing cleanup of all wave resources...');
    DebugUtils.warn('⚠️ Limited cleanup - some resources may require game restart');
    ResourceCleanupManager.cleanupPersistentEffects();
    DebugUtils.debug('✅ Cleanup complete');
  };

  window.debugToggleMonitoring = () => {
    PerformanceMonitor.toggle();
    const status = PerformanceMonitor.isEnabled() ? 'enabled' : 'disabled';
    DebugUtils.debug(`🔧 Performance monitoring ${status}`);
  };

  DebugUtils.info('📊 Performance Monitoring available in console');
  DebugUtils.info('💡 Performance Monitoring Commands:');
  DebugUtils.info('  debugPerformance() - Log current performance metrics');
  DebugUtils.info('  debugCleanup() - Force cleanup of wave resources');
  DebugUtils.info('  debugToggleMonitoring() - Enable/disable performance monitoring');

  const { TimeSpeed } = await import('../managers/TimeControlManager');

  window.timeControl = {
    pause: () => timeControlManager.pause(),
    resume: () => timeControlManager.resume(),
    toggle: () => timeControlManager.togglePause(),
    setNormal: () => timeControlManager.setSpeed(TimeSpeed.NORMAL),
    setSlow: () => timeControlManager.setSpeed(TimeSpeed.SLOW),
    setFast: () => timeControlManager.setSpeed(TimeSpeed.FAST),
    setVeryFast: () => timeControlManager.setSpeed(TimeSpeed.VERY_FAST),
    getState: () => timeControlManager.getState(),
  };
  DebugUtils.info('⏱️ Time Control available in console');
  DebugUtils.info('💡 Time Control Commands:');
  DebugUtils.info('  timeControl.pause() - Pause the game');
  DebugUtils.info('  timeControl.resume() - Resume the game');
  DebugUtils.info('  timeControl.toggle() - Toggle pause state');
  DebugUtils.info('  timeControl.setNormal() - Set 1× speed');
  DebugUtils.info('  timeControl.setSlow() - Set 0.5× speed');
  DebugUtils.info('  timeControl.setFast() - Set 2× speed');
  DebugUtils.info('  timeControl.setVeryFast() - Set 4× speed');
  DebugUtils.info('  timeControl.getState() - Get current time control state');
  DebugUtils.info('⌨️ Hotkeys: Space = pause, 1 = 1×, 2 = 0.5×, 3 = 2×, 4 = 4×');
}
