// Reference solution -- Exercise 09: hybrid A* clipped to the start zone
// (Step 8, last rung).
//
// This is Part 1's Problem 07 again -- the same priority queue, the same
// settled-state bookkeeping, the same admissible estimate -- run over poses
// instead of chart points.  Two things make it a *motion* planner rather than a
// graph search:
//
//   * the successors are motion primitives the aircraft can actually fly, so
//     every edge of the search tree is a feasible piece of path; and
//   * the search space is clipped to the polygons of the start zone, which is
//     what makes it physically unable to wander into another zone.
//
// The analytic expansion at the top of the loop is what makes the result exact:
// A* gets near the goal, and a Dubins curve finishes the job on the nose.

import {
  advance,
  arcPath,
  concatenatePaths,
  distance,
  type DubinsSegment,
  dubinsShortestPath,
  MinHeap,
  type Path,
  pathAt,
  pathIsEmpty,
  pathLength,
  PI,
  type Pose,
  renderDubins,
  straightPath,
  totalTurning,
  type Vec2,
  wrapAngle2Pi,
  type ZoneClass,
  type ZoneLayer,
} from '../../airport/index.js';
import {
  type HybridAStarParams,
  type MergeCandidate,
  type MergePath,
  noMerge,
} from '../types.js';
import { zoneAt } from './ex01-zone-layer.js';

interface Node {
  pose: Pose;
  g: number;
  parent: number;
  /** The primitive that produced this node. */
  move: DubinsSegment;
}

function latticeKey(pose: Pose, params: HybridAStarParams): string {
  const res = Math.max(params.positionResolution, 0.1);
  const ix = Math.floor(pose.p.x / res);
  const iy = Math.floor(pose.p.y / res);
  const binSize = (2 * PI) / Math.max(params.headingBins, 1);
  const ih = Math.floor(wrapAngle2Pi(pose.heading) / binSize);
  return `${ix},${iy},${ih}`;
}

function zoneAllowed(
  cspace: ZoneLayer,
  p: Vec2,
  allowed: readonly ZoneClass[],
): boolean {
  return allowed.includes(zoneAt(cspace, p).zone);
}

function pathAllowed(
  cspace: ZoneLayer,
  path: Path,
  allowed: readonly ZoneClass[],
): boolean {
  if (pathIsEmpty(path)) return false;
  const length = pathLength(path);
  for (let s = 0; s <= length + 1e-9; s += 2.0)
    if (!zoneAllowed(cspace, pathAt(path, s).p, allowed)) return false;
  return zoneAllowed(cspace, path.samples[path.samples.length - 1]!.p, allowed);
}

export function planHybridAStar(
  cspace: ZoneLayer,
  start: Pose,
  candidate: MergeCandidate,
  allowedZones: readonly ZoneClass[],
  params: HybridAStarParams,
): MergePath {
  if (allowedZones.length === 0) return noMerge();
  if (!zoneAllowed(cspace, start.p, allowedZones)) return noMerge();

  // The three primitives: straight, and one arc each way at a fixed radius.
  const step = Math.max(params.primitiveLength, 1.0);
  const radius = Math.max(params.radius, 1.0);
  const sweep = step / radius;
  const moves: DubinsSegment[] = [
    { isArc: false, signedRadius: 0, sweep: 0, length: step },
    { isArc: true, signedRadius: radius, sweep, length: step },
    { isArc: true, signedRadius: -radius, sweep: -sweep, length: step },
  ];

  const nodes: Node[] = [];
  const best = new Map<string, number>();
  const open = new MinHeap<number>();

  nodes.push({ pose: start, g: 0, parent: -1, move: moves[0]! });
  best.set(latticeKey(start, params), 0);
  open.push(distance(start.p, candidate.target.p), 0, 0);

  let expansions = 0;
  let reached = -1;
  let tail: Path = { samples: [] };

  while (expansions < params.maxExpansions) {
    const top = open.pop();
    if (!top) break;
    const index = top.value;
    const node = nodes[index]!;
    const found = best.get(latticeKey(node.pose, params));
    if (found !== undefined && node.g > found + 1e-9) continue; // stale entry
    ++expansions;

    // Analytic expansion: try to finish exactly, with a Dubins curve.
    const dubins = dubinsShortestPath(node.pose, candidate.target, radius);
    if (dubins.found) {
      const closing = renderDubins(node.pose, dubins, 1.0);
      if (!pathIsEmpty(closing) && pathAllowed(cspace, closing, allowedZones)) {
        reached = index;
        tail = closing;
        break;
      }
    }

    for (const move of moves) {
      const segment = move.isArc
        ? arcPath(node.pose, move.signedRadius, move.sweep, 1.0)
        : straightPath(node.pose, move.length, 1.0);
      if (pathIsEmpty(segment)) continue;
      if (!pathAllowed(cspace, segment, allowedZones)) continue;

      const child: Node = {
        pose: advance(node.pose, move),
        g: node.g + move.length * (move.isArc ? params.turnPenalty : 1.0),
        parent: index,
        move,
      };

      const key = latticeKey(child.pose, params);
      const seen = best.get(key);
      if (seen !== undefined && seen <= child.g + 1e-9) continue;
      best.set(key, child.g);
      nodes.push(child);
      // Euclidean distance never overestimates the arclength that remains, so
      // the search is optimal on the lattice for the same reason A* is.
      const id = nodes.length - 1;
      open.push(child.g + distance(child.pose.p, candidate.target.p), id, id);
    }
  }

  if (reached < 0)
    return noMerge(`hybrid A* exhausted ${expansions} expansions`);

  // Walk the parents back and render the primitives forward.
  const chain: number[] = [];
  for (let i = reached; i >= 0; i = nodes[i]!.parent) chain.push(i);
  chain.reverse();

  const parts: Path[] = [];
  for (let i = 1; i < chain.length; ++i) {
    const node = nodes[chain[i]!]!;
    const from = nodes[chain[i - 1]!]!;
    parts.push(
      node.move.isArc
        ? arcPath(from.pose, node.move.signedRadius, node.move.sweep, 1.0)
        : straightPath(from.pose, node.move.length, 1.0),
    );
  }
  parts.push(tail);

  const path = concatenatePaths(parts);
  return {
    found: true,
    method: 'hybridAStar',
    path,
    cost: pathLength(path) + 20.0 * totalTurning(path),
    detail: `hybrid A* in ${expansions} ${expansions === 1 ? 'expansion' : 'expansions'}`,
  };
}
