import { GameConfig } from '../../config/gameConfig';
import { convertToTowerType, type TowerType } from '../../config/zombieResistances';
import { Zombie } from '../Zombie';

/** Ability hooks provided by ZombieManager for corpse revival. */
export interface NecroTankAbilityContext {
  findCorpsesNear(
    x: number,
    y: number,
    radius: number,
    limit: number
  ): Array<{ id: number; x: number; y: number }>;
  consumeCorpse(id: number): boolean;
  spawnSwarmAt(x: number, y: number, pathWaypoints: Array<{ x: number; y: number }>): void;
}

export type NecroTankPhase = 'armored' | 'cracking' | 'exposed';

const REVIVE_RADIUS = 200;
const REVIVE_MAX_CORPSES = 3;
const FLAME_SHED_THRESHOLD = 300;
const RAGE_SPEED_BONUS = 15;
const RAGE_DURATION_MS = 3000;

/**
 * Necro Tank mini-boss: bone armor phases, flame-triggered shed, corpse revival.
 * Spawns alongside the regular Boss as a second elite type.
 */
export class NecroTankZombie extends Zombie {
  private phase: NecroTankPhase = 'armored';
  private flameDamageTaken = 0;
  private armorFullyShed = false;
  private reviveTimerMs = 0;
  private nextReviveIntervalMs = NecroTankZombie.rollReviveInterval();
  private rageRemainingMs = 0;
  private abilityContext: NecroTankAbilityContext | null = null;

  constructor(x: number, y: number, wave: number) {
    super(GameConfig.ZOMBIE_TYPES.NECRO_TANK, x, y, wave);
  }

  public setAbilityContext(context: NecroTankAbilityContext | null): void {
    this.abilityContext = context;
  }

  public getPhase(): NecroTankPhase {
    return this.phase;
  }

  public override init(x: number, y: number, wave: number): void {
    super.init(x, y, wave);
    this.phase = 'armored';
    this.flameDamageTaken = 0;
    this.armorFullyShed = false;
    this.reviveTimerMs = 0;
    this.nextReviveIntervalMs = NecroTankZombie.rollReviveInterval();
    this.rageRemainingMs = 0;
  }

  public override update(deltaTime: number): void {
    super.update(deltaTime);
    if (this.getIsDying()) {
      return;
    }

    this.updatePhaseFromHealth();
    this.updateRage(deltaTime);
    this.updateRevive(deltaTime);
  }

  public override getDamageModifier(towerType: TowerType | string): number {
    const converted = typeof towerType === 'string' ? convertToTowerType(towerType) : towerType;

    // Flame matrix flips after armor shed (design: 2.0× → 0.8×)
    if (converted === 'FLAME' && this.armorFullyShed) {
      return 0.8 * this.getArmorMultiplier();
    }

    return super.getDamageModifier(towerType) * this.getArmorMultiplier();
  }

  public override takeDamage(
    damage: number,
    towerType?: string,
    sourceX?: number,
    sourceY?: number
  ): number {
    const actualDamage = super.takeDamage(damage, towerType, sourceX, sourceY);

    if (actualDamage > 0 && towerType) {
      const converted = convertToTowerType(towerType);
      if (converted === 'FLAME' && !this.armorFullyShed) {
        this.flameDamageTaken += actualDamage;
        if (this.flameDamageTaken >= FLAME_SHED_THRESHOLD) {
          this.triggerArmorShed();
        }
      }
    }

    this.updatePhaseFromHealth();
    return actualDamage;
  }

  private getArmorMultiplier(): number {
    switch (this.phase) {
      case 'armored':
        return 0.5; // 50% DR
      case 'cracking':
        return 0.75; // 25% DR
      case 'exposed':
        return 1.0;
    }
  }

  private updatePhaseFromHealth(): void {
    if (this.armorFullyShed) {
      this.phase = 'exposed';
      return;
    }

    const maxHp = this.getMaxHealth();
    if (maxHp <= 0) {
      return;
    }
    const ratio = this.getHealth() / maxHp;
    let next: NecroTankPhase;
    if (ratio > 0.66) {
      next = 'armored';
    } else if (ratio > 0.33) {
      next = 'cracking';
    } else {
      next = 'exposed';
    }

    if (next !== this.phase) {
      const previous = this.phase;
      this.phase = next;
      // Crossing into a weaker armor state triggers a brief pain-rage burst
      if (phaseRank(next) > phaseRank(previous)) {
        this.startRage();
      }
      if (next === 'exposed') {
        this.armorFullyShed = true;
      }
    }
  }

  private triggerArmorShed(): void {
    if (this.armorFullyShed) {
      return;
    }
    this.armorFullyShed = true;
    this.phase = 'exposed';
    this.startRage();
  }

  private startRage(): void {
    if (this.rageRemainingMs > 0) {
      this.rageRemainingMs = RAGE_DURATION_MS;
      return;
    }
    this.setSpeedBonus(RAGE_SPEED_BONUS);
    this.rageRemainingMs = RAGE_DURATION_MS;
  }

  private updateRage(deltaTime: number): void {
    if (this.rageRemainingMs <= 0) {
      return;
    }
    this.rageRemainingMs -= deltaTime;
    if (this.rageRemainingMs <= 0) {
      this.rageRemainingMs = 0;
      this.setSpeedBonus(0);
    }
  }

  private updateRevive(deltaTime: number): void {
    if (!this.abilityContext) {
      return;
    }

    this.reviveTimerMs += deltaTime;
    if (this.reviveTimerMs < this.nextReviveIntervalMs) {
      return;
    }

    this.reviveTimerMs = 0;
    this.nextReviveIntervalMs = NecroTankZombie.rollReviveInterval();
    this.attemptCorpseRevival();
  }

  private attemptCorpseRevival(): void {
    if (!this.abilityContext) {
      return;
    }

    const corpses = this.abilityContext.findCorpsesNear(
      this.position.x,
      this.position.y,
      REVIVE_RADIUS,
      REVIVE_MAX_CORPSES
    );
    if (corpses.length === 0) {
      return;
    }

    const swarmCount = corpses.length + 1; // 1→2, 2→3, 3→4
    const waypoints = this.getWaypointsCopy();

    for (const corpse of corpses) {
      this.abilityContext.consumeCorpse(corpse.id);
    }

    for (let i = 0; i < swarmCount; i++) {
      const source = corpses[i % corpses.length];
      const jitterX = (Math.random() - 0.5) * 16;
      const jitterY = (Math.random() - 0.5) * 16;
      this.abilityContext.spawnSwarmAt(source.x + jitterX, source.y + jitterY, waypoints);
    }
  }

  private getWaypointsCopy(): Array<{ x: number; y: number }> {
    const self = this as unknown as {
      waypoints: Array<{ x: number; y: number }>;
      currentWaypointIndex: number;
    };
    const start = Math.max(0, self.currentWaypointIndex ?? 0);
    const remaining = self.waypoints?.slice(start) ?? [];
    if (remaining.length > 0) {
      return remaining.map(wp => ({ x: wp.x, y: wp.y }));
    }
    // Fallback: keep moving toward camp from current position
    return [{ x: this.position.x, y: this.position.y }];
  }

  private static rollReviveInterval(): number {
    // 8–12 seconds
    return 8000 + Math.random() * 4000;
  }
}

function phaseRank(phase: NecroTankPhase): number {
  switch (phase) {
    case 'armored':
      return 0;
    case 'cracking':
      return 1;
    case 'exposed':
      return 2;
  }
}
