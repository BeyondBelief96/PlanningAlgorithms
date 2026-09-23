// Problem 02 -- The quickest taxi.      Brief: docs/taxi/p02-quickest-taxi.md

import {
  assembleRoute,
  type Aircraft,
  type Chart,
  legSeconds,
  MinHeap,
  type NodeId,
  refuse,
  stayPut,
  type TaxiRoute,
  UNREACHABLE,
} from '../chart/index.js';

export function quickestRoute(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  to: NodeId,
): TaxiRoute {
  // TODO(you): Problem 01 with a different queue -- take out whichever point is
  // CHEAPEST to have reached so far, where a leg costs legSeconds(chart, leg).
  //
  //   - MinHeap cannot lower a key.  Push a second entry at the lower cost and
  //     ignore stale ones as they come out.  Before you write that, convince
  //     yourself it is safe: the first time a point comes out, its cost is
  //     already final.
  //   - Which means you mark a point settled when you take it OUT, not when you
  //     put it in.  That is the opposite of Problem 01.
  //   - And it means you check for arrival on the way out too.  Return when you
  //     first *generate* the destination and you hand back a route that merely
  //     reaches it.
  //   - `ac` is unused here.  Problem 03 is where the aeroplane starts to
  //     matter.
  //
  // When it works, look hard at the route it gives you for STAND 2 -> HS 27 E.
  // It is not the route you expected, and the brief explains why that is the
  // most useful thing this problem has to tell you.
  void chart;
  void ac;
  void from;
  void to;
  void assembleRoute;
  void legSeconds;
  void MinHeap;
  void stayPut;
  void UNREACHABLE;
  return refuse('quickestRoute is not implemented yet');
}
