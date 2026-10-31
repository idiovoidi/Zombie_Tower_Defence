/** Minimal subset of the Web Storage API used for persistence (injectable for tests). */
export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CampaignProgressData {
  /** Campaign level ids unlocked by completing earlier levels. */
  unlocked: string[];
  /** Campaign level ids that have been won at least once. */
  completed: string[];
  /** Highest wave reached per level id. */
  bestWave: Record<string, number>;
}

const STORAGE_KEY = 'ztd.campaign.v1';

function emptyData(): CampaignProgressData {
  return { unlocked: [], completed: [], bestWave: {} };
}

function defaultStorage(): ProgressStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Access can throw (private mode / blocked storage)
    return null;
  }
}

/**
 * Persists campaign progress (unlocked/completed levels, best waves).
 * Every storage access is guarded: progress simply isn't saved if storage is unavailable.
 */
export class CampaignProgress {
  private storage: ProgressStorage | null;
  private data: CampaignProgressData;

  constructor(storage: ProgressStorage | null = defaultStorage()) {
    this.storage = storage;
    this.data = this.load();
  }

  public getUnlocked(): string[] {
    return [...this.data.unlocked];
  }

  public isCompleted(levelId: string): boolean {
    return this.data.completed.includes(levelId);
  }

  public getCompleted(): string[] {
    return [...this.data.completed];
  }

  public getBestWave(levelId: string): number {
    return this.data.bestWave[levelId] ?? 0;
  }

  public addUnlocked(levelId: string): void {
    if (!this.data.unlocked.includes(levelId)) {
      this.data.unlocked.push(levelId);
      this.save();
    }
  }

  public markCompleted(levelId: string): void {
    if (!this.data.completed.includes(levelId)) {
      this.data.completed.push(levelId);
      this.save();
    }
  }

  /** Records `wave` if it beats the stored best. Returns true when it is a new best. */
  public recordBestWave(levelId: string, wave: number): boolean {
    if (wave <= this.getBestWave(levelId)) {
      return false;
    }
    this.data.bestWave[levelId] = wave;
    this.save();
    return true;
  }

  public reset(): void {
    this.data = emptyData();
    this.save();
  }

  private load(): CampaignProgressData {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (!raw) {
        return emptyData();
      }
      const parsed = JSON.parse(raw) as Partial<CampaignProgressData>;
      return {
        unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked.filter(isString) : [],
        completed: Array.isArray(parsed.completed) ? parsed.completed.filter(isString) : [],
        bestWave: sanitizeBestWave(parsed.bestWave),
      };
    } catch {
      return emptyData();
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Quota/blocked storage: progress just won't persist this session
    }
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function sanitizeBestWave(value: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  if (value && typeof value === 'object') {
    for (const [key, wave] of Object.entries(value)) {
      if (typeof wave === 'number' && Number.isFinite(wave) && wave > 0) {
        result[key] = Math.floor(wave);
      }
    }
  }
  return result;
}
