// Problem 06 -- Hold short.             Brief: docs/taxi/p06-hold-short.md

import {
  type Aircraft,
  type Chart,
  type Clearance,
  type NodeId,
  permitsCrossing,
  refuse,
  type TaxiRoute,
} from '../chart/index.js';

export function runwaysCrossed(chart: Chart, route: TaxiRoute): string[] {
  // TODO(you): every runway this route crosses or enters, in order, without
  // repeats.
  //
  // A point of kind 'runwayEntry' carries the runway in `protects`.  A leg of
  // surface 'runway' is a use of that runway too.
  //
  // One case to get right: where the aeroplane ALREADY IS does not count.  An
  // aircraft that has just landed is on the runway; it is not crossing it.
  void chart;
  void route;
  return [];
}

export function planDeparture(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  clr: Clearance,
): TaxiRoute {
  // TODO(you): the whole departure.
  //
  //   1. The route has to comply with the clearance -- that is Problem 05, and
  //      you may call your own answer to it.
  //   2. It may cross a runway only if the clearance names that runway.  Not
  //      "if the runway looks clear": there is no sensor here and there should
  //      not be.  Permission comes from a human being.
  //   3. It stops at the holding point.  Set stopAt.
  //
  // This is where Problem 02's 500 metres down runway 09/27 stops being
  // possible.
  //
  // When you refuse, say which runway, and say how far the aeroplane COULD get:
  // "able to HS 36 W, request crossing" is a sentence the crew can read back.
  // "No route" is not.
  void chart;
  void ac;
  void from;
  void clr;
  void permitsCrossing;
  return refuse('planDeparture is not implemented yet');
}
