/**
 * Debug Constants - Easy to modify values for testing and debugging
 *
 * Change these values to quickly test different game scenarios.
 * Multipliers default to 1.0 (neutral): the base balance already contains the tuned values,
 * so dev builds play like production unless you change something here.
 * These override the default game config values when ENABLED is true.
 *
 * Runtime without editing this file:
 *   - Console: `dev.help()`
 *   - URL: `?wave=10&money=99999&waypoints=1&ranges=1&god=1&ohk=1&skipMenu=0&level=level2&speed=2`
 *   - Hotkeys: H for list (when ENABLED)
 */

export const DebugConstants = {
  // Debug overrides apply only in local dev builds (never in production or tests),
  // so shipped games and the test suite always use the real balance values.
  ENABLED: import.meta.env.DEV && import.meta.env.MODE !== 'test',

  // Starting Resources
  STARTING_MONEY: 1000, // Default: 1000
  STARTING_LIVES: 100, // Default: 100 (survivors)
  STARTING_WOOD: 1000, // Default: 0
  STARTING_METAL: 1000, // Default: 0
  STARTING_ENERGY: 100, // Default: 100

  // Resource Generation (per second)
  WOOD_GENERATION_RATE: 10, // Default: 1
  METAL_GENERATION_RATE: 5, // Default: 0.5
  ENERGY_GENERATION_RATE: 2, // Default: 1

  // Tower Costs (set to 0 for free towers)
  TOWER_COST_MULTIPLIER: 1.0, // Multiply all tower costs by this (1.0 = normal, 0 = free)
  UPGRADE_COST_MULTIPLIER: 1.0, // Multiply all upgrade costs by this

  // Tower Stats — keep at 1.0 so "unupgraded" towers aren't secretly buffed in debug
  TOWER_DAMAGE_MULTIPLIER: 1.0,
  TOWER_RANGE_MULTIPLIER: 1.0, // Multiply all tower range by this
  TOWER_FIRE_RATE_MULTIPLIER: 1.0,

  // Zombie Stats
  ZOMBIE_HEALTH_MULTIPLIER: 1.0,
  ZOMBIE_SPEED_MULTIPLIER: 1.0, // Multiply all zombie speed by this (lower = slower)
  ZOMBIE_SPAWN_RATE_MULTIPLIER: 1.0, // Multiply spawn rate by this (lower = fewer zombies)

  // Wave Settings
  START_AT_WAVE: 1, // Start at this wave number
  WAVE_DELAY: 5000, // Milliseconds between waves (default: varies)
  SKIP_WAVE_COMPLETE_SCREEN: false, // Auto-start next wave

  // Game Speed
  GAME_SPEED_MULTIPLIER: 1.0, // Multiply game speed (1.0 = normal, 2.0 = double speed)

  // Instant Actions
  INSTANT_TOWER_PLACEMENT: false, // No placement validation
  INSTANT_UPGRADES: false, // Upgrades are instant and free
  INVINCIBLE_TOWERS: false, // Towers can't be damaged
  ONE_HIT_KILL: false, // All zombies die in one hit

  // Visual Debug
  SHOW_TOWER_RANGES: false, // Always show tower ranges
  SHOW_ZOMBIE_HEALTH_BARS: false, // Damaged threat types (Tank/Armored/Mechanical/Boss/NecroTank) always show a bar; true shows it on every type
  SHOW_WAYPOINTS: false, // Show path waypoints
  SHOW_COLLISION_BOXES: false, // Show collision boundaries

  // Testing Shortcuts
  UNLOCK_ALL_TOWERS: true, // All tower types available from start
  UNLOCK_ALL_LEVELS: true, // All levels available
  DISABLE_GAME_OVER: false, // Can't lose the game
  AUTO_WIN_WAVES: false, // Automatically complete waves
};
