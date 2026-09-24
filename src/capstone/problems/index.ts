// Your twelve answers to the capstone.
//
// Each file next to this one is a stub with a brief in docs/capstone/.  Work
// them in order: this is a pipeline, so a test for Exercise NN generally needs
// Exercises 1 to NN-1 to work before it can say anything.
//
// Three are self-contained and can be done in any order, on their own:
// Exercise 08 (pure geometry), Exercise 09 (its tests build their own yard) and
// Exercise 12 (its tests build their own vehicle states).  If you want to start
// somewhere other than the beginning, start at 08.
//
//     npm run test:capstone          run them all against your code
//     npm test -- ex06               just one
//     npm run test:reference         the same tests, against the worked answers

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

// Compile-time proof that you have answered every exercise, with the right
// signatures.  If this stops compiling, look at the signature it names.
import * as self from './index.js';
const check: Capstone = self;
void check;
