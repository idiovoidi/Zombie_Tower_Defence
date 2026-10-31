/** Tracks a zombie being pushed away from a damage source at a fixed speed. */
export class KnockbackState {
  /** Push speed in pixels per second. */
  public static readonly SPEED = 200;

  private distance = 0;
  private dirX = 0;
  private dirY = 0;

  public get active(): boolean {
    return this.distance > 0;
  }

  /** Begin a push of `distance` px along the unit vector (dirX, dirY). */
  public start(dirX: number, dirY: number, distance: number): void {
    this.dirX = dirX;
    this.dirY = dirY;
    this.distance = distance;
  }

  /** Advance by deltaTime ms; returns the (x, y) displacement to apply this frame. */
  public step(deltaTime: number): { x: number; y: number } {
    const move = Math.min(KnockbackState.SPEED * (deltaTime / 1000), this.distance);
    this.distance -= move;
    if (this.distance <= 0) {
      this.distance = 0;
    }
    return { x: this.dirX * move, y: this.dirY * move };
  }

  public reset(): void {
    this.distance = 0;
  }
}
