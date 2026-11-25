import {
  nodesReachingEnd,
  type PathGraph,
  pathGraphFromWaypoints,
  pathGraphToSegments,
  resolveRandomPath,
} from '../../src/path/pathGraph';

function forkedGraph(): PathGraph {
  return {
    nodes: [
      { id: 'spawn', x: 0, y: 0 },
      { id: 'fork', x: 100, y: 0 },
      { id: 'north', x: 200, y: -50 },
      { id: 'south', x: 200, y: 50 },
      { id: 'merge', x: 300, y: 0 },
      { id: 'camp', x: 400, y: 0 },
      { id: 'dead', x: 150, y: 200 },
    ],
    edges: [
      { from: 'spawn', to: 'fork' },
      { from: 'fork', to: 'north' },
      { from: 'fork', to: 'south' },
      { from: 'fork', to: 'dead' },
      { from: 'north', to: 'merge' },
      { from: 'south', to: 'merge' },
      { from: 'merge', to: 'camp' },
    ],
    spawnId: 'spawn',
    endId: 'camp',
  };
}

describe('pathGraph', () => {
  test('pathGraphFromWaypoints builds a linear chain', () => {
    const graph = pathGraphFromWaypoints([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ]);
    expect(graph.spawnId).toBe('n0');
    expect(graph.endId).toBe('n2');
    expect(graph.edges).toEqual([
      { from: 'n0', to: 'n1' },
      { from: 'n1', to: 'n2' },
    ]);
    expect(resolveRandomPath(graph)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ]);
  });

  test('pathGraphToSegments returns one segment per edge', () => {
    const graph = pathGraphFromWaypoints([
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ]);
    expect(pathGraphToSegments(graph)).toEqual([{ a: { x: 0, y: 0 }, b: { x: 5, y: 5 } }]);
  });

  test('resolveRandomPath explores both branches over many rolls', () => {
    const graph = forkedGraph();
    let north = 0;
    let south = 0;
    for (let i = 0; i < 80; i++) {
      // Deterministic-ish alternating rng bias via index
      const path = resolveRandomPath(graph, () => (i % 2 === 0 ? 0.1 : 0.9));
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1]).toEqual({ x: 400, y: 0 });
      const ys = path.map(p => p.y);
      if (ys.includes(-50)) {
        north++;
      }
      if (ys.includes(50)) {
        south++;
      }
    }
    expect(north).toBeGreaterThan(0);
    expect(south).toBeGreaterThan(0);
  });

  test('resolveRandomPath always reaches camp through merge', () => {
    const graph = forkedGraph();
    for (let i = 0; i < 20; i++) {
      const path = resolveRandomPath(graph, () => Math.random());
      expect(path.some(p => p.x === 300 && p.y === 0)).toBe(true);
      expect(path[path.length - 1]).toEqual({ x: 400, y: 0 });
    }
  });

  test('dead-end branch is never chosen when it cannot reach end', () => {
    const graph = forkedGraph();
    const reaching = nodesReachingEnd(graph);
    expect(reaching.has('dead')).toBe(false);
    expect(reaching.has('spawn')).toBe(true);

    for (let i = 0; i < 40; i++) {
      const path = resolveRandomPath(graph, Math.random);
      expect(path.some(p => p.x === 150 && p.y === 200)).toBe(false);
    }
  });

  test('empty graph resolves to empty path', () => {
    expect(resolveRandomPath({ nodes: [], edges: [], spawnId: '', endId: '' })).toEqual([]);
  });
});
