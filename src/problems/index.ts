// Your twelve answers.
//
// Each file next to this one is a stub with a brief in docs/taxi/.  Work them
// in order: each is a small delta on the one before, and skipping ahead mostly
// means rediscovering something the previous one would have taught you.
//
//     npm test                 run them all against your code
//     npm test -- p03          just one
//     npm run test:watch       re-run on save
//     npm run test:reference   the same tests, against the worked answers

import type { Problems } from './types.js';

export { fewestLegs } from './p01-first-route.js';
export { quickestRoute } from './p02-quickest-taxi.js';
export { unusableReason, quickestRouteFor } from './p03-will-it-fit.js';
export { quickestRouteWithTurns } from './p04-turns-cost-time.js';
export { routeUnderClearance } from './p05-via-the-named-taxiways.js';
export { runwaysCrossed, planDeparture } from './p06-hold-short.js';
export { quickestRouteGuided } from './p07-big-chart.js';
export { secondsToGo } from './p08-minutes-to-go.js';
export { nextInstruction, followTable } from './p09-from-where-it-is.js';
export { withTaxiwayClosed, closureCost } from './p10-taxiway-closed.js';
export { pushbackOrder } from './p11-before-pushback.js';
export { earliestOffBlock, criticalPath } from './p12-earliest-off-block.js';

// --- Part 1b: the rest of the discrete-planning chapter ---------------------
export {
  depthFirstRoute,
  iterativeDeepeningRoute,
  routeWithinLegs,
} from './p13-deep-first.js';
export { backwardRoute, bidirectionalRoute } from './p14-from-the-other-end.js';
export { minutesToGo, scheduleFromTable } from './p15-a-fixed-budget.js';
export { minutesSpent } from './p16-what-it-cost-to-get-here.js';
export {
  scheduleFromAdvice,
  settleMinutesSpent,
  settleMinutesToGo,
} from './p17-taking-the-budget-away.js';
export {
  afterJob,
  jobIsPossible,
  shortestJobList,
  turnaroundIsDone,
} from './p18-describing-the-turnaround.js';
export {
  buildRoundGraph,
  couldBeDoneBy,
  earliestRound,
} from './p19-how-early-could-it-finish.js';
export {
  encodeRamp,
  jobListByFormula,
  jobsFromAssignment,
  solveCnf,
} from './p20-planning-without-a-planner.js';

// Compile-time proof that you have answered every problem, with the right
// signatures.  If this stops compiling, look at the signature it names.
import * as self from './index.js';
const _check: Problems = self;
void _check;
