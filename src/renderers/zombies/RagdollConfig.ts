import type {
  RagdollImpulse,
  RagdollSkeletonConfig,
  RagdollStyle,
  TorsoWound,
} from './RagdollSkeleton';

/**
 * Zombie body color palettes per type for ragdoll bones.
 */
const ZOMBIE_COLORS = {
  // Aligned with living renderer palettes
  basic: { skin: 0x2d5016, dark: 0x1a3010, accent: 0x2d5016, eye: 0xff0000 },
  fast: { skin: 0x8b4513, dark: 0x5a2a0a, accent: 0x8b4513, eye: 0xff6600 },
  tank: { skin: 0x5a1a1a, dark: 0x3a0a0a, accent: 0x5a1a1a, eye: 0xff0000 },
  armored: { skin: 0x2d5016, dark: 0x1a3010, accent: 0x4a4a4a, eye: 0xff6600 },
  swarm: { skin: 0x6a7a2a, dark: 0x4a5a1a, accent: 0x6a7a2a, eye: 0xffff00 },
  stealth: { skin: 0x3a2a4a, dark: 0x2a1a3a, accent: 0xcccccc, eye: 0x9966ff },
  mechanical: { skin: 0x3a4a5a, dark: 0x2a3a4a, accent: 0x5a6a7a, eye: 0x00ffff },
  boss: { skin: 0x1a0a12, dark: 0x0a0508, accent: 0x1a0a12, eye: 0xffaa00 },
  necroTank: { skin: 0x2a1020, dark: 0x120810, accent: 0x6b0040, eye: 0x66ff88 },
};

/**
 * Create a ragdoll skeleton configuration for a specific zombie type.
 * Each zombie has different proportions, mass, and visual style.
 */
export function createRagdollConfig(zombieType: string, groundY = 20): RagdollSkeletonConfig {
  const colors = getColorsForType(zombieType);
  const scale = getScaleForType(zombieType);
  const massScale = getMassScaleForType(zombieType);

  const limb = (
    name: string,
    parent: string,
    attachT: number,
    angle: number,
    length: number,
    mass: number,
    width: number,
    color = colors.skin
  ) => ({
    name,
    parent,
    offsetX: 0,
    offsetY: 0,
    attachT,
    angle,
    length: length * scale,
    mass: mass * massScale,
    width: width * scale,
    color,
  });

  return {
    bones: [
      // Torso (root): shoulders at the top, hips at the tip
      {
        name: 'torso',
        parent: null,
        offsetX: 0,
        offsetY: -4 * scale,
        angle: Math.PI / 2,
        length: 11 * scale,
        mass: 8 * massScale,
        width: 9 * scale,
        color: colors.skin,
      },
      // Head rises from the shoulders on a short neck
      limb('head', 'torso', 0, -Math.PI / 2, 7, 3, 8),
      // Arms hang from the shoulders (just below the top of the torso), elbow then forearm
      limb('arm_l', 'torso', 0.08, Math.PI * 0.62, 5.5, 1.2, 3.6),
      limb('forearm_l', 'arm_l', 1, Math.PI * 0.55, 5.5, 0.9, 3.2),
      limb('arm_r', 'torso', 0.08, Math.PI * 0.38, 5.5, 1.2, 3.6),
      limb('forearm_r', 'arm_r', 1, Math.PI * 0.45, 5.5, 0.9, 3.2),
      // Legs hang from the hips, knee then shin
      limb('leg_l', 'torso', 1, Math.PI / 2 + 0.12, 5.5, 1.6, 4.6, colors.dark),
      limb('shin_l', 'leg_l', 1, Math.PI / 2 + 0.05, 5.5, 1.1, 4, colors.dark),
      limb('leg_r', 'torso', 1, Math.PI / 2 - 0.12, 5.5, 1.6, 4.6, colors.dark),
      limb('shin_r', 'leg_r', 1, Math.PI / 2 - 0.05, 5.5, 1.1, 4, colors.dark),
    ],
    constraints: [
      // Neck: limited movement
      {
        boneA: 'torso',
        boneB: 'head',
        minAngle: -Math.PI * 0.9,
        maxAngle: -Math.PI * 0.4,
        stiffness: 0.6,
      },
      // Shoulders: wide range
      {
        boneA: 'torso',
        boneB: 'arm_l',
        minAngle: -Math.PI * 0.2,
        maxAngle: Math.PI * 0.8,
        stiffness: 0.3,
      },
      {
        boneA: 'torso',
        boneB: 'arm_r',
        minAngle: -Math.PI * 0.8,
        maxAngle: Math.PI * 0.2,
        stiffness: 0.3,
      },
      // Elbows only fold one way
      { boneA: 'arm_l', boneB: 'forearm_l', minAngle: -2.3, maxAngle: 0.15, stiffness: 0.5 },
      { boneA: 'arm_r', boneB: 'forearm_r', minAngle: -0.15, maxAngle: 2.3, stiffness: 0.5 },
      // Hips: limited range
      { boneA: 'torso', boneB: 'leg_l', minAngle: -0.8, maxAngle: 0.8, stiffness: 0.5 },
      { boneA: 'torso', boneB: 'leg_r', minAngle: -0.8, maxAngle: 0.8, stiffness: 0.5 },
      // Knees only fold backwards
      { boneA: 'leg_l', boneB: 'shin_l', minAngle: -0.1, maxAngle: 2.2, stiffness: 0.55 },
      { boneA: 'leg_r', boneB: 'shin_r', minAngle: -2.2, maxAngle: 0.1, stiffness: 0.55 },
    ],
    gravity: getGravityForType(zombieType),
    damping: getDampingForType(zombieType),
    groundY: groundY * scale,
    bounce: 0.2,
    friction: 0.7,
    eyeColor: colors.eye,
    darkColor: colors.dark,
  };
}

function getColorsForType(type: string): {
  skin: number;
  dark: number;
  accent: number;
  eye: number;
} {
  switch (type) {
    case 'Fast':
      return ZOMBIE_COLORS.fast;
    case 'Tank':
      return ZOMBIE_COLORS.tank;
    case 'Armored':
      return ZOMBIE_COLORS.armored;
    case 'Swarm':
      return ZOMBIE_COLORS.swarm;
    case 'Stealth':
      return ZOMBIE_COLORS.stealth;
    case 'Mechanical':
      return ZOMBIE_COLORS.mechanical;
    case 'Boss':
      return ZOMBIE_COLORS.boss;
    case 'NecroTank':
      return ZOMBIE_COLORS.necroTank;
    default:
      return ZOMBIE_COLORS.basic;
  }
}

function getScaleForType(type: string): number {
  switch (type) {
    case 'Boss':
      return 2.0;
    case 'NecroTank':
      return 1.75;
    case 'Tank':
      return 1.5;
    case 'Armored':
      return 1.2;
    case 'Swarm':
      return 0.6;
    case 'Mechanical':
      return 1.15;
    default:
      return 1.0;
  }
}

function getMassScaleForType(type: string): number {
  switch (type) {
    case 'Boss':
      return 4.0;
    case 'NecroTank':
      return 3.5;
    case 'Tank':
      return 2.5;
    case 'Armored':
      return 1.8;
    case 'Swarm':
      return 0.4;
    case 'Fast':
      return 0.7;
    default:
      return 1.0;
  }
}

function getGravityForType(type: string): number {
  switch (type) {
    case 'Boss':
      return 700;
    case 'NecroTank':
      return 680;
    case 'Tank':
      return 600;
    case 'Swarm':
      return 350;
    case 'Fast':
      return 400;
    default:
      return 500;
  }
}

function getDampingForType(type: string): number {
  switch (type) {
    case 'Boss':
      return 0.97; // Extremely heavy
    case 'NecroTank':
      return 0.965;
    case 'Tank':
      return 0.96; // Heavy, slow to stop
    case 'Fast':
      return 0.93; // Light, stops quickly
    case 'Swarm':
      return 0.92;
    default:
      return 0.95;
  }
}

/**
 * Calculate death impulses based on tower type and impact direction.
 * The direction angle points FROM the tower/projectile TOWARD the zombie.
 */
export function calculateDeathImpulses(
  killerType: string,
  impactAngle: number,
  zombieType: string
): RagdollImpulse[] {
  const impulses: RagdollImpulse[] = [];
  const massScale = getMassScaleForType(zombieType);
  // More force needed for heavier zombies, but cap it
  const forceMultiplier = Math.min(1 / Math.sqrt(massScale), 2.0);

  // Impact direction components (direction zombie should fly)
  const dirX = Math.cos(impactAngle);
  const dirY = Math.sin(impactAngle);

  switch (killerType) {
    case 'Shotgun':
      // Devastating knockback - zombie flies backward from blast
      impulses.push(
        {
          boneName: 'torso',
          forceX: dirX * 350 * forceMultiplier,
          forceY: dirY * 250 * forceMultiplier - 120,
          torque: (Math.random() - 0.5) * 8,
        },
        {
          boneName: 'head',
          forceX: dirX * 400 * forceMultiplier,
          forceY: -180 * forceMultiplier,
          torque: dirX * 6,
        },
        {
          boneName: 'arm_l',
          forceX: dirX * 200 + (Math.random() - 0.5) * 100,
          forceY: -100 - Math.random() * 80,
          torque: (Math.random() - 0.5) * 10,
        },
        {
          boneName: 'arm_r',
          forceX: dirX * 200 + (Math.random() - 0.5) * 100,
          forceY: -100 - Math.random() * 80,
          torque: (Math.random() - 0.5) * 10,
        }
      );
      break;

    case 'Sniper':
      // Precise headshot - head violently jerks, body has delayed reaction
      impulses.push(
        {
          boneName: 'head',
          forceX: dirX * 500 * forceMultiplier,
          forceY: -200 * forceMultiplier,
          torque: dirX * 12,
        },
        {
          boneName: 'torso',
          forceX: dirX * 60,
          forceY: -20,
          torque: dirX * 1.5,
        }
      );
      break;

    case 'Grenade':
      // Explosive - massive upward and outward scatter from center
      {
        const explodeAngle = Math.random() * Math.PI * 2;
        const explodeForce = 300 + Math.random() * 200;
        impulses.push(
          {
            boneName: 'torso',
            forceX: Math.cos(explodeAngle) * explodeForce * 0.7,
            forceY: -explodeForce,
            torque: (Math.random() - 0.5) * 15,
          },
          {
            boneName: 'head',
            forceX: Math.cos(explodeAngle + 0.5) * explodeForce,
            forceY: -explodeForce * 1.2,
            torque: (Math.random() - 0.5) * 20,
          },
          {
            boneName: 'arm_l',
            forceX: -explodeForce * 0.8,
            forceY: -explodeForce * 0.6,
            torque: Math.random() * 15,
          },
          {
            boneName: 'arm_r',
            forceX: explodeForce * 0.8,
            forceY: -explodeForce * 0.6,
            torque: -Math.random() * 15,
          },
          {
            boneName: 'leg_l',
            forceX: -explodeForce * 0.5 + (Math.random() - 0.5) * 100,
            forceY: -explodeForce * 0.4,
            torque: (Math.random() - 0.5) * 10,
          },
          {
            boneName: 'leg_r',
            forceX: explodeForce * 0.5 + (Math.random() - 0.5) * 100,
            forceY: -explodeForce * 0.4,
            torque: (Math.random() - 0.5) * 10,
          }
        );
      }
      break;

    case 'Tesla':
      // Electric convulsion - rapid twitching + upward jolt
      impulses.push(
        {
          boneName: 'torso',
          forceX: (Math.random() - 0.5) * 150,
          forceY: -200,
          torque: (Math.random() - 0.5) * 20,
        },
        {
          boneName: 'head',
          forceX: (Math.random() - 0.5) * 200,
          forceY: -150,
          torque: (Math.random() - 0.5) * 25,
        },
        {
          boneName: 'arm_l',
          forceX: -150 - Math.random() * 100,
          forceY: -80,
          torque: 10 + Math.random() * 10,
        },
        {
          boneName: 'arm_r',
          forceX: 150 + Math.random() * 100,
          forceY: -80,
          torque: -10 - Math.random() * 10,
        }
      );
      break;

    case 'Flame':
      // Slow crumple - minimal force, zombie collapses in place
      impulses.push(
        {
          boneName: 'torso',
          forceX: (Math.random() - 0.5) * 30,
          forceY: -15,
          torque: (Math.random() - 0.5) * 3,
        },
        {
          boneName: 'head',
          forceX: (Math.random() - 0.5) * 20,
          forceY: 10,
          torque: (Math.random() - 0.5) * 4,
        },
        {
          boneName: 'arm_l',
          forceX: -20,
          forceY: 20,
          torque: 2,
        },
        {
          boneName: 'arm_r',
          forceX: 20,
          forceY: 20,
          torque: -2,
        }
      );
      break;

    default:
      // Generic directional death (turret, default)
      impulses.push(
        {
          boneName: 'torso',
          forceX: dirX * 180 * forceMultiplier,
          forceY: dirY * 120 * forceMultiplier - 80,
          torque: (Math.random() - 0.5) * 6,
        },
        {
          boneName: 'head',
          forceX: dirX * 200 * forceMultiplier + (Math.random() - 0.5) * 40,
          forceY: -100 * forceMultiplier,
          torque: (Math.random() - 0.5) * 8,
        },
        {
          boneName: 'arm_l',
          forceX: dirX * 80 + (Math.random() - 0.5) * 60,
          forceY: -50 - Math.random() * 40,
          torque: (Math.random() - 0.5) * 6,
        },
        {
          boneName: 'arm_r',
          forceX: dirX * 80 + (Math.random() - 0.5) * 60,
          forceY: -50 - Math.random() * 40,
          torque: (Math.random() - 0.5) * 6,
        }
      );
  }

  return impulses;
}

/**
 * Get which bones should detach for extreme explosive deaths.
 */
export function getDetachableBones(killerType: string): string[] {
  switch (killerType) {
    case 'Grenade': // Random chance to detach limbs on grenade kills
      {
        const detachable: string[] = [];
        if (Math.random() > 0.4) detachable.push('arm_l');
        if (Math.random() > 0.4) detachable.push('arm_r');
        if (Math.random() > 0.7) detachable.push('head');
        if (Math.random() > 0.6) detachable.push('leg_l');
        if (Math.random() > 0.6) detachable.push('leg_r');
        return detachable;
      }
    case 'Tesla': // Rare chance of limb detachment on tesla
      {
        const detachable: string[] = [];
        if (Math.random() > 0.8) detachable.push('arm_l');
        if (Math.random() > 0.8) detachable.push('arm_r');
        return detachable;
      }
    case 'Shotgun': // Rare but violent dismemberment
      {
        const detachable: string[] = [];
        if (Math.random() > 0.7) detachable.push('arm_l');
        if (Math.random() > 0.7) detachable.push('arm_r');
        return detachable;
      }
    default:
      return [];
  }
}

/**
 * Get blood emission configuration for a death type.
 * More violent deaths = more blood emission points.
 */
export function getDeathBloodConfig(killerType: string): Array<{
  boneName: string;
  boneT: number;
  rate: number;
  duration: number;
}> {
  switch (killerType) {
    case 'Shotgun':
      return [
        { boneName: 'torso', boneT: 0.5, rate: 30, duration: 1200 },
        { boneName: 'head', boneT: 0.8, rate: 20, duration: 800 },
        { boneName: 'torso', boneT: 0.2, rate: 15, duration: 1000 },
      ];
    case 'Sniper':
      return [
        { boneName: 'head', boneT: 1.0, rate: 40, duration: 600 },
        { boneName: 'head', boneT: 0.5, rate: 25, duration: 800 },
      ];
    case 'Grenade':
      return [
        { boneName: 'torso', boneT: 0.5, rate: 25, duration: 1500 },
        { boneName: 'arm_l', boneT: 0.5, rate: 15, duration: 1000 },
        { boneName: 'arm_r', boneT: 0.5, rate: 15, duration: 1000 },
        { boneName: 'leg_l', boneT: 0.5, rate: 10, duration: 800 },
        { boneName: 'leg_r', boneT: 0.5, rate: 10, duration: 800 },
      ];
    case 'Tesla':
      // Less blood, more charred
      return [{ boneName: 'torso', boneT: 0.3, rate: 8, duration: 600 }];
    case 'Flame':
      // Minimal blood - cauterized
      return [{ boneName: 'torso', boneT: 0.5, rate: 5, duration: 400 }];
    default:
      return [
        { boneName: 'torso', boneT: 0.5, rate: 20, duration: 1000 },
        { boneName: 'head', boneT: 0.7, rate: 12, duration: 700 },
      ];
  }
}

/**
 * What this particular death looks like: wounds from the weapon that killed it, burn/charring,
 * and blood colour. Random placement is seeded by the caller's randomness, not fixed.
 */
export function createRagdollStyle(zombieType: string, killerType: string): RagdollStyle {
  const style: RagdollStyle = {};
  const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
  if (zombieType === 'Armored') {
    style.armor = 0x5a5a5a;
  }
  if (zombieType === 'Mechanical') {
    style.blood = 0x1a1a1a;
  } else if (zombieType === 'NecroTank') {
    style.blood = 0x3a0a2a;
  }
  const wounds: TorsoWound[] = [];
  switch (killerType) {
    case 'Shotgun':
      for (let i = 0; i < 3; i++) {
        wounds.push({ t: rnd(0.2, 0.6), s: rnd(-0.6, 0.6), radius: rnd(1.4, 2.2), kind: 'burst' });
      }
      for (let i = 0; i < 4; i++) {
        wounds.push({ t: rnd(0.1, 0.8), s: rnd(-0.8, 0.8), radius: 0.8, kind: 'hole' });
      }
      break;
    case 'Sniper':
      style.headWound = true;
      break;
    case 'Grenade':
      for (let i = 0; i < 3; i++) {
        wounds.push({ t: rnd(0.1, 0.9), s: rnd(-0.7, 0.7), radius: rnd(1.5, 2.6), kind: 'char' });
      }
      wounds.push({ t: 0.45, s: rnd(-0.3, 0.3), radius: 2.4, kind: 'burst' });
      break;
    case 'Flame':
      style.tint = 0x555555;
      for (let i = 0; i < 4; i++) {
        wounds.push({ t: rnd(0.1, 0.9), s: rnd(-0.8, 0.8), radius: rnd(1.5, 2.8), kind: 'char' });
      }
      break;
    case 'Tesla':
      style.tint = 0x8a8a8a;
      for (let i = 0; i < 3; i++) {
        wounds.push({ t: rnd(0.1, 0.9), s: rnd(-0.7, 0.7), radius: rnd(2, 3), kind: 'arc' });
      }
      break;
    default:
      wounds.push({ t: rnd(0.2, 0.6), s: rnd(-0.6, 0.6), radius: 1.2, kind: 'hole' });
      wounds.push({ t: rnd(0.2, 0.7), s: rnd(-0.6, 0.6), radius: 1, kind: 'hole' });
  }
  style.torsoWounds = wounds;
  return style;
}
