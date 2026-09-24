// The reference implementation of all twelve capstone exercises.
//
// Read these AFTER you have written yours, not before.  The value of an
// exercise is almost entirely in the hour before you get it working.
//
// The comments carry the reasoning rather than a narration of the code -- why
// the gate rule is directional, why the merge ladder is ordered the way it is,
// why the monitor is allowed to be stupid.  Those are the parts worth arguing
// with.

import type { Capstone } from '../types.js';

export { zoneAt, classifyFootprint, configurationSpace } from './ex01-zone-layer.js';
export { buildGatedGraph } from './ex02-gated-graph.js';
export { localize } from './ex03-start-mode.js';
export { buildPermissions } from './ex04-permissions.js';
export { filterGraph, turnIsFeasible } from './ex05-graph-filter.js';
export {
  advanceRouteIndex,
  computeCostToGo,
  costToGoAt,
  costToGoReachable,
  edgeCost,
  extractGraphRoute,
  partialEdgeCost,
  zoneCostRate,
} from './ex06-cost-to-go.js';
export { generateMergeCandidates } from './ex07-merge-candidates.js';
export {
  paramsFor,
  planCaptureWindow,
  planDubinsMerge,
  planIntercept,
  planMerge,
  planSCurve,
  planStraightThenTurn,
} from './ex08-merge-ladder.js';
export { planHybridAStar } from './ex09-hybrid-astar.js';
export { validateSweep } from './ex10-swept-footprint.js';
export { assembleRoute } from './ex11-route-assembly.js';
export { geofenceMonitor, shouldReplan, spliceRoute } from './ex12-monitor-and-replan.js';

// Compile-time proof that this module answers every exercise, with the right
// signatures.  If it stops compiling, a signature has drifted.
import * as self from './index.js';
const check: Capstone = self;
void check;
