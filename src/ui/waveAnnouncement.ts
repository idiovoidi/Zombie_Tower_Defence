export type AnnouncementTone = 'normal' | 'elite' | 'clear';

export interface WaveAnnouncement {
  title: string;
  subtitle: string;
  tone: AnnouncementTone;
}

export interface WaveGroupCount {
  type: string;
  /** Final zombie count for the wave (after scaling), not the authored base count. */
  count: number;
}

const ELITE_LABELS: Readonly<Record<string, string>> = {
  Boss: 'BOSS',
  NecroTank: 'NECRO TANK',
};

/** "NecroTank" -> "NECRO TANK", "Basic" -> "BASIC". */
export function formatZombieName(type: string): string {
  return type.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
}

/**
 * Banner text for the start of a wave. Waves containing a Boss or Necro Tank get an
 * "elite" warning; otherwise the three largest groups are summarised.
 */
export function announceWaveStart(wave: number, groups: WaveGroupCount[]): WaveAnnouncement {
  const present = groups.filter(g => g.count > 0);

  const elites = present.filter(g => g.type in ELITE_LABELS).map(g => ELITE_LABELS[g.type]);
  if (elites.length > 0) {
    return {
      title: `WARNING · WAVE ${wave}`,
      subtitle: `${elites.join(' + ')} INBOUND`,
      tone: 'elite',
    };
  }

  const totals = new Map<string, number>();
  for (const group of present) {
    totals.set(group.type, (totals.get(group.type) ?? 0) + group.count);
  }
  const top = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => `${count} ${formatZombieName(type)}`);

  return {
    title: `WAVE ${wave}`,
    subtitle: top.length > 0 ? top.join(' · ') : 'HOLD THE LINE',
    tone: 'normal',
  };
}

/** Banner text for a cleared wave. */
export function announceWaveClear(wave: number, livesLost: number): WaveAnnouncement {
  return {
    title: `WAVE ${wave} CLEARED`,
    subtitle:
      livesLost <= 0
        ? 'FLAWLESS DEFENSE'
        : `${livesLost} SURVIVOR${livesLost === 1 ? '' : 'S'} LOST`,
    tone: 'clear',
  };
}

export interface BannerPose {
  /** 0 = fully slid out (above), 1 = resting position. */
  slide: number;
  alpha: number;
  done: boolean;
}

const SLIDE_IN_SEC = 0.25;
const FADE_OUT_SEC = 0.4;

/** Timeline for the banner: ease-out slide in, hold fully visible, then fade away. */
export function bannerPose(elapsedSec: number, holdSec: number): BannerPose {
  const holdEnd = SLIDE_IN_SEC + holdSec;
  if (elapsedSec >= holdEnd + FADE_OUT_SEC) {
    return { slide: 1, alpha: 0, done: true };
  }
  const t = Math.min(Math.max(elapsedSec / SLIDE_IN_SEC, 0), 1);
  const slide = 1 - (1 - t) ** 3;
  const alpha = elapsedSec < holdEnd ? 1 : 1 - (elapsedSec - holdEnd) / FADE_OUT_SEC;
  return { slide, alpha, done: false };
}
