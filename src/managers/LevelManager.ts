import { DebugConstants } from '../config/debugConstants';
import type { MapManager } from './MapManager';

export interface LevelData {
  id: string;
  name: string;
  description: string;
  map: string; // Reference to map name in MapManager
  difficulty: 'Easy' | 'Normal' | 'Hard' | 'Nightmare';
  startingMoney: number;
  startingLives: number;
  resourceModifiers: {
    wood: number;
    metal: number;
    energy: number;
  };
  unlockConditions?: {
    previousLevel?: string;
    minimumScore?: number;
  };
}

export class LevelManager {
  private levels: Map<string, LevelData>;
  private currentLevel: string;
  private unlockedLevels: Set<string>;
  private mapManager: MapManager;

  constructor(mapManager: MapManager) {
    this.levels = new Map<string, LevelData>();
    this.currentLevel = '';
    this.unlockedLevels = new Set<string>();
    this.mapManager = mapManager;
    this.initializeLevels();
  }

  private initializeLevels(): void {
    // Initialize predefined levels
    this.levels.set('level1', {
      id: 'level1',
      name: 'Training Grounds',
      description: 'A basic level for learning the game mechanics',
      map: 'forked',
      difficulty: 'Easy',
      startingMoney: 1000,
      startingLives: 100,
      resourceModifiers: { wood: 1.0, metal: 1.0, energy: 1.0 },
    });

    this.levels.set('level2', {
      id: 'level2',
      name: 'Forest Path',
      description: 'Navigate through the dense forest with limited sight',
      map: 'forest',
      difficulty: 'Normal',
      startingMoney: 800,
      startingLives: 80,
      resourceModifiers: { wood: 1.5, metal: 0.8, energy: 1.0 },
      unlockConditions: { previousLevel: 'level1' },
    });

    this.levels.set('level3', {
      id: 'level3',
      name: 'Urban Maze',
      description: 'Defend against waves in the tight city streets',
      map: 'city',
      difficulty: 'Hard',
      startingMoney: 600,
      startingLives: 60,
      resourceModifiers: { wood: 0.8, metal: 1.5, energy: 1.2 },
      unlockConditions: { previousLevel: 'level2' },
    });

    this.levels.set('level4', {
      id: 'level4',
      name: 'Factory Complex',
      description: 'Navigate the industrial maze with limited resources',
      map: 'industrial',
      difficulty: 'Nightmare',
      startingMoney: 500,
      startingLives: 50,
      resourceModifiers: { wood: 0.6, metal: 1.8, energy: 1.5 },
      unlockConditions: { previousLevel: 'level3' },
    });

    this.levels.set('level5', {
      id: 'level5',
      name: 'Toxic Swamp',
      description: 'Survive the treacherous wetlands with scarce metal',
      map: 'swamp',
      difficulty: 'Nightmare',
      startingMoney: 400,
      startingLives: 40,
      resourceModifiers: { wood: 2.0, metal: 0.5, energy: 1.0 },
      unlockConditions: { previousLevel: 'level4' },
    });

    this.levels.set('level6', {
      id: 'level6',
      name: 'Secret Laboratory',
      description: 'The final challenge - survive the endless waves',
      map: 'laboratory',
      difficulty: 'Nightmare',
      startingMoney: 300,
      startingLives: 30,
      resourceModifiers: { wood: 0.5, metal: 0.5, energy: 2.0 },
      unlockConditions: { previousLevel: 'level5' },
    });

    this.levels.set('level7', {
      id: 'level7',
      name: 'The Long Road',
      description: 'A wider battlefield — pan the camera to defend the full stretch',
      map: 'highway',
      difficulty: 'Normal',
      startingMoney: 900,
      startingLives: 80,
      resourceModifiers: { wood: 1.0, metal: 1.0, energy: 1.0 },
      unlockConditions: { previousLevel: 'level1' },
    });

    // Unlock the first level by default
    this.unlockedLevels.add('level1');

    if (DebugConstants.ENABLED && DebugConstants.UNLOCK_ALL_LEVELS) {
      for (const id of this.levels.keys()) {
        this.unlockedLevels.add(id);
      }
    }
  }

  /** Register or replace a level (used by custom map creator). */
  public registerLevel(data: LevelData, options?: { unlock?: boolean }): void {
    this.levels.set(data.id, { ...data });
    if (options?.unlock !== false) {
      this.unlockedLevels.add(data.id);
    }
  }

  public unregisterLevel(levelId: string): boolean {
    this.unlockedLevels.delete(levelId);
    if (this.currentLevel === levelId) {
      this.currentLevel = '';
    }
    return this.levels.delete(levelId);
  }

  public loadLevel(levelId: string): boolean {
    if (!this.levels.has(levelId) || !this.unlockedLevels.has(levelId)) {
      return false;
    }

    this.currentLevel = levelId;
    const level = this.levels.get(levelId);
    if (!level) {
      return false;
    }

    // Load the map for this level
    this.mapManager.loadMap(level.map);

    return true;
  }

  public getCurrentLevel(): LevelData | undefined {
    return this.levels.get(this.currentLevel);
  }

  public getAvailableLevels(): LevelData[] {
    return Array.from(this.levels.values()).filter(level => this.unlockedLevels.has(level.id));
  }

  /** Built-in campaign levels only (excludes custom_* ids). */
  public getCampaignLevels(): LevelData[] {
    return this.getAvailableLevels().filter(level => !level.id.startsWith('custom_'));
  }

  public getCustomLevels(): LevelData[] {
    return this.getAvailableLevels().filter(level => level.id.startsWith('custom_'));
  }

  /** Find a level that uses the given map name (first match). */
  public findLevelIdByMap(mapName: string): string | undefined {
    for (const level of this.levels.values()) {
      if (level.map === mapName) {
        return level.id;
      }
    }
    return undefined;
  }

  public unlockLevel(levelId: string): void {
    if (this.levels.has(levelId)) {
      this.unlockedLevels.add(levelId);
    }
  }

  public isLevelUnlocked(levelId: string): boolean {
    return this.unlockedLevels.has(levelId);
  }
}
