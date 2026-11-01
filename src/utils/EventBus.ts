/**
 * EventBus - Centralized pub/sub for decoupled manager / UI communication.
 *
 * Emit/subscribe are keyed by GameEvents with GameEventPayloadMap for payload types.
 * Prefer notifications over command-bus patterns.
 */

export type EventCallback<T = unknown> = (payload: T) => void;

export interface EventSubscription {
  unsubscribe: () => void;
}

export const GameEvents = {
  // Wave events
  WAVE_START: 'wave:start',
  WAVE_COMPLETE: 'wave:complete',
  WAVE_END: 'wave:end',

  // Game state events
  GAME_START: 'game:start',
  GAME_OVER: 'game:over',
  GAME_VICTORY: 'game:victory',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',

  // Economy events
  MONEY_EARNED: 'economy:money:earned',
  MONEY_SPENT: 'economy:money:spent',
  LIFE_LOST: 'game:life:lost',
  LIVES_CHANGED: 'game:lives:changed',

  // Combat events
  ZOMBIE_SPAWNED: 'combat:zombie:spawned',
  ZOMBIE_KILLED: 'combat:zombie:killed',
  GIB_DEATH: 'combat:zombie:gib',
  ZOMBIE_REACHED_END: 'combat:zombie:reachedEnd',
  TOWER_PLACED: 'combat:tower:placed',
  TOWER_SOLD: 'combat:tower:sold',
  TOWER_UPGRADED: 'combat:tower:upgraded',
  TOWER_DAMAGED: 'combat:tower:damaged',
  DAMAGE_DEALT: 'combat:damage:dealt',

  // Combat visualization
  TARGET_HIT: 'combat:target:hit',
  LIGHTNING_ARC: 'combat:lightning:arc',
  SNIPER_HIT: 'combat:sniper:hit',
  SHOOTING_EFFECT: 'combat:shooting:effect',
  TOWER_ROTATION: 'combat:tower:rotation',
  FLAME_GROUND_HIT: 'combat:flame:ground:hit',
  SLUDGE_POOL_CREATED: 'combat:sludge:pool:created',
} as const;

export type GameEventType = (typeof GameEvents)[keyof typeof GameEvents];

/**
 * Payload contract per event. Entity refs stay `unknown` so utils stays a leaf.
 */
export type GameEventPayloadMap = {
  [GameEvents.WAVE_START]: { wave: number };
  [GameEvents.WAVE_COMPLETE]: { wave: number; zombiesSpawned: number; livesLost: number };
  [GameEvents.WAVE_END]: undefined;
  [GameEvents.GAME_START]: undefined;
  [GameEvents.GAME_OVER]: { score: number };
  [GameEvents.GAME_VICTORY]: {
    levelId: string;
    wave: number;
    score: number;
    livesRemaining: number;
    /** Level ids newly unlocked by this win. */
    unlockedLevelIds: string[];
  };
  [GameEvents.GAME_PAUSE]: undefined;
  [GameEvents.GAME_RESUME]: undefined;
  [GameEvents.MONEY_EARNED]: number;
  [GameEvents.MONEY_SPENT]: number;
  [GameEvents.LIFE_LOST]: { amount: number; lives: number };
  [GameEvents.LIVES_CHANGED]: { lives: number };
  [GameEvents.ZOMBIE_SPAWNED]: undefined;
  [GameEvents.ZOMBIE_KILLED]: { reward: number; type: string };
  [GameEvents.GIB_DEATH]: {
    zombieId: string;
    x: number;
    y: number;
    overkill: number;
    towerType: string;
    gibType: 'small' | 'medium' | 'large' | 'massive';
  };
  [GameEvents.ZOMBIE_REACHED_END]: undefined;
  [GameEvents.TOWER_PLACED]: { type: string; cost: number };
  [GameEvents.TOWER_SOLD]: { type: string; cost: number };
  [GameEvents.TOWER_UPGRADED]: { type: string; cost: number; level: number };
  [GameEvents.TOWER_DAMAGED]: { tower: unknown; damage: number };
  [GameEvents.DAMAGE_DEALT]: {
    damage: number;
    towerType: string;
    killed: boolean;
    overkill: number;
    zombieX?: number;
    zombieY?: number;
    zombieId?: string;
  };
  [GameEvents.TARGET_HIT]: {
    tower: unknown;
    target: unknown;
    spawnPos: { x: number; y: number };
    targetPos: { x: number; y: number };
    damage: number;
    projectileType: string;
    isFirstHit: boolean;
  };
  [GameEvents.LIGHTNING_ARC]: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    isFirstArc: boolean;
    damage: number;
    chainIndex: number;
  };
  [GameEvents.SNIPER_HIT]: {
    tower: unknown;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    isHeadshot: boolean;
    upgradeLevel: number;
    barrelRotation: number;
  };
  [GameEvents.SHOOTING_EFFECT]: {
    tower: unknown;
    barrel: unknown;
    type: string;
    upgradeLevel: number;
  };
  [GameEvents.TOWER_ROTATION]: {
    tower: unknown;
    targetX: number;
    targetY: number;
    rotation: number;
  };
  [GameEvents.FLAME_GROUND_HIT]: { x: number; y: number; upgradeLevel: number };
  [GameEvents.SLUDGE_POOL_CREATED]: { pool: unknown };
};

type EmitArgs<K extends GameEventType> = GameEventPayloadMap[K] extends undefined
  ? [event: K, payload?: undefined]
  : [event: K, payload: GameEventPayloadMap[K]];

export class EventBus {
  private static instance: EventBus | null = null;
  private listeners: Map<string, Set<EventCallback>>;

  private constructor() {
    this.listeners = new Map();
  }

  /** Create a bus instance without installing it as the process default. */
  public static create(): EventBus {
    return new EventBus();
  }

  /** Composition root registers the shared bus used by getInstance() callers. */
  public static setInstance(bus: EventBus): void {
    EventBus.instance = bus;
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public static resetInstance(): void {
    EventBus.instance = null;
  }

  public on<K extends GameEventType>(
    event: K,
    callback: EventCallback<GameEventPayloadMap[K]>
  ): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback as EventCallback);

    return {
      unsubscribe: () => {
        this.off(event, callback);
      },
    };
  }

  public once<K extends GameEventType>(
    event: K,
    callback: EventCallback<GameEventPayloadMap[K]>
  ): EventSubscription {
    const onceCallback = (payload: GameEventPayloadMap[K]) => {
      this.off(event, onceCallback);
      callback(payload);
    };
    return this.on(event, onceCallback);
  }

  public off<K extends GameEventType>(
    event: K,
    callback: EventCallback<GameEventPayloadMap[K]>
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit<K extends GameEventType>(...args: EmitArgs<K>): void {
    const [event, payload] = args;
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (_error) {
          // Event handler error - continue with other callbacks
        }
      });
    }
  }

  public clearEvent(event: GameEventType | string): void {
    this.listeners.delete(event);
  }

  public clearAll(): void {
    this.listeners.clear();
  }

  public listenerCount(event: GameEventType | string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
