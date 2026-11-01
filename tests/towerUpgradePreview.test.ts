import { describe, expect, test } from 'vitest';
import { buildStandardPreview, formatStat, previewStat } from '../src/ui/towerUpgradePreview';

describe('formatStat', () => {
  test('rounds to 2 decimals and drops trailing zeros', () => {
    expect(formatStat(7)).toBe('7');
    expect(formatStat(0.918)).toBe('0.92');
    expect(formatStat(0.85)).toBe('0.85');
    expect(formatStat(1.2)).toBe('1.2');
  });
});

describe('previewStat', () => {
  test('shows an arrow and the next value when it changes', () => {
    expect(previewStat(95, 128)).toBe('→ 128');
    expect(previewStat(0.85, 0.918, '/s')).toBe('→ 0.92/s');
  });

  test('is blank when the displayed value would be identical', () => {
    expect(previewStat(210, 210)).toBe('');
    expect(previewStat(0.851, 0.853)).toBe(''); // same after rounding
  });
});

describe('buildStandardPreview', () => {
  test('one line per stat in DMG / RNG / RATE / HP order, blank where unchanged', () => {
    const lines = buildStandardPreview(
      { damage: 5, range: 210, fireRate: 7 },
      { damage: 6, range: 235, fireRate: 7 }
    );
    expect(lines).toEqual(['→ 6', '→ 235', '', '']);
  });
});
