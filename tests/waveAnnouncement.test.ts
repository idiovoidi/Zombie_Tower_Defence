import { describe, expect, test } from 'vitest';
import {
  announceWaveClear,
  announceWaveStart,
  bannerPose,
  formatZombieName,
} from '../src/ui/waveAnnouncement';

describe('formatZombieName', () => {
  test('uppercases and splits camel case', () => {
    expect(formatZombieName('Basic')).toBe('BASIC');
    expect(formatZombieName('NecroTank')).toBe('NECRO TANK');
  });
});

describe('announceWaveStart', () => {
  test('summarises the three largest groups, biggest first', () => {
    const a = announceWaveStart(5, [
      { type: 'Fast', count: 10 },
      { type: 'Basic', count: 22 },
      { type: 'Tank', count: 3 },
      { type: 'Armored', count: 1 },
    ]);
    expect(a).toEqual({ title: 'WAVE 5', subtitle: '22 BASIC · 10 FAST · 3 TANK', tone: 'normal' });
  });

  test('ignores empty groups and merges duplicate types', () => {
    const a = announceWaveStart(2, [
      { type: 'Basic', count: 4 },
      { type: 'Basic', count: 3 },
      { type: 'Fast', count: 0 },
    ]);
    expect(a.subtitle).toBe('7 BASIC');
  });

  test('boss waves raise an elite warning', () => {
    const a = announceWaveStart(16, [
      { type: 'Basic', count: 99 },
      { type: 'Boss', count: 1 },
    ]);
    expect(a).toEqual({ title: 'WARNING · WAVE 16', subtitle: 'BOSS INBOUND', tone: 'elite' });
  });

  test('boss and necro tank together are both named', () => {
    const a = announceWaveStart(20, [
      { type: 'Boss', count: 2 },
      { type: 'NecroTank', count: 1 },
    ]);
    expect(a.subtitle).toBe('BOSS + NECRO TANK INBOUND');
  });

  test('an elite with a zero count does not trigger the warning', () => {
    const a = announceWaveStart(3, [
      { type: 'Basic', count: 5 },
      { type: 'Boss', count: 0 },
    ]);
    expect(a.tone).toBe('normal');
  });

  test('empty wave falls back to a neutral line', () => {
    expect(announceWaveStart(1, []).subtitle).toBe('HOLD THE LINE');
  });
});

describe('announceWaveClear', () => {
  test('flawless vs losses, with correct pluralisation', () => {
    expect(announceWaveClear(4, 0)).toEqual({
      title: 'WAVE 4 CLEARED',
      subtitle: 'FLAWLESS DEFENSE',
      tone: 'clear',
    });
    expect(announceWaveClear(4, 1).subtitle).toBe('1 SURVIVOR LOST');
    expect(announceWaveClear(4, 7).subtitle).toBe('7 SURVIVORS LOST');
  });
});

describe('bannerPose', () => {
  test('slides in with ease-out, reaching rest at 0.25s', () => {
    expect(bannerPose(0, 2)).toEqual({ slide: 0, alpha: 1, done: false });
    const mid = bannerPose(0.125, 2);
    expect(mid.slide).toBeGreaterThan(0.5); // ease-out: past halfway at half the time
    expect(mid.slide).toBeLessThan(1);
    expect(bannerPose(0.25, 2).slide).toBe(1);
  });

  test('holds fully visible, then fades to nothing and finishes', () => {
    expect(bannerPose(1.5, 2)).toEqual({ slide: 1, alpha: 1, done: false });
    const fading = bannerPose(2.25 + 0.2, 2); // halfway through the 0.4s fade
    expect(fading.alpha).toBeCloseTo(0.5);
    expect(fading.done).toBe(false);
    expect(bannerPose(2.25 + 0.4, 2).done).toBe(true);
    expect(bannerPose(10, 2)).toEqual({ slide: 1, alpha: 0, done: true });
  });

  test('a longer hold delays the fade', () => {
    expect(bannerPose(3, 3).alpha).toBe(1);
    expect(bannerPose(3, 2).alpha).toBeLessThan(1);
  });
});
