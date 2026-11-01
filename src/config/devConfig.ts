/**
 * Development configuration
 */

export const DevConfig = {
  // Debug settings
  DEBUG: {
    ENABLED: true,
    LOG_LEVEL: 'debug',
    SHOW_FPS: true,
    SHOW_COLLISION_BOUNDS: false,
    SHOW_PATHFINDING: false,
    /** Visualize SDF heatmap on zombies (0=off, see SdfDebugMode). */
    SHOW_SDF_DEBUG: false,
  },

  // Performance settings
  PERFORMANCE: {
    TARGET_FPS: 60,
    MAX_DELTA_TIME: 0.1, // 100ms
    ENABLE_FRAME_SKIPPING: true,
    LOG_DIRTY_FLAGS: false, // Log when dirty flags prevent unnecessary rebuilds

    // Monitoring
    ENABLE_MONITORING: true,
    LOG_SLOW_SYSTEMS: true,
    SLOW_SYSTEM_THRESHOLD_MS: 5, // Log systems taking longer than 5ms

    // Object Pooling
    ENABLE_POOLING: true,

    // Entity Limits
    MAX_PARTICLES: 200,
    MAX_CORPSES: 50,
    MAX_SHELL_CASINGS: 50,
    MAX_BULLET_TRAILS: 20,
    MAX_MUZZLE_FLASHES: 30,
    MAX_IMPACT_FLASHES: 40,
    MAX_SCOPE_GLINTS: 10,

    // Spatial Grid
    SPATIAL_GRID_CELL_SIZE: 128,

    // Warning Thresholds
    MAX_GRAPHICS_OBJECTS_WARNING: 100,
    MAX_PERSISTENT_EFFECTS_WARNING: 20,
    MAX_TIMERS_WARNING: 20,

    // Performance Targets (FPS by wave)
    TARGET_FPS_WAVE_1_5: 60, // 16.67ms per frame
    TARGET_FPS_WAVE_6_10: 50, // 20ms per frame
    TARGET_FPS_WAVE_11_20: 45, // 22ms per frame
    TARGET_FPS_WAVE_20_PLUS: 40, // 25ms per frame
    MIN_FPS_THRESHOLD: 30, // Minimum acceptable FPS

    // Memory Targets (MB)
    MEMORY_TARGET_WAVE_1: 350,
    MEMORY_TARGET_WAVE_5: 400,
    MEMORY_TARGET_WAVE_10: 450,
    MEMORY_TARGET_WAVE_20_PLUS: 500,
    MEMORY_GROWTH_RATE_MAX_MB_PER_WAVE: 10,

    // System Time Budgets (ms per frame)
    TIME_BUDGET_ZOMBIE_MANAGER: 3,
    TIME_BUDGET_TOWER_COMBAT: 4,
    TIME_BUDGET_PROJECTILE_MANAGER: 2,
    TIME_BUDGET_EFFECT_MANAGER: 2,
    TIME_BUDGET_PARTICLE_SYSTEM: 1,
    TIME_BUDGET_CORPSE_MANAGER: 1,
    TIME_BUDGET_OTHER_SYSTEMS: 3,
    TIME_BUDGET_TOTAL: 16, // 60 FPS target

    // Cleanup Targets
    CLEANUP_TIME_BUDGET_MS: 100, // Wave cleanup should complete within 100ms
    CLEANUP_MEMORY_RELEASE_PERCENT: 80, // Should release 80%+ of wave resources
  },

  // Development features
  FEATURES: {
    HOT_RELOAD: true,
    DEV_TOOLS: true,
    MOCK_DATA: false,
    /** Use SDF mesh renderers instead of Graphics skeletal renderers. */
    USE_SDF_ZOMBIE_RENDERERS: true,
  },

  // Testing settings
  TESTING: {
    // Dev convenience only: jump straight into a level. Production shows the real menus
    // (main menu -> level select), which progression and the map creator depend on.
    AUTO_START_GAME: import.meta.env.DEV,
    SKIP_MENU: import.meta.env.DEV,
    DEFAULT_LEVEL: 'level1',
    UNLOCK_ALL_LEVELS: true,
    INFINITE_RESOURCES: false,
    NO_COOLDOWN: false,
    SPAWN_TEST_TOWERS: false,
  },
};
