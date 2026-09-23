// Problem 05 -- Via the named taxiways.
// Brief: docs/taxi/p05-via-the-named-taxiways.md

import {
  type Aircraft,
  type Chart,
  type Clearance,
  legSeconds,
  MinHeap,
  type NodeId,
  refuse,
  routeFromLegs,
  type TaxiRoute,
} from '../chart/index.js';

export function routeUnderClearance(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  clr: Clearance,
): TaxiRoute {
  // TODO(you): the quickest route that COMPLIES with the clearance.
  //
  // Not: the quickest route, then a check that it complied.  That is a
  // different and wrong algorithm -- when the quickest route does not comply
  // you have nothing to say, even though a perfectly good complying route may
  // exist.  You never looked for it.
  //
  // Carry "how much of the clearance have I used up?" in the state:
  //
  //   stage 0   have not joined via[0] yet.  May move on stands and aprons
  //             only -- that is how you get off the stand -- or join via[0].
  //   stage k   on via[k-1].  May stay on it, or join via[k].
  //   done      stage === via.length AND standing at the destination.
  //
  // The same point appears once per stage, and that is correct: standing at D1
  // having joined Delta and standing at D1 having joined Bravo are different
  // situations to be in.
  //
  // An empty via list means "by any route" -- controllers do say that.
  //
  // Two different refusals, and they mean different things on the radio.
  // "I cannot get there at all" is a chart problem; "I cannot get there THAT
  // WAY" is a readback problem, and the crew will want to request a different
  // routing.  Say which.
  void chart;
  void ac;
  void from;
  void clr;
  void legSeconds;
  void MinHeap;
  void routeFromLegs;
  return refuse('routeUnderClearance is not implemented yet');
}
