// Problem 07 -- A chart the size of a real one.
// Brief: docs/taxi/p07-big-chart.md

import {
  type Aircraft,
  type Chart,
  legSeconds,
  MinHeap,
  type NodeId,
  refuse,
  routeFromLegs,
  type TaxiRoute,
  taxiSpeed,
} from '../chart/index.js';

export function quickestRouteGuided(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  to: NodeId,
): TaxiRoute {
  // TODO(you): Problem 04's answer, arrived at after looking at less of the
  // aerodrome.
  //
  // Order the queue by "seconds so far + a guess at the seconds still to come"
  // instead of "seconds so far".  For the guess use straight-line distance to
  // the destination -- chart.straightLineM(v, to) -- divided by the fastest
  // speed anywhere on the chart.
  //
  // Everything rests on that guess never running high.  No route is shorter
  // than the straight line and nothing moves faster than the runway speed, so
  // it cannot -- and the answer is therefore exactly Problem 04's.  A guess
  // that sometimes overshoots gives you a route that is sometimes three minutes
  // longer than it needed to be, and nothing in the output tells you which
  // times those were.
  //
  // Keep Problem 04's turn penalty and Problem 04's state.
  void chart;
  void ac;
  void from;
  void to;
  void legSeconds;
  void MinHeap;
  void routeFromLegs;
  void taxiSpeed;
  return refuse('quickestRouteGuided is not implemented yet');
}
