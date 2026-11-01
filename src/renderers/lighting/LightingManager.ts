import { LIGHTING } from '../../config/lightingConstants';
import { getTimeOfDay, wrapPhase } from './dayNight';

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

export interface PointLightOptions {
  x: number;
  y: number;
  /** Reach in px; brightness falls off quadratically to 0 at this distance. */
  radius: number;
  color: number;
  intensity?: number;
  /** Fade out linearly over this long (game ms); omit for a persistent light. */
  durationMs?: number;
}

interface PointLight {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: number;
  intensity: number;
  remainingMs: number | null;
  totalMs: number | null;
}

/** Combined effect of all point lights at a spot. */
export interface EnvironmentSample {
  /** 0 = unlit, 1 = fully lit. */
  strength: number;
  /** Intensity-weighted average light colour. */
  color: number;
  /** Unit-ish direction toward the lights' centre of brightness (0,0 when unlit or on top of one). */
  dirX: number;
  dirY: number;
}

export interface AmbientTint {
  color: number;
  alpha: number;
}

const NO_LIGHT: EnvironmentSample = { strength: 0, color: 0xffffff, dirX: 0, dirY: 0 };

/**
 * Single source of truth for the scene's light. Pure logic (no rendering) so it is trivially
 * testable; renderers read from it and subscribe to be told when the light moves.
 */
export class LightingManager {
  private angleDeg: number = LIGHTING.DEFAULT_ANGLE_DEG;
  private elevationDeg: number = LIGHTING.DEFAULT_ELEVATION_DEG;
  private surfaceShading = false;
  private listeners = new Set<Listener>();
  private pointLights: PointLight[] = [];
  private nextLightId = 1;

  // Day/night (off unless a cycle length is set)
  private cycleSeconds = 0;
  private phase = 0;
  private appliedPhase = 0;
  private ambient: AmbientTint = { color: 0xffffff, alpha: 0 };

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
    if (this.setLightDirectionSilently(angleDeg, elevationDeg)) {
      this.notify();
    }
  }

  /** Apply a new light direction without notifying; returns whether anything changed. */
  private setLightDirectionSilently(angleDeg: number, elevationDeg: number): boolean {
    const angle = ((angleDeg % 360) + 360) % 360;
    const elevation = Math.min(
      LIGHTING.MAX_ELEVATION_DEG,
      Math.max(LIGHTING.MIN_ELEVATION_DEG, elevationDeg)
    );
    if (angle === this.angleDeg && elevation === this.elevationDeg) {
      return false;
    }
    this.angleDeg = angle;
    this.elevationDeg = elevation;
    return true;
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

  // ---- Environmental point lights -------------------------------------------------------

  /** Add a light (explosion, arc, fire pit...). Returns its id. The oldest light is dropped past the cap. */
  public addPointLight(options: PointLightOptions): number {
    const id = this.nextLightId++;
    this.pointLights.push({
      id,
      x: options.x,
      y: options.y,
      radius: options.radius,
      color: options.color,
      intensity: options.intensity ?? 1,
      remainingMs: options.durationMs ?? null,
      totalMs: options.durationMs ?? null,
    });
    if (this.pointLights.length > LIGHTING.ENVIRONMENT.MAX_LIGHTS) {
      this.pointLights.shift();
    }
    return id;
  }

  public removePointLight(id: number): void {
    this.pointLights = this.pointLights.filter(light => light.id !== id);
  }

  public hasPointLights(): boolean {
    return this.pointLights.length > 0;
  }

  public clearPointLights(): void {
    this.pointLights = [];
  }

  /** How strongly, in what colour and from which side nearby point lights light the spot (x, y). */
  public sampleEnvironment(x: number, y: number): EnvironmentSample {
    let total = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    let dx = 0;
    let dy = 0;

    for (const light of this.pointLights) {
      const lx = light.x - x;
      const ly = light.y - y;
      const distance = Math.hypot(lx, ly);
      if (distance >= light.radius) {
        continue;
      }
      const fade =
        light.remainingMs !== null && light.totalMs ? light.remainingMs / light.totalMs : 1;
      const falloff = 1 - distance / light.radius;
      const weight = light.intensity * fade * falloff * falloff;
      if (weight <= 0) {
        continue;
      }
      total += weight;
      r += ((light.color >> 16) & 255) * weight;
      g += ((light.color >> 8) & 255) * weight;
      b += (light.color & 255) * weight;
      if (distance > 0.001) {
        dx += (lx / distance) * weight;
        dy += (ly / distance) * weight;
      }
    }

    if (total <= 0) {
      return NO_LIGHT;
    }
    const color =
      (Math.round(r / total) << 16) | (Math.round(g / total) << 8) | Math.round(b / total);
    const dirLength = Math.hypot(dx, dy);
    return {
      strength: Math.min(1, total),
      color,
      dirX: dirLength > 0 ? dx / dirLength : 0,
      dirY: dirLength > 0 ? dy / dirLength : 0,
    };
  }

  // ---- Day / night ----------------------------------------------------------------------

  /** Jump to a time of day (0 dawn, 0.25 noon, 0.5 dusk, 0.75 midnight) and apply it to the light. */
  public setTimeOfDay(phase: number): void {
    this.phase = wrapPhase(phase);
    this.appliedPhase = this.phase;
    const state = getTimeOfDay(this.phase);
    this.ambient = { color: state.tintColor, alpha: state.tintAlpha };
    this.setLightDirectionSilently(state.angleDeg, state.elevationDeg);
    this.notify(); // one notification covers both the new light and the new tint
  }

  public getTimeOfDayPhase(): number {
    return this.phase;
  }

  /** Run the day/night cycle with the given length in game seconds (0 or less stops it). */
  public setDayNightCycle(cycleSeconds: number): void {
    this.cycleSeconds = cycleSeconds > 0 ? cycleSeconds : 0;
    if (this.cycleSeconds === 0) {
      this.ambient = { color: 0xffffff, alpha: 0 };
      this.notify();
    } else {
      this.setTimeOfDay(this.phase);
    }
  }

  public isDayNightActive(): boolean {
    return this.cycleSeconds > 0;
  }

  public getAmbientTint(): AmbientTint {
    return this.ambient;
  }

  /** Advance timed lights and the day/night clock by game time. Call once per frame. */
  public update(deltaMs: number): void {
    if (this.pointLights.length > 0) {
      for (const light of this.pointLights) {
        if (light.remainingMs !== null) {
          light.remainingMs -= deltaMs;
        }
      }
      this.pointLights = this.pointLights.filter(
        light => light.remainingMs === null || light.remainingMs > 0
      );
    }

    if (this.cycleSeconds > 0 && deltaMs > 0) {
      this.phase = wrapPhase(this.phase + deltaMs / 1000 / this.cycleSeconds);
      const moved = Math.abs(this.phase - this.appliedPhase);
      // Wrap-around counts as a small step too
      if (Math.min(moved, 1 - moved) >= LIGHTING.DAY_NIGHT.APPLY_STEP) {
        this.setTimeOfDay(this.phase);
      }
    }
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
