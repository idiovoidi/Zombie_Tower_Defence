/**
 * A zombie's fixed "lane" across the road, used purely for rendering so crowds spread out
 * instead of stacking on the path centreline. Logical position (targeting, pathing) is untouched.
 */
export class LaneOffset {
  private lane = 0;
  /** Smoothed unit vector perpendicular to the direction of travel. */
  private perpX = 0;
  private perpY = 1;
  private hasDirection = false;

  /** Pick a new lane in [-maxOffset, +maxOffset] (px across the road). */
  public reset(maxOffset: number, rand: () => number = Math.random): void {
    this.lane = maxOffset > 0 ? (rand() * 2 - 1) * maxOffset : 0;
    this.hasDirection = false;
  }

  public getLane(): number {
    return this.lane;
  }

  /**
   * Feed the current unit travel direction; returns the render offset in px.
   * The perpendicular is eased so lanes swing smoothly round corners instead of snapping.
   */
  public update(dirX: number, dirY: number, deltaSec: number): { x: number; y: number } {
    const targetX = -dirY;
    const targetY = dirX;

    if (!this.hasDirection) {
      this.perpX = targetX;
      this.perpY = targetY;
      this.hasDirection = true;
    } else {
      const ease = Math.min(1, deltaSec * 8);
      this.perpX += (targetX - this.perpX) * ease;
      this.perpY += (targetY - this.perpY) * ease;
    }

    return { x: this.perpX * this.lane, y: this.perpY * this.lane };
  }
}
