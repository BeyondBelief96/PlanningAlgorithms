// Exercise 09 -- hybrid A* clipped to the start zone (Step 8, last rung).
// Brief: docs/capstone/ex09-hybrid-astar.md
//
// Self-contained: the tests build their own 400 x 200 yard with a wall across
// it, so nothing here depends on Kilo Field or on the rest of the pipeline.

import {
  advance,
  arcPath,
  concatenatePaths,
  distance,
  type DubinsSegment,
  dubinsShortestPath,
  MinHeap,
  renderDubins,
  straightPath,
  type Pose,
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

export function planHybridAStar(
  cspace: ZoneLayer,
  start: Pose,
  candidate: MergeCandidate,
  allowedZones: readonly ZoneClass[],
  params: HybridAStarParams,
): MergePath {
  // TODO(you): Part 1's Problem 07 again -- the same priority queue, the same
  // settled-state bookkeeping, the same admissible estimate -- run over poses
  // instead of chart points.
  //
  // Three motion primitives: straight, and one arc each way at params.radius,
  // each of arclength params.primitiveLength.  Every edge of the search tree is
  // therefore a piece of path the aircraft can actually fly.
  //
  // Two things are different from an ordinary A*:
  //
  //   The state space is continuous, so you cannot mark a pose visited.  Round
  //   it to a lattice cell -- positionResolution metres and headingBins heading
  //   bins -- and keep the best g seen per cell.
  //
  //   The search is CLIPPED: before accepting a primitive, sample it and check
  //   every sample is in one of allowedZones, using the C-space layer so a
  //   single point test per sample is enough.  That is what makes the search
  //   physically unable to wander into another zone, rather than merely
  //   unwilling to.
  //
  // Finally, the analytic expansion: at every node, try a Dubins curve straight
  // to the target.  If it is clear, you are done -- and done EXACTLY, which
  // matters because the graph route is concatenated at that pose.  Lattice A*
  // on its own only ever reaches a region.
  //
  // Respect params.maxExpansions and say in `detail` that you gave up, and
  // after how much work.
  void cspace;
  void start;
  void candidate;
  void allowedZones;
  void params;
  void advance;
  void arcPath;
  void concatenatePaths;
  void distance;
  void dubinsShortestPath;
  void renderDubins;
  void straightPath;
  void wrapAngle2Pi;
  void zoneAt;
  void MinHeap;
  void (undefined as DubinsSegment | undefined);
  return noMerge();
}
