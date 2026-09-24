// Problem 13 -- Deep first, and what it costs.
// Brief: docs/taxi/p13-deep-first.md

import {
  assembleRoute,
  type Chart,
  NO_NODE,
  type NodeId,
  refuse,
  routeFromLegs,
  stayPut,
  type TaxiRoute,
} from '../chart/index.js';

export function depthFirstRoute(chart: Chart, from: NodeId, to: NodeId): TaxiRoute {
  // TODO(you): Problem 01 again, with ONE line changed.
  //
  // Breadth first takes the next point off the FRONT of the container.  Depth
  // first takes it off the BACK.  That is the whole difference between the two
  // algorithms, and it is worth writing both and staring at the diff.
  //
  // The route you get back may be absurd -- it is the first one the search
  // stumbled into, not the shortest.  That is not a bug to fix here; it is the
  // property the brief asks you to measure.
  void chart;
  void from;
  void to;
  void assembleRoute;
  void stayPut;
  void NO_NODE;
  return refuse('depthFirstRoute is not implemented yet');
}

export function routeWithinLegs(
  chart: Chart,
  from: NodeId,
  to: NodeId,
  maxLegs: number,
): TaxiRoute {
  // TODO(you): depth first, refusing to go more than maxLegs deep.
  //
  // The trap: do NOT keep a global visited set.  A point that was too deep down
  // one branch may be shallow enough down another, and a global visited set
  // wrongly rules it out -- which makes the search miss routes that exist.
  // Mark points on the CURRENT branch instead, and unmark them on the way back
  // out.
  void chart;
  void from;
  void to;
  void maxLegs;
  void routeFromLegs;
  return refuse('routeWithinLegs is not implemented yet');
}

export function iterativeDeepeningRoute(chart: Chart, from: NodeId, to: NodeId): TaxiRoute {
  // TODO(you): call routeWithinLegs() with a limit of 0, then 1, then 2, ...
  // and return the first route that comes back.
  //
  // It looks wasteful and mostly is not: on a chart with branching factor b the
  // last pass alone does about (b - 1)/b of the total work, so repeating
  // everything before it costs a constant factor.
  //
  // Bound the loop.  A route never needs more legs than the chart has points,
  // and without a bound this runs forever on a destination that cannot be
  // reached.  Add up expanded and generated across the passes -- the point of
  // the exercise is the comparison with Problem 01.
  void chart;
  void from;
  void to;
  return refuse('iterativeDeepeningRoute is not implemented yet');
}
