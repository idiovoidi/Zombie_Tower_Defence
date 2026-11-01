import { DebugConstants } from '../config/debugConstants';
import { DevConfig } from '../config/devConfig';
import type { GameManager } from '../managers/GameManager';
import type { TimeControlManager } from '../managers/TimeControlManager';
import { lightingManager } from '../renderers/lighting/LightingManager';
import { DebugUtils } from '../utils/DebugUtils';
import type { PathDebugOverlay } from './PathDebugOverlay';
import type { TowerRangeDebugOverlay } from './TowerRangeDebugOverlay';

export interface DevToolsContext {
  gameManager: GameManager;
  timeControlManager: TimeControlManager;
  pathOverlay: PathDebugOverlay;
  rangeOverlay: TowerRangeDebugOverlay;
  refreshPathOverlay: () => void;
}

declare global {
  interface Window {
    dev?: DevApi;
  }
}

export interface DevApi {
  help: () => void;
  money: (amount?: number) => void;
  lives: (amount?: number) => void;
  killAll: () => void;
  nextWave: () => void;
  god: (enabled?: boolean) => boolean;
  oneHitKill: (enabled?: boolean) => boolean;
  waypoints: (enabled?: boolean) => boolean;
  ranges: (enabled?: boolean) => boolean;
  healthBars: (enabled?: boolean) => boolean;
  /** Move the scene light: angle = degrees CCW from +X (45 = top-right), elevation 15-90. */
  light: (angleDeg?: number, elevationDeg?: number) => { angleDeg: number; elevationDeg: number };
  dump: () => Record<string, unknown>;
  constants: typeof DebugConstants;
  config: typeof DevConfig;
}

/**
 * Single console entrypoint: type `dev.help()` in the browser console.
 */
export function registerDevApi(ctx: DevToolsContext): DevApi {
  const refreshRanges = (): void => {
    ctx.rangeOverlay.update(ctx.gameManager.getTowerCombatManager().getTowers());
  };

  const api: DevApi = {
    help: () => {
      DebugUtils.info(
        `
🛠️ window.dev — QOL cheats (also see URL params in debugConstants.ts header)
  dev.money(5000)       Add money (default 5000)
  dev.lives(10)         Add lives
  dev.killAll()         Kill all zombies
  dev.nextWave()        Start next wave (when wave complete)
  dev.light(45, 50)     Move the scene light (angle deg CCW from right, elevation 15-90)
  dev.god()             Toggle / set god mode (no game over)
  dev.oneHitKill()      Toggle / set one-hit kill
  dev.waypoints()       Toggle path waypoint overlay
  dev.ranges()          Toggle all tower range overlay
  dev.healthBars()      Toggle zombie health bars
  dev.dump()            Snapshot current debug flags + game state
  dev.constants         Live DebugConstants object
  Hotkeys (debug on): M money, L lives, K kill, N next wave, U max upgrade
                      G god, R ranges, W waypoints, H help, Ctrl+D scale debug
      `.trim()
      );
    },

    money: (amount = 5000) => {
      ctx.gameManager.addMoney(amount);
      DebugUtils.debug(`💰 Added $${amount} (Total: $${ctx.gameManager.getMoney()})`);
    },

    lives: (amount = 10) => {
      ctx.gameManager.addLives(amount);
      DebugUtils.debug(`❤️ Added ${amount} lives (Total: ${ctx.gameManager.getLives()})`);
    },

    killAll: () => {
      const zombies = ctx.gameManager.getZombieManager().getZombies();
      let killed = 0;
      for (const zombie of zombies) {
        if (zombie.parent) {
          zombie.takeDamage(999999);
          killed++;
        }
      }
      DebugUtils.debug(`💀 Killed ${killed} zombies`);
    },

    nextWave: () => {
      ctx.gameManager.startNextWave();
      DebugUtils.debug('🌊 Started next wave');
    },

    god: (enabled?: boolean) => {
      DebugConstants.DISABLE_GAME_OVER =
        enabled === undefined ? !DebugConstants.DISABLE_GAME_OVER : enabled;
      DebugUtils.debug(`🛡️ God mode ${DebugConstants.DISABLE_GAME_OVER ? 'ON' : 'OFF'}`);
      return DebugConstants.DISABLE_GAME_OVER;
    },

    oneHitKill: (enabled?: boolean) => {
      DebugConstants.ONE_HIT_KILL = enabled === undefined ? !DebugConstants.ONE_HIT_KILL : enabled;
      DebugUtils.debug(`⚔️ One-hit kill ${DebugConstants.ONE_HIT_KILL ? 'ON' : 'OFF'}`);
      return DebugConstants.ONE_HIT_KILL;
    },

    waypoints: (enabled?: boolean) => {
      DebugConstants.SHOW_WAYPOINTS =
        enabled === undefined ? !DebugConstants.SHOW_WAYPOINTS : enabled;
      ctx.refreshPathOverlay();
      DebugUtils.debug(`📍 Waypoints ${DebugConstants.SHOW_WAYPOINTS ? 'ON' : 'OFF'}`);
      return DebugConstants.SHOW_WAYPOINTS;
    },

    ranges: (enabled?: boolean) => {
      DebugConstants.SHOW_TOWER_RANGES =
        enabled === undefined ? !DebugConstants.SHOW_TOWER_RANGES : enabled;
      refreshRanges();
      DebugUtils.debug(`📡 Tower ranges ${DebugConstants.SHOW_TOWER_RANGES ? 'ON' : 'OFF'}`);
      return DebugConstants.SHOW_TOWER_RANGES;
    },

    healthBars: (enabled?: boolean) => {
      DebugConstants.SHOW_ZOMBIE_HEALTH_BARS =
        enabled === undefined ? !DebugConstants.SHOW_ZOMBIE_HEALTH_BARS : enabled;
      DebugUtils.debug(`🩺 Health bars ${DebugConstants.SHOW_ZOMBIE_HEALTH_BARS ? 'ON' : 'OFF'}`);
      return DebugConstants.SHOW_ZOMBIE_HEALTH_BARS;
    },

    light: (angleDeg, elevationDeg) => {
      if (angleDeg !== undefined) {
        lightingManager.setLightDirection(angleDeg, elevationDeg);
      }
      return {
        angleDeg: lightingManager.getAngleDeg(),
        elevationDeg: lightingManager.getElevationDeg(),
      };
    },

    dump: () => ({
      enabled: DebugConstants.ENABLED,
      wave: ctx.gameManager.getWave(),
      money: ctx.gameManager.getMoney(),
      lives: ctx.gameManager.getLives(),
      state: ctx.gameManager.getCurrentState(),
      time: ctx.timeControlManager.getState(),
      flags: {
        SHOW_WAYPOINTS: DebugConstants.SHOW_WAYPOINTS,
        SHOW_TOWER_RANGES: DebugConstants.SHOW_TOWER_RANGES,
        SHOW_ZOMBIE_HEALTH_BARS: DebugConstants.SHOW_ZOMBIE_HEALTH_BARS,
        DISABLE_GAME_OVER: DebugConstants.DISABLE_GAME_OVER,
        ONE_HIT_KILL: DebugConstants.ONE_HIT_KILL,
        TOWER_COST_MULTIPLIER: DebugConstants.TOWER_COST_MULTIPLIER,
        ZOMBIE_HEALTH_MULTIPLIER: DebugConstants.ZOMBIE_HEALTH_MULTIPLIER,
        GAME_SPEED_MULTIPLIER: DebugConstants.GAME_SPEED_MULTIPLIER,
      },
      testing: { ...DevConfig.TESTING },
    }),

    constants: DebugConstants,
    config: DevConfig,
  };

  window.dev = api;
  DebugUtils.info('🛠️ Dev tools ready — type dev.help() in the console');
  return api;
}
