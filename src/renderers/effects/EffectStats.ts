/**
 * Configuration for effect limits
 */
export interface EffectLimits {
  maxShellCasings: number;
  maxMuzzleFlashes: number;
  maxBulletTrails: number;
  maxImpactFlashes: number;
  maxScopeGlints: number;
  maxBurningGroundEffects: number;
}

/**
 * Statistics for effect manager
 */
export interface EffectStats {
  currentCounts: {
    shellCasings: number;
    muzzleFlashes: number;
    bulletTrails: number;
    impactFlashes: number;
    scopeGlints: number;
    burningGroundEffects: number;
    total: number;
  };
  limits: EffectLimits;
  poolStats: {
    shellCasings: {
      active: number;
      available: number;
      created: number;
      reused: number;
      reuseRate: number;
    };
    muzzleFlashes: {
      active: number;
      available: number;
      created: number;
      reused: number;
      reuseRate: number;
    };
    bulletTrails: {
      active: number;
      available: number;
      created: number;
      reused: number;
      reuseRate: number;
    };
    impactFlashes: {
      active: number;
      available: number;
      created: number;
      reused: number;
      reuseRate: number;
    };
    scopeGlints: {
      active: number;
      available: number;
      created: number;
      reused: number;
      reuseRate: number;
    };
    burningGroundEffects: {
      active: number;
      available: number;
      created: number;
      reused: number;
      reuseRate: number;
    };
  };
  warnings: string[];
}

/** Fraction of a limit at which a "high count" warning is raised. */
const WARN_FRACTION = 0.8;
const WARN_TOTAL = 100;

type CountKey = Exclude<keyof EffectStats['currentCounts'], 'total'>;
type PoolCounts = { active: number; available: number; created: number; reused: number };

const WARNING_TABLE: ReadonlyArray<readonly [CountKey, keyof EffectLimits, string]> = [
  ['shellCasings', 'maxShellCasings', 'shell casing'],
  ['muzzleFlashes', 'maxMuzzleFlashes', 'muzzle flash'],
  ['bulletTrails', 'maxBulletTrails', 'bullet trail'],
  ['impactFlashes', 'maxImpactFlashes', 'impact flash'],
  ['scopeGlints', 'maxScopeGlints', 'scope glint'],
  ['burningGroundEffects', 'maxBurningGroundEffects', 'burning ground effect'],
];

function reuseRate(stats: { created: number; reused: number }): number {
  const total = stats.created + stats.reused;
  return total > 0 ? (stats.reused / total) * 100 : 0;
}

/** Combine raw counts, limits and pool stats into an EffectStats report with warnings. */
export function buildEffectStats(
  counts: Record<CountKey, number>,
  limits: EffectLimits,
  pools: Record<CountKey, PoolCounts>
): EffectStats {
  const total =
    counts.shellCasings +
    counts.muzzleFlashes +
    counts.bulletTrails +
    counts.impactFlashes +
    counts.scopeGlints +
    counts.burningGroundEffects;

  const warnings: string[] = [];
  for (const [key, limitKey, label] of WARNING_TABLE) {
    if (counts[key] > limits[limitKey] * WARN_FRACTION) {
      warnings.push(`High ${label} count: ${counts[key]}/${limits[limitKey]}`);
    }
  }
  if (total > WARN_TOTAL) {
    warnings.push(`High total effect count: ${total}`);
  }

  const withRate = (p: PoolCounts) => ({ ...p, reuseRate: reuseRate(p) });
  return {
    currentCounts: { ...counts, total },
    limits,
    poolStats: {
      shellCasings: withRate(pools.shellCasings),
      muzzleFlashes: withRate(pools.muzzleFlashes),
      bulletTrails: withRate(pools.bulletTrails),
      impactFlashes: withRate(pools.impactFlashes),
      scopeGlints: withRate(pools.scopeGlints),
      burningGroundEffects: withRate(pools.burningGroundEffects),
    },
    warnings,
  };
}
