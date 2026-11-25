import {
  appendSnappedWaypoint,
  removeLastWaypoint,
  snapToGrid,
  snapWaypoint,
} from '../../src/customMaps/gridSnap';
import { CUSTOM_MAP_DEFAULT_CELL_SIZE } from '../../src/customMaps/types';

describe('gridSnap', () => {
  test('snapToGrid rounds to nearest cell', () => {
    expect(snapToGrid(0, 32)).toBe(0);
    expect(snapToGrid(15, 32)).toBe(0);
    expect(snapToGrid(16, 32)).toBe(32);
    expect(snapToGrid(47, 32)).toBe(32);
    expect(snapToGrid(48, 32)).toBe(64);
    expect(snapToGrid(49, 32)).toBe(64);
  });

  test('snapToGrid uses default cell size', () => {
    expect(snapToGrid(16)).toBe(CUSTOM_MAP_DEFAULT_CELL_SIZE);
  });

  test('snapWaypoint clamps to bounds', () => {
    expect(snapWaypoint(-10, 800, 32, { width: 1024, height: 768 })).toEqual({
      x: 0,
      y: 768,
    });
    expect(snapWaypoint(2000, -5, 32, { width: 1024, height: 768 })).toEqual({
      x: 1024,
      y: 0,
    });
  });

  test('appendSnappedWaypoint skips duplicate consecutive points', () => {
    const first = appendSnappedWaypoint([], 10, 10, 32);
    expect(first).toHaveLength(1);
    const same = appendSnappedWaypoint(first, 10, 10, 32);
    expect(same).toHaveLength(1);
    const next = appendSnappedWaypoint(first, 80, 80, 32);
    expect(next).toHaveLength(2);
  });

  test('removeLastWaypoint pops last point', () => {
    expect(removeLastWaypoint([])).toEqual([]);
    expect(removeLastWaypoint([{ x: 1, y: 2 }])).toEqual([]);
    expect(
      removeLastWaypoint([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ])
    ).toEqual([{ x: 1, y: 2 }]);
  });
});
