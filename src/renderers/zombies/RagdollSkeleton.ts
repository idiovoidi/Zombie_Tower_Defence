import type { Graphics } from 'pixi.js';
import { multiplyTint } from '../lighting/zombieLighting';

/**
 * A single bone in the ragdoll skeleton.
 * Bones are line segments with a position (joint), length, and angle.
 */
export interface RagdollBone {
  /** Unique name for this bone */
  name: string;
  /** Parent bone name (null for root) */
  parent: string | null;
  /** Position of the bone's joint (where it connects to parent) */
  x: number;
  y: number;
  /** Bone angle in radians (relative to world) */
  angle: number;
  /** Bone segment length in pixels */
  length: number;
  /** Mass affects how much force moves this bone */
  mass: number;
  /** Linear velocity */
  vx: number;
  vy: number;
  /** Angular velocity (radians/sec) */
  angularVelocity: number;
  /** Visual width for rendering */
  width: number;
  /** Color for rendering */
  color: number;
  /** Whether this bone has detached (for extreme deaths) */
  detached: boolean;
  /** Where along the parent this bone is anchored (0 = parent's joint, 1 = parent's tip). */
  attachT: number;
  /** Removed entirely (limb already lost while alive): not drawn, only its stump shows. */
  hidden: boolean;
}

/** A wound drawn on the torso, in the torso's own frame. */
export interface TorsoWound {
  /** Along the torso, 0 = shoulders .. 1 = hips. */
  t: number;
  /** Across the torso, -1 .. 1. */
  s: number;
  radius: number;
  kind: 'hole' | 'burst' | 'char' | 'arc';
}

/** Per-death look: killer-specific wounds, scorching and armour. */
export interface RagdollStyle {
  /** Multiplied into every body colour (e.g. dark grey for burnt corpses). */
  tint?: number;
  /** Colour of blood (oil/ichor for non-humans). */
  blood?: number;
  /** Armour plate colour for armoured types. */
  armor?: number;
  torsoWounds?: TorsoWound[];
  headWound?: boolean;
}

/**
 * Constraint between two connected bones limiting relative angle.
 */
export interface RagdollJointConstraint {
  boneA: string;
  boneB: string;
  /** Minimum relative angle (radians) */
  minAngle: number;
  /** Maximum relative angle (radians) */
  maxAngle: number;
  /** Stiffness of the constraint (0-1, higher = more rigid) */
  stiffness: number;
}

/**
 * Configuration for creating a ragdoll skeleton for a specific zombie type.
 */
export interface RagdollSkeletonConfig {
  bones: Array<{
    name: string;
    parent: string | null;
    /** Offset from parent's end point */
    offsetX: number;
    offsetY: number;
    angle: number;
    length: number;
    mass: number;
    width: number;
    color: number;
    /** Anchor point along the parent (default 1 = its tip). */
    attachT?: number;
  }>;
  constraints: RagdollJointConstraint[];
  /** Gravity strength (pixels/sec²) */
  gravity: number;
  /** Velocity damping per frame (0-1, lower = more drag) */
  damping: number;
  /** Ground Y level */
  groundY: number;
  /** Bounciness on ground collision (0-1) */
  bounce: number;
  /** Ground friction (0-1) */
  friction: number;
  /** Eye glow color for head rendering */
  eyeColor?: number;
  /** Dark shade for limb joints / feet */
  darkColor?: number;
}

/**
 * A directional impulse to apply to specific bones on death.
 */
export interface RagdollImpulse {
  /** Target bone name */
  boneName: string;
  /** Force in pixels/sec */
  forceX: number;
  forceY: number;
  /** Torque in radians/sec */
  torque: number;
}

/**
 * Blood emission point tied to a bone for continuous blood trails during ragdoll.
 */
export interface BloodEmitPoint {
  boneName: string;
  /** Offset along bone length (0 = joint, 1 = tip) */
  boneT: number;
  /** Emission rate (particles per second) */
  rate: number;
  /** How long to emit (ms) */
  duration: number;
  /** Timer tracking */
  elapsed: number;
  /** Accumulator for emission timing */
  emitAccumulator: number;
}

/** Draw order (back to front): far-side limbs, body, head, then the near-side arm. */
const RENDER_ORDER = [
  'leg_l',
  'shin_l',
  'leg_r',
  'shin_r',
  'arm_l',
  'forearm_l',
  'torso',
  'head',
  'arm_r',
  'forearm_r',
];

/**
 * Procedural ragdoll skeleton for zombie death animations.
 *
 * Creates an articulated skeleton from the zombie's visual bone structure,
 * applies physics impulses based on death direction, and simulates ragdoll
 * collapse with constraints, gravity, and ground collision.
 */
export class RagdollSkeleton {
  private bones: Map<string, RagdollBone> = new Map();
  private boneOrder: string[] = []; // Ordered for parent-first traversal
  private constraints: RagdollJointConstraint[] = [];
  private gravity: number;
  private damping: number;
  private groundY: number;
  private bounce: number;
  private friction: number;
  private settled = false;
  private elapsedTime = 0;
  private maxDuration = 2500; // Max ragdoll duration (ms)
  private settlementThreshold = 2.0; // Total velocity threshold for settlement
  private bloodEmitPoints: BloodEmitPoint[] = [];
  private eyeColor: number;
  private darkColor: number;
  private style: RagdollStyle = {};
  private groundHitCooldown = new Map<string, number>();

  // Callback for blood emission during ragdoll
  public onBloodEmit: ((x: number, y: number, vx: number, vy: number) => void) | null = null;
  /** A bleeding bone slammed into the ground at this point (leave a splat). */
  public onGroundHit: ((x: number, y: number, speed: number) => void) | null = null;

  constructor(config: RagdollSkeletonConfig) {
    this.gravity = config.gravity;
    this.damping = config.damping;
    this.groundY = config.groundY;
    this.bounce = config.bounce;
    this.friction = config.friction;
    this.constraints = config.constraints;
    this.eyeColor = config.eyeColor ?? 0xff0000;
    this.darkColor = config.darkColor ?? 0x1a1a1a;

    // Create bones
    for (const boneDef of config.bones) {
      const bone: RagdollBone = {
        name: boneDef.name,
        parent: boneDef.parent,
        x: boneDef.offsetX,
        y: boneDef.offsetY,
        angle: boneDef.angle,
        length: boneDef.length,
        mass: boneDef.mass,
        vx: 0,
        vy: 0,
        angularVelocity: 0,
        width: boneDef.width,
        color: boneDef.color,
        detached: false,
        attachT: boneDef.attachT ?? 1,
        hidden: false,
      };
      this.bones.set(boneDef.name, bone);
      this.boneOrder.push(boneDef.name);
    }
  }

  /**
   * Initialize bone positions from the zombie's current rendered pose.
   * Call this before applying death impulses.
   */
  public initializeFromPose(centerX: number, centerY: number, rotation: number): void {
    // Position root bone at zombie center
    const root = this.bones.get(this.boneOrder[0]);
    if (root) {
      root.x = centerX;
      root.y = centerY;
      root.angle += rotation;
    }

    // Position child bones relative to parents
    for (let i = 1; i < this.boneOrder.length; i++) {
      const bone = this.bones.get(this.boneOrder[i]);
      if (!bone?.parent) continue;

      const parent = this.bones.get(bone.parent);
      if (!parent) continue;

      // Place bone at parent's tip
      const parentTipX = parent.x + Math.cos(parent.angle) * parent.length * bone.attachT;
      const parentTipY = parent.y + Math.sin(parent.angle) * parent.length * bone.attachT;

      bone.x = parentTipX + bone.x;
      bone.y = parentTipY + bone.y;
    }
  }

  /**
   * Apply death impulses to specific bones.
   */
  public applyImpulses(impulses: RagdollImpulse[]): void {
    for (const impulse of impulses) {
      const bone = this.bones.get(impulse.boneName);
      if (!bone) continue;

      bone.vx += impulse.forceX / bone.mass;
      bone.vy += impulse.forceY / bone.mass;
      bone.angularVelocity += impulse.torque / bone.mass;
    }
  }

  /**
   * Add a blood emission point on a bone.
   */
  public addBloodEmitPoint(boneName: string, boneT: number, rate: number, duration: number): void {
    this.bloodEmitPoints.push({
      boneName,
      boneT,
      rate,
      duration,
      elapsed: 0,
      emitAccumulator: 0,
    });
  }

  /**
   * Step the ragdoll physics simulation.
   * @param deltaTime - Frame time in milliseconds
   * @returns true if ragdoll is still active, false if settled
   */
  public update(deltaTime: number): boolean {
    if (this.settled) return false;

    this.elapsedTime += deltaTime;
    const dt = deltaTime / 1000;

    // Apply gravity to all bones
    for (const bone of this.bones.values()) {
      if (bone.detached) {
        // Detached bones get extra gravity and less damping
        bone.vy += this.gravity * 1.3 * dt;
        bone.vx *= 0.995;
        bone.vy *= 0.995;
      } else {
        bone.vy += this.gravity * dt;
      }
    }

    // Integrate velocities
    for (const bone of this.bones.values()) {
      bone.x += bone.vx * dt;
      bone.y += bone.vy * dt;
      bone.angle += bone.angularVelocity * dt;

      // Apply damping
      bone.vx *= this.damping;
      bone.vy *= this.damping;
      bone.angularVelocity *= this.damping * 0.98; // Extra angular damping
    }

    // Enforce parent-child constraints (keep children attached)
    this.enforceHierarchy();

    // Apply joint angle constraints
    this.enforceJointConstraints();

    // Ground collision
    this.handleGroundCollision();

    // Update blood emission
    this.updateBloodEmission(deltaTime);

    // Check for settlement
    this.checkSettlement();

    return !this.settled;
  }

  /**
   * Enforce parent-child bone hierarchy (children stay attached to parent tips).
   */
  private enforceHierarchy(): void {
    for (let i = 1; i < this.boneOrder.length; i++) {
      const bone = this.bones.get(this.boneOrder[i]);
      if (!bone?.parent || bone.detached) continue;

      const parent = this.bones.get(bone.parent);
      if (!parent) continue;

      // Bone should be attached at parent's tip
      const tipX = parent.x + Math.cos(parent.angle) * parent.length * bone.attachT;
      const tipY = parent.y + Math.sin(parent.angle) * parent.length * bone.attachT;

      // Calculate correction needed
      const corrX = tipX - bone.x;
      const corrY = tipY - bone.y;

      // Apply correction (split between parent and child based on mass ratio)
      const totalMass = parent.mass + bone.mass;
      const childRatio = parent.mass / totalMass;
      const parentRatio = bone.mass / totalMass;

      bone.x += corrX * childRatio;
      bone.y += corrY * childRatio;
      parent.x -= corrX * parentRatio * 0.3; // Parents move less
      parent.y -= corrY * parentRatio * 0.3;

      // Transfer some velocity through the joint
      bone.vx += corrX * 5; // Constraint velocity correction
      bone.vy += corrY * 5;
    }
  }

  /**
   * Enforce joint angle constraints between connected bones.
   */
  private enforceJointConstraints(): void {
    for (const constraint of this.constraints) {
      const boneA = this.bones.get(constraint.boneA);
      const boneB = this.bones.get(constraint.boneB);
      if (!boneA || !boneB || boneA.detached || boneB.detached) continue;

      // Calculate relative angle
      let relAngle = boneB.angle - boneA.angle;

      // Normalize to -PI to PI
      while (relAngle > Math.PI) relAngle -= Math.PI * 2;
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;

      // Clamp to constraint limits
      let clamped = relAngle;
      if (relAngle < constraint.minAngle) {
        clamped = constraint.minAngle;
      } else if (relAngle > constraint.maxAngle) {
        clamped = constraint.maxAngle;
      }

      if (clamped !== relAngle) {
        const correction = (clamped - relAngle) * constraint.stiffness;
        boneA.angle -= correction * 0.3;
        boneB.angle += correction * 0.7;

        // Dampen angular velocity at constraint limits
        boneB.angularVelocity *= 0.8;
      }
    }
  }

  /**
   * Handle ground collision for all bones.
   */
  private handleGroundCollision(): void {
    for (const bone of this.bones.values()) {
      // Check bone joint position
      if (bone.y > this.groundY) {
        bone.y = this.groundY;
        bone.vy *= -this.bounce;
        bone.vx *= this.friction;
        bone.angularVelocity *= this.friction;
      }

      // Check bone tip position
      const tipY = bone.y + Math.sin(bone.angle) * bone.length;
      if (tipY > this.groundY) {
        this.reportGroundHit(bone, tipY);
        // Push bone up and add rotation correction
        const penetration = tipY - this.groundY;
        bone.y -= penetration * 0.5;
        bone.angle -= penetration * 0.02;
        bone.vy *= -this.bounce;
        bone.angularVelocity *= 0.7;
      }
    }
  }

  /** Throw a splat where a bleeding bone hits the ground hard. */
  private reportGroundHit(bone: RagdollBone, tipY: number): void {
    if (!this.onGroundHit || bone.vy < 70) {
      return;
    }
    const last = this.groundHitCooldown.get(bone.name) ?? -1000;
    if (this.elapsedTime - last < 220) {
      return;
    }
    const bleeding = this.bloodEmitPoints.some(
      p => p.boneName === bone.name || this.bones.get(p.boneName)?.parent === bone.name
    );
    if (!bleeding && !bone.detached) {
      return;
    }
    this.groundHitCooldown.set(bone.name, this.elapsedTime);
    this.onGroundHit(bone.x + Math.cos(bone.angle) * bone.length, tipY, bone.vy);
  }

  /**
   * Check if the ragdoll has settled (low total kinetic energy).
   */
  private checkSettlement(): void {
    // Force settle after max duration
    if (this.elapsedTime > this.maxDuration) {
      this.settled = true;
      return;
    }

    // Don't settle too early
    if (this.elapsedTime < 400) return;

    let totalEnergy = 0;
    for (const bone of this.bones.values()) {
      totalEnergy += Math.abs(bone.vx) + Math.abs(bone.vy) + Math.abs(bone.angularVelocity) * 10;
    }

    if (totalEnergy < this.settlementThreshold) {
      this.settled = true;
    }
  }

  /**
   * Update blood emission from wound points.
   */
  private updateBloodEmission(deltaTime: number): void {
    if (!this.onBloodEmit) return;

    for (let i = this.bloodEmitPoints.length - 1; i >= 0; i--) {
      const point = this.bloodEmitPoints[i];
      point.elapsed += deltaTime;

      if (point.elapsed > point.duration) {
        this.bloodEmitPoints.splice(i, 1);
        continue;
      }

      const bone = this.bones.get(point.boneName);
      if (!bone) continue;

      // Calculate emission position along bone
      const emitX = bone.x + Math.cos(bone.angle) * bone.length * point.boneT;
      const emitY = bone.y + Math.sin(bone.angle) * bone.length * point.boneT;

      // Accumulate emission timing
      point.emitAccumulator += deltaTime;
      const emitInterval = 1000 / point.rate;

      while (point.emitAccumulator >= emitInterval) {
        point.emitAccumulator -= emitInterval;

        // Emit blood with bone's velocity plus some random spread
        const spreadAngle = (Math.random() - 0.5) * 1.5;
        const spreadSpeed = 20 + Math.random() * 40;
        this.onBloodEmit(
          emitX,
          emitY,
          bone.vx * 0.3 + Math.cos(bone.angle + spreadAngle) * spreadSpeed,
          bone.vy * 0.3 + Math.sin(bone.angle + spreadAngle) * spreadSpeed
        );
      }
    }
  }

  /**
   * Detach a bone from its parent (for explosive deaths).
   */
  public detachBone(boneName: string): void {
    const bone = this.bones.get(boneName);
    if (bone) {
      bone.detached = true;
    }
  }

  /** A limb lost while alive: hide it (and its lower segment) and leave only the stump. */
  public removeLimb(boneName: string): void {
    for (const bone of this.bones.values()) {
      if (bone.name === boneName || bone.parent === boneName) {
        bone.hidden = true;
      }
    }
  }

  public setStyle(style: RagdollStyle): void {
    this.style = style;
  }

  /**
   * Render the ragdoll skeleton onto a Graphics object.
   * Draws living-like silhouettes by bone name while keeping physics endpoints.
   */
  public render(graphics: Graphics, alpha = 1): void {
    for (const name of RENDER_ORDER) {
      const bone = this.bones.get(name);
      if (!bone || bone.hidden) continue;
      if (name === 'head') {
        this.drawHead(graphics, bone, alpha);
      } else if (name === 'torso') {
        this.drawTorso(graphics, bone, alpha);
      } else {
        this.drawLimb(graphics, bone, alpha);
      }
    }
  }

  private shade(color: number, factor = 1): number {
    let c = this.style.tint === undefined ? color : multiplyTint(color, this.style.tint);
    if (factor !== 1) {
      const r = Math.round(((c >> 16) & 255) * factor);
      const g = Math.round(((c >> 8) & 255) * factor);
      const b = Math.round((c & 255) * factor);
      c = (r << 16) | (g << 8) | b;
    }
    return c;
  }

  /** Capsule from (x1,y1) to (x2,y2) with round ends, outlined in a first pass. */
  private capsule(
    g: Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    r1: number,
    r2: number,
    color: number,
    alpha: number
  ): void {
    const ang = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
    const px = Math.cos(ang);
    const py = Math.sin(ang);
    for (const [grow, c, a] of [
      [0.7, 0x000000, 0.5],
      [0, color, 0.96],
    ] as const) {
      const ra = r1 + grow;
      const rb = r2 + grow;
      g.poly([
        x1 + px * ra,
        y1 + py * ra,
        x2 + px * rb,
        y2 + py * rb,
        x2 - px * rb,
        y2 - py * rb,
        x1 - px * ra,
        y1 - py * ra,
      ]).fill({ color: c, alpha: alpha * a });
      g.circle(x1, y1, ra).fill({ color: c, alpha: alpha * a });
      g.circle(x2, y2, rb).fill({ color: c, alpha: alpha * a });
    }
  }

  private drawLimb(g: Graphics, bone: RagdollBone, alpha: number): void {
    const isLower = bone.name.startsWith('forearm') || bone.name.startsWith('shin');
    const isArm = bone.name.includes('arm');
    const farSide = bone.name.endsWith('_l');
    const base = this.shade(bone.color, farSide ? 0.82 : 1);
    const x2 = bone.x + Math.cos(bone.angle) * bone.length;
    const y2 = bone.y + Math.sin(bone.angle) * bone.length;
    const r1 = (bone.width / 2) * (isLower ? 0.85 : 1);
    const r2 = r1 * (isLower ? 0.7 : 0.85);

    this.capsule(g, bone.x, bone.y, x2, y2, r1, r2, base, alpha);

    // Armour: a plate over the middle of the shin / forearm, a pauldron-style cap on the upper arm
    if (this.style.armor !== undefined) {
      const plate = this.shade(this.style.armor, farSide ? 0.85 : 1);
      const t0 = isLower ? 0.2 : 0.1;
      const t1 = isLower ? 0.85 : 0.9;
      this.capsule(
        g,
        bone.x + (x2 - bone.x) * t0,
        bone.y + (y2 - bone.y) * t0,
        bone.x + (x2 - bone.x) * t1,
        bone.y + (y2 - bone.y) * t1,
        r1 * 1.05,
        r2 * 1.05,
        plate,
        alpha * 0.9
      );
    }

    // Elbow / knee / shoulder / hip joint
    g.circle(bone.x, bone.y, r1 * 0.55).fill({
      color: this.shade(this.darkColor),
      alpha: alpha * 0.7,
    });

    // Severed end
    if (bone.detached && !isLower) {
      g.circle(bone.x, bone.y, r1 * 0.9).fill({ color: this.bloodColor(), alpha: alpha * 0.9 });
      g.circle(bone.x, bone.y, r1 * 0.4).fill({ color: 0xe8dcc0, alpha: alpha * 0.9 });
    }

    if (!isLower) return;
    const angle = bone.angle;
    if (isArm) {
      g.circle(x2, y2, r2 * 1.35).fill({ color: base, alpha: alpha * 0.96 });
      for (let i = -1; i <= 1; i++) {
        const fx = x2 + Math.cos(angle + Math.PI / 2) * i * r2 * 0.7;
        const fy = y2 + Math.sin(angle + Math.PI / 2) * i * r2 * 0.7;
        g.moveTo(fx, fy)
          .lineTo(fx + Math.cos(angle) * r2 * 1.7, fy + Math.sin(angle) * r2 * 1.7)
          .stroke({ color: this.shade(this.darkColor), width: 0.9, alpha: alpha * 0.85 });
      }
    } else {
      // Boot, pointing sideways along the ground rather than down the shin
      const bx = x2 + Math.cos(angle) * 0.5;
      const by = y2 + Math.sin(angle) * 0.5;
      g.ellipse(bx + r2 * 0.6, by, r2 * 1.9, r2 * 1.05).fill({
        color: this.shade(this.darkColor, 0.9),
        alpha: alpha * 0.96,
      });
    }
  }

  private bloodColor(): number {
    return this.style.blood ?? 0x7a0a0a;
  }

  private drawHead(g: Graphics, bone: RagdollBone, alpha: number): void {
    const tipX = bone.x + Math.cos(bone.angle) * bone.length;
    const tipY = bone.y + Math.sin(bone.angle) * bone.length;
    const r = bone.width * 0.55;
    const skin = this.shade(bone.color);

    // Neck
    this.capsule(
      g,
      bone.x,
      bone.y,
      tipX,
      tipY,
      bone.width * 0.17,
      bone.width * 0.15,
      this.shade(bone.color, 0.85),
      alpha
    );

    if (bone.detached) {
      g.circle(bone.x, bone.y, bone.width * 0.2).fill({
        color: this.bloodColor(),
        alpha: alpha * 0.9,
      });
    }

    // Cranium + jaw, drawn around the tip and rotated with the bone so it tumbles with the head
    const ca = Math.cos(bone.angle + Math.PI / 2);
    const sa = Math.sin(bone.angle + Math.PI / 2);
    const at = (lx: number, ly: number): [number, number] => [
      tipX + ca * lx - sa * ly,
      tipY + sa * lx + ca * ly,
    ];
    g.circle(tipX, tipY, r + 0.7).fill({ color: 0x000000, alpha: alpha * 0.5 });
    g.ellipse(tipX, tipY, r, r * 1.05).fill({ color: skin, alpha: alpha * 0.97 });
    const [jx, jy] = at(0, r * 0.55);
    g.ellipse(jx, jy, r * 0.62, r * 0.36).fill({
      color: this.shade(bone.color, 0.9),
      alpha: alpha * 0.95,
    });

    // Dead eyes: the glow gutters out, leaving dull sockets
    const dim = Math.max(0.12, 1 - this.elapsedTime / 700);
    for (const side of [-1, 1]) {
      const [ex, ey] = at(side * r * 0.38, -r * 0.1);
      g.circle(ex, ey, r * 0.22).fill({ color: 0x000000, alpha: alpha * 0.9 });
      g.circle(ex, ey, r * 0.12).fill({ color: this.eyeColor, alpha: alpha * dim });
    }
    const [mx, my] = at(0, r * 0.6);
    g.ellipse(mx, my, r * 0.4, r * 0.16).fill({ color: 0x000000, alpha: alpha * 0.85 });

    if (this.style.headWound) {
      const [hx, hy] = at(r * 0.15, -r * 0.55);
      g.circle(hx, hy, r * 0.3).fill({ color: this.bloodColor(), alpha: alpha * 0.95 });
      g.circle(hx, hy, r * 0.13).fill({ color: 0x1a0505, alpha: alpha });
    }
  }

  private drawTorso(g: Graphics, bone: RagdollBone, alpha: number): void {
    const len = bone.length;
    const ux = Math.cos(bone.angle);
    const uy = Math.sin(bone.angle);
    const px = -uy;
    const py = ux;
    const w = bone.width / 2;
    const at = (t: number, s: number): [number, number] => [
      bone.x + ux * len * t + px * w * s,
      bone.y + uy * len * t + py * w * s,
    ];
    // Shoulders wide, waist narrow, hips a little wider again
    const profile: Array<[number, number]> = [
      [0, 0.92],
      [0.12, 1.05],
      [0.45, 0.9],
      [0.72, 0.7],
      [1, 0.82],
    ];
    const left = profile.map(([t, s]) => at(t, s));
    const right = profile.map(([t, s]) => at(t, -s)).reverse();
    const outline = [...left, ...right].flat();
    const body = this.shade(bone.color);

    g.poly(outline).fill({ color: body, alpha: alpha * 0.97 });
    g.poly(outline).stroke({ color: 0x000000, width: 0.9, alpha: alpha * 0.55 });

    // Armour plates or ribs
    if (this.style.armor !== undefined) {
      const plate = this.shade(this.style.armor);
      const top = profile.slice(0, 3).map(([t, s]) => at(t + 0.04, s * 0.85));
      const topR = profile
        .slice(0, 3)
        .map(([t, s]) => at(t + 0.04, -s * 0.85))
        .reverse();
      g.poly([...top, ...topR].flat()).fill({ color: plate, alpha: alpha * 0.85 });
      g.poly([...top, ...topR].flat()).stroke({ color: 0x000000, width: 0.6, alpha: alpha * 0.5 });
    } else {
      for (let i = 1; i <= 3; i++) {
        const [ax, ay] = at(0.12 + i * 0.12, 0.6);
        const [bx, by] = at(0.12 + i * 0.12, -0.6);
        g.moveTo(ax, ay)
          .lineTo(bx, by)
          .stroke({ color: this.shade(this.darkColor), width: 0.7, alpha: alpha * 0.4 });
      }
    }
    // Belt
    const [b1x, b1y] = at(0.88, 0.8);
    const [b2x, b2y] = at(0.88, -0.8);
    g.moveTo(b1x, b1y)
      .lineTo(b2x, b2y)
      .stroke({ color: this.shade(this.darkColor, 0.8), width: 1.6, alpha: alpha * 0.85 });

    // Raw stumps where limbs came off (lost alive or torn off in the blast)
    for (const child of this.bones.values()) {
      if (child.parent !== 'torso' || !(child.hidden || child.detached)) continue;
      const stump = at(
        child.attachT,
        child.name.endsWith('_l') ? 0.85 : child.name.endsWith('_r') ? -0.85 : 0
      );
      if (child.name === 'head') {
        const [hx, hy] = at(0, 0);
        g.circle(hx, hy, w * 0.4).fill({ color: this.bloodColor(), alpha: alpha * 0.95 });
        continue;
      }
      g.circle(stump[0], stump[1], child.width * 0.55).fill({
        color: this.bloodColor(),
        alpha: alpha * 0.92,
      });
      g.circle(stump[0], stump[1], child.width * 0.25).fill({
        color: 0xe8dcc0,
        alpha: alpha * 0.8,
      });
    }

    // Killer-specific wounds
    for (const wound of this.style.torsoWounds ?? []) {
      const [wx, wy] = at(wound.t, wound.s);
      switch (wound.kind) {
        case 'burst':
          g.circle(wx, wy, wound.radius * 1.4).fill({
            color: this.bloodColor(),
            alpha: alpha * 0.85,
          });
          g.circle(wx, wy, wound.radius * 0.75).fill({ color: 0x2a0606, alpha: alpha * 0.95 });
          g.circle(wx, wy, wound.radius * 0.3).fill({ color: 0xe8dcc0, alpha: alpha * 0.8 });
          break;
        case 'hole':
          g.circle(wx, wy, wound.radius).fill({ color: this.bloodColor(), alpha: alpha * 0.9 });
          g.circle(wx, wy, wound.radius * 0.5).fill({ color: 0x1a0505, alpha: alpha });
          break;
        case 'char':
          g.circle(wx, wy, wound.radius * 1.3).fill({ color: 0x0d0d0d, alpha: alpha * 0.55 });
          g.circle(wx + 0.8, wy - 0.6, wound.radius * 0.7).fill({
            color: 0x050505,
            alpha: alpha * 0.6,
          });
          break;
        case 'arc':
          g.moveTo(wx - wound.radius, wy - wound.radius * 0.5)
            .lineTo(wx, wy + wound.radius * 0.2)
            .lineTo(wx + wound.radius * 0.4, wy - wound.radius * 0.3)
            .lineTo(wx + wound.radius, wy + wound.radius * 0.6)
            .stroke({ color: 0x40e0e0, width: 0.9, alpha: alpha * 0.55 });
          break;
      }
    }
  }

  /**
   * Get the center of mass position (for camera/effects).
   */
  public getCenterOfMass(): { x: number; y: number } {
    let totalMass = 0;
    let cx = 0;
    let cy = 0;

    for (const bone of this.bones.values()) {
      const midX = bone.x + Math.cos(bone.angle) * bone.length * 0.5;
      const midY = bone.y + Math.sin(bone.angle) * bone.length * 0.5;
      cx += midX * bone.mass;
      cy += midY * bone.mass;
      totalMass += bone.mass;
    }

    return totalMass > 0 ? { x: cx / totalMass, y: cy / totalMass } : { x: 0, y: 0 };
  }

  /**
   * Get bone tip position (for blood/particle effects).
   */
  public getBoneTipPosition(boneName: string): { x: number; y: number } | null {
    const bone = this.bones.get(boneName);
    if (!bone) return null;
    return {
      x: bone.x + Math.cos(bone.angle) * bone.length,
      y: bone.y + Math.sin(bone.angle) * bone.length,
    };
  }

  /**
   * Get a bone's current velocity (for directional blood).
   */
  public getBoneVelocity(boneName: string): { vx: number; vy: number } | null {
    const bone = this.bones.get(boneName);
    if (!bone) return null;
    return { vx: bone.vx, vy: bone.vy };
  }

  /**
   * Check if ragdoll has settled.
   */
  public isSettled(): boolean {
    return this.settled;
  }

  /**
   * Get all bone names for iteration.
   */
  public getBoneNames(): string[] {
    return this.boneOrder;
  }

  /**
   * Get a bone by name.
   */
  public getBone(name: string): RagdollBone | undefined {
    return this.bones.get(name);
  }

  /**
   * Get the final resting rotation of the skeleton (for corpse orientation).
   */
  public getFinalRotation(): number {
    const torso = this.bones.get('torso');
    return torso ? torso.angle : 0;
  }
}
