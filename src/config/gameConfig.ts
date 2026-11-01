// Game configuration and constants
export const GameConfig = {
  // Screen dimensions
  SCREEN_WIDTH: 1280,
  SCREEN_HEIGHT: 768,

  // UI Layout dimensions
  UI_SHOP_WIDTH: 220,
  UI_BOTTOM_BAR_HEIGHT: 80,

  // Game states
  GAME_STATES: {
    MAIN_MENU: 'MainMenu',
    LEVEL_SELECT: 'LevelSelect',
    MAP_EDITOR: 'MapEditor',
    PLAYING: 'Playing',
    PAUSED: 'Paused',
    WAVE_COMPLETE: 'WaveComplete',
    GAME_OVER: 'GameOver',
    VICTORY: 'Victory',
  },

  // Resource settings
  STARTING_MONEY: 1000,
  STARTING_LIVES: 100, // 100 survivors in the camp

  // Difficulty modes
  DIFFICULTY_MODES: {
    EASY: 'Easy',
    NORMAL: 'Normal',
    HARD: 'Hard',
    NIGHTMARE: 'Nightmare',
  },

  // Tower types
  TOWER_TYPES: {
    MACHINE_GUN: 'MachineGun',
    SNIPER: 'Sniper',
    SHOTGUN: 'Shotgun',
    FLAME: 'Flame',
    TESLA: 'Tesla',
    GRENADE: 'Grenade',
    SLUDGE: 'Sludge',
  },

  // Zombie types
  ZOMBIE_TYPES: {
    BASIC: 'Basic',
    FAST: 'Fast',
    TANK: 'Tank',
    ARMORED: 'Armored',
    SWARM: 'Swarm',
    STEALTH: 'Stealth',
    MECHANICAL: 'Mechanical',
    BOSS: 'Boss',
    NECRO_TANK: 'NecroTank',
  },
};
