import type { Container, Graphics } from 'pixi.js';
import type { LimbFlags, LimbId } from '../../components/LimbState';

export interface ZombieRenderState {
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  speed: number;
  direction: { x: number; y: number };
  isMoving: boolean;
  isDamaged: boolean;
  statusEffects: string[];
  /** Remaining limbs (true = still attached). Defaults to all present when omitted. */
  limbs?: LimbFlags;
  /** Prone crawl gait (both legs gone or critical HP). */
  isCrawling?: boolean;
}

export interface IZombieRenderer {
  render(container: Container, state: ZombieRenderState): void;
  update(deltaTime: number, state: ZombieRenderState): void;
  showDamageEffect(damageType: string, amount: number): void;
  playDeathAnimation(killerType?: string, impactAngle?: number): Promise<void>;
  destroy(): void;
  reset(): void;
  showBurningEffect?(): void;
  stopBurningEffect?(): void;
  updateBurningEffect?(deltaTime: number): void;
  /** Gore burst + stump when a limb is lost while alive */
  onLimbLost?(limb: LimbId): void;
  /** Multiply-tint cast by a nearby coloured light (0xffffff = none). */
  setLightCast?(color: number): void;
  /** True if death leaves a ragdoll corpse (see takeRagdollCorpse). */
  hasRagdollCorpse?(): boolean;
  /** The settled ragdoll as a static drawing; ownership passes to the caller. */
  takeRagdollCorpse?(): Graphics | null;
}

export enum AnimationState {
  IDLE = 'idle',
  WALK = 'walk',
  CRAWL = 'crawl',
  ATTACK = 'attack',
  DAMAGE = 'damage',
  DEATH = 'death',
}
