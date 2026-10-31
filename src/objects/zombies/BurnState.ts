/**
 * Fire exposure and burning for a zombie.
 * Standing in fire for IGNITE_MS ignites it; it then burns for BURN_MS
 * (refreshed while still in fire) taking DAMAGE_PER_SECOND.
 */
export class BurnState {
  public static readonly IGNITE_MS = 1000;
  public static readonly BURN_MS = 3000;
  public static readonly DAMAGE_PER_SECOND = 15; // ~45 over 3s

  private exposureMs = 0;
  private remainingMs = 0;
  private burning = false;
  private inFireThisFrame = false;

  public get isBurning(): boolean {
    return this.burning;
  }

  public get burnRemainingMs(): number {
    return this.remainingMs;
  }

  /** 0..1 progress toward ignition (1 when burning). */
  public get exposureProgress(): number {
    return this.burning ? 1 : Math.min(this.exposureMs / BurnState.IGNITE_MS, 1);
  }

  /**
   * Call each frame the zombie stands in fire.
   * @param canIgnite false while dying (accumulates exposure but never ignites)
   * @returns true if the zombie just ignited this call
   */
  public addExposure(deltaTime: number, canIgnite: boolean): boolean {
    this.inFireThisFrame = true;

    if (this.burning) {
      // Refresh the fire: +0.5ms per ms in fire, capped at BURN_MS
      this.remainingMs = Math.min(this.remainingMs + deltaTime * 0.5, BurnState.BURN_MS);
      return false;
    }

    this.exposureMs += deltaTime;
    if (this.exposureMs >= BurnState.IGNITE_MS && canIgnite) {
      this.burning = true;
      this.remainingMs = BurnState.BURN_MS;
      return true;
    }
    return false;
  }

  /** Damage to apply for a frame of deltaTime ms while burning. */
  public damageFor(deltaTime: number): number {
    return (BurnState.DAMAGE_PER_SECOND * deltaTime) / 1000;
  }

  /** Count down the burn; returns true when it just expired. */
  public advance(deltaTime: number): boolean {
    this.remainingMs -= deltaTime;
    if (this.remainingMs <= 0) {
      this.burning = false;
      this.remainingMs = 0;
      return true;
    }
    return false;
  }

  /** End-of-frame bookkeeping: leaving fire (and not burning) clears exposure. */
  public endFrame(): void {
    if (!this.inFireThisFrame && !this.burning) {
      this.exposureMs = 0;
    }
    this.inFireThisFrame = false;
  }

  public reset(): void {
    this.exposureMs = 0;
    this.remainingMs = 0;
    this.burning = false;
    this.inFireThisFrame = false;
  }
}
