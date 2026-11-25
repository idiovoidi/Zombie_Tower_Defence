import type { Waypoint } from '../managers/PathfindingManager';

interface PathNode {
  id: string;
  x: number;
  y: number;
}

interface PathEdge {
  from: string;
  to: string;
}

export interface PathGraph {
  nodes: PathNode[];
  edges: PathEdge[];
  spawnId: string;
  endId: string;
}

export interface PathSegment {
  a: Waypoint;
  b: Waypoint;
}

export type Rng = () => number;

function nodeMap(graph: PathGraph): Map<string, PathNode> {
  return new Map(graph.nodes.map(n => [n.id, n]));
}

function outgoing(graph: PathGraph): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const node of graph.nodes) {
    map.set(node.id, []);
  }
  for (const edge of graph.edges) {
    const list = map.get(edge.from);
    if (list) {
      list.push(edge.to);
    }
  }
  return map;
}

/** Nodes that can reach endId (including endId). */
export function nodesReachingEnd(graph: PathGraph): Set<string> {
  const reverse = new Map<string, string[]>();
  for (const node of graph.nodes) {
    reverse.set(node.id, []);
  }
  for (const edge of graph.edges) {
    const list = reverse.get(edge.to);
    if (list) {
      list.push(edge.from);
    }
  }

  const reachable = new Set<string>();
  const stack = [graph.endId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || reachable.has(id)) {
      continue;
    }
    reachable.add(id);
    for (const prev of reverse.get(id) ?? []) {
      stack.push(prev);
    }
  }
  return reachable;
}

/**
 * Build a linear path graph from a waypoint polyline.
 */
export function pathGraphFromWaypoints(waypoints: Waypoint[]): PathGraph {
  if (waypoints.length === 0) {
    return { nodes: [], edges: [], spawnId: '', endId: '' };
  }

  const nodes: PathNode[] = waypoints.map((wp, i) => ({
    id: `n${i}`,
    x: wp.x,
    y: wp.y,
  }));
  const edges: PathEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: nodes[i].id, to: nodes[i + 1].id });
  }

  return {
    nodes,
    edges,
    spawnId: nodes[0].id,
    endId: nodes[nodes.length - 1].id,
  };
}

/** All geometric segments for render / placement. */
export function pathGraphToSegments(graph: PathGraph): PathSegment[] {
  const nodes = nodeMap(graph);
  const segments: PathSegment[] = [];
  for (const edge of graph.edges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (from && to) {
      segments.push({ a: { x: from.x, y: from.y }, b: { x: to.x, y: to.y } });
    }
  }
  return segments;
}

/**
 * Random walk from spawn to end. At forks, only chooses successors that can still reach end.
 */
export function resolveRandomPath(graph: PathGraph, rng: Rng = Math.random): Waypoint[] {
  if (graph.nodes.length === 0 || !graph.spawnId || !graph.endId) {
    return [];
  }

  const nodes = nodeMap(graph);
  const outs = outgoing(graph);
  const canReachEnd = nodesReachingEnd(graph);

  if (!canReachEnd.has(graph.spawnId)) {
    return [];
  }

  const path: Waypoint[] = [];
  let current = graph.spawnId;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current)) {
      // Cycle guard — abort to empty rather than infinite loop
      return [];
    }
    visited.add(current);

    const node = nodes.get(current);
    if (!node) {
      return [];
    }
    path.push({ x: node.x, y: node.y });

    if (current === graph.endId) {
      return path;
    }

    const nextIds = (outs.get(current) ?? []).filter(id => canReachEnd.has(id));
    if (nextIds.length === 0) {
      return [];
    }

    const pick = nextIds[Math.floor(rng() * nextIds.length)];
    current = pick;
  }

  return [];
}

export function getSpawnWaypoint(graph: PathGraph): Waypoint | null {
  const node = graph.nodes.find(n => n.id === graph.spawnId);
  return node ? { x: node.x, y: node.y } : null;
}

export function getEndWaypoint(graph: PathGraph): Waypoint | null {
  const node = graph.nodes.find(n => n.id === graph.endId);
  return node ? { x: node.x, y: node.y } : null;
}

export function ensurePathGraph(map: { waypoints: Waypoint[]; pathGraph?: PathGraph }): PathGraph {
  if (map.pathGraph && map.pathGraph.nodes.length > 0) {
    return map.pathGraph;
  }
  return pathGraphFromWaypoints(map.waypoints);
}
