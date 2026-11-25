import { DebugConstants } from '../config/debugConstants';
import { GameConfig } from '../config/gameConfig';
import type { GameManager } from '../managers/GameManager';
import type { InputManager } from '../managers/InputManager';
import type { Tower } from '../objects/Tower';
import { DebugUtils } from '../utils/DebugUtils';
import type { ScaleManager } from '../utils/ScaleManager';

export interface DebugHotkeyHooks {
  refreshPathOverlay: () => void;
  refreshRangeOverlay: () => void;
}

export function bindDebugHotkeys(
  inputManager: InputManager,
  gameManager: GameManager,
  scaleManager: ScaleManager,
  hooks?: DebugHotkeyHooks
): void {
  // Toggle scale debug (Ctrl+D)
  window.addEventListener('keydown', event => {
    if (event.key.toLowerCase() === 'd' && event.ctrlKey) {
      const currentDebug = !inputManager.isDebugMode();
      inputManager.setDebugMode(currentDebug);
      DebugUtils.debug(
        `🔧 Scale debug ${currentDebug ? 'enabled' : 'disabled'}:`,
        scaleManager.getDebugInfo()
      );
    }
  });

  inputManager.onKeyDown((_key, event) => {
    if (!DebugConstants.ENABLED) return;

    const key = event.key.toLowerCase();

    // M - Add money
    if (key === 'm') {
      const amount = event.shiftKey ? 20000 : 5000;
      gameManager.addMoney(amount);
      DebugUtils.debug(`💰 Added $${amount} (Total: $${gameManager.getMoney()})`);
      return;
    }

    // L - Add lives
    if (key === 'l') {
      const amount = event.shiftKey ? 100 : 10;
      gameManager.addLives(amount);
      DebugUtils.debug(`❤️ Added ${amount} lives (Total: ${gameManager.getLives()})`);
      return;
    }

    // N - Skip to next wave
    if (key === 'n') {
      if (gameManager.getCurrentState() === GameConfig.GAME_STATES.WAVE_COMPLETE) {
        gameManager.startNextWave();
        DebugUtils.debug('🌊 Started next wave');
      } else {
        DebugUtils.debug('⚠️ Can only skip to next wave during wave complete state');
      }
      return;
    }

    // K - Kill all zombies
    if (key === 'k') {
      const zombieManager = gameManager.getZombieManager();
      const zombies = zombieManager.getZombies();
      let killed = 0;
      zombies.forEach(zombie => {
        if (zombie.parent) {
          zombie.takeDamage(999999);
          killed++;
        }
      });
      DebugUtils.debug(`💀 Killed ${killed} zombies`);
      return;
    }

    // U - Upgrade all towers to max
    if (key === 'u') {
      const combatManager = gameManager.getTowerCombatManager();
      const towers = combatManager.getTowers();
      let upgraded = 0;
      towers.forEach((tower: Tower) => {
        while (tower.canUpgrade()) {
          tower.upgrade();
          upgraded++;
        }
      });
      DebugUtils.debug(`⬆️ Upgraded ${upgraded} tower levels`);
      hooks?.refreshRangeOverlay();
      return;
    }

    // G - Toggle god mode
    if (key === 'g') {
      DebugConstants.DISABLE_GAME_OVER = !DebugConstants.DISABLE_GAME_OVER;
      DebugUtils.debug(`🛡️ God mode ${DebugConstants.DISABLE_GAME_OVER ? 'ON' : 'OFF'}`);
      return;
    }

    // R - Toggle tower ranges overlay
    if (key === 'r') {
      DebugConstants.SHOW_TOWER_RANGES = !DebugConstants.SHOW_TOWER_RANGES;
      hooks?.refreshRangeOverlay();
      DebugUtils.debug(`📡 Tower ranges ${DebugConstants.SHOW_TOWER_RANGES ? 'ON' : 'OFF'}`);
      return;
    }

    // W - Toggle waypoint overlay
    if (key === 'w') {
      DebugConstants.SHOW_WAYPOINTS = !DebugConstants.SHOW_WAYPOINTS;
      hooks?.refreshPathOverlay();
      DebugUtils.debug(`📍 Waypoints ${DebugConstants.SHOW_WAYPOINTS ? 'ON' : 'OFF'}`);
      return;
    }

    // B - Toggle zombie health bars
    if (key === 'b') {
      DebugConstants.SHOW_ZOMBIE_HEALTH_BARS = !DebugConstants.SHOW_ZOMBIE_HEALTH_BARS;
      DebugUtils.debug(`🩺 Health bars ${DebugConstants.SHOW_ZOMBIE_HEALTH_BARS ? 'ON' : 'OFF'}`);
      return;
    }

    // H - Show debug help
    if (key === 'h') {
      DebugUtils.debug('🔧 Debug Hotkeys:');
      DebugUtils.debug('  M / Shift+M - Add $5000 / $20000');
      DebugUtils.debug('  L / Shift+L - Add 10 / 100 lives');
      DebugUtils.debug('  N - Next wave (when wave complete)');
      DebugUtils.debug('  K - Kill all zombies');
      DebugUtils.debug('  U - Upgrade all towers to max');
      DebugUtils.debug('  G - Toggle god mode');
      DebugUtils.debug('  R - Toggle tower ranges');
      DebugUtils.debug('  W - Toggle path waypoints');
      DebugUtils.debug('  B - Toggle zombie health bars');
      DebugUtils.debug('  H - Show this help');
      DebugUtils.debug('  Ctrl+D - Toggle scale debug');
      DebugUtils.debug('  Console: dev.help()');
    }
  });
}
