import { LIGHTING } from '../../config/lightingConstants';

/** Unit vector pointing from a surface TOWARD the light, in screen space (+X right, +Y down, +Z up out of the screen). */
export interface LightVector {
  x: number;
  y: number;
  z: number;
}

export interface ShadowOffset {
  x: number;
  y: number;
}

type Listener = () => void;

/**
 * Single source of truth for the scene's light. Pure logic (no rendering) so it is trivially
 * testable; renderers read from it and subscribe to be told when the light moves.
 */
export class LightingManager {
  private angleDeg: number = LIGHTING.DEFAULT_ANGLE_DEG;
  private elevationDeg: number = LIGHTING.DEFAULT_ELEVATION_DEG;
  private surfaceShading = false;
  private listeners = new Set<Listener>();

  public getAngleDeg(): number {
    return this.angleDeg;
  }

  public getElevationDeg(): number {
    return this.elevationDeg;
  }

  /**
   * Move the light.
   * @param angleDeg direction it comes from, degrees CCW from +X (45 = top-right); wrapped to [0, 360)
   * @param elevationDeg height above the ground, clamped to [MIN, MAX]
   */
  public setLightDirection(angleDeg: number, elevationDeg: number = this.elevationDeg): void {
    const angle = ((angleDeg % 360) + 360) % 360;
    const elevation = Math.min(
      LIGHTING.MAX_ELEVATION_DEG,
      Math.max(LIGHTING.MIN_ELEVATION_DEG, elevationDeg)
    );
    if (angle === this.angleDeg && elevation === this.elevationDeg) {
      return;
    }
    this.angleDeg = angle;
    this.elevationDeg = elevation;
    this.notify();
  }

  public getLightVector(): LightVector {
    const a = (this.angleDeg * Math.PI) / 180;
    const e = (this.elevationDeg * Math.PI) / 180;
    return {
      x: Math.cos(a) * Math.cos(e),
      y: -Math.sin(a) * Math.cos(e),
      z: Math.sin(e),
    };
  }

  /**
   * Where a caster of the given height throws its shadow, relative to its base.
   * Points away from the light; length = height / tan(elevation) (so a low sun gives long shadows).
   */
  public getShadowOffset(casterHeight: number): ShadowOffset {
    const a = (this.angleDeg * Math.PI) / 180;
    const length = casterHeight / Math.tan((this.elevationDeg * Math.PI) / 180);
    return { x: -Math.cos(a) * length, y: Math.sin(a) * length };
  }

  public isSurfaceShadingEnabled(): boolean {
    return this.surfaceShading;
  }

  /** Opt in to GPU surface shading (needs a WebGL renderer; off by default, e.g. in tests). */
  public setSurfaceShadingEnabled(enabled: boolean): void {
    this.surfaceShading = enabled;
  }

  /** Subscribe to light changes. Returns an unsubscribe function. */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** Shared scene light. */
export const lightingManager = new LightingManager();
