/**
 * Ambient declarations for dev-only console APIs registered in
 * `src/core/DebugConsole.ts`, and for untyped third-party modules.
 */

declare module 'regression';

interface Window {
  // biome-ignore lint/suspicious/noExplicitAny: dev console helpers are loosely typed
  LogExporter?: any;
  // biome-ignore lint/suspicious/noExplicitAny: dev console helpers are loosely typed
  balanceTracking?: any;
  waveBalance?: () => Promise<void>;
  // biome-ignore lint/suspicious/noExplicitAny: dev console helpers are loosely typed
  WaveBalancing?: any;
  // biome-ignore lint/suspicious/noExplicitAny: dev console helpers are loosely typed
  printWaveBalance?: any;
  performanceTest?: () => Promise<void>;
  // biome-ignore lint/suspicious/noExplicitAny: dev console helpers are loosely typed
  runBalancePerformanceTests?: any;
  // biome-ignore lint/suspicious/noExplicitAny: dev console helpers are loosely typed
  runFrameRateTest?: any;
  // biome-ignore lint/suspicious/noExplicitAny: dev console helpers are loosely typed
  timeControl?: any;
}
