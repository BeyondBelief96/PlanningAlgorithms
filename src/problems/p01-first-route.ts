// Problem 01 -- The first route.        Brief: docs/taxi/p01-first-route.md
//
// Fewest legs from one point on the chart to another, ignoring the aeroplane.

import {
  assembleRoute,
  type Chart,
  type LinkId,
  NO_LINK,
  type NodeId,
  refuse,
  stayPut,
  type TaxiRoute,
} from '../chart/index.js';

export function fewestLegs(chart: Chart, from: NodeId, to: NodeId): TaxiRoute {
  // TODO(you):
  //   - Check the arguments.  A caller will hand you NO_NODE sooner or later,
  //     and "the start is not a point on the chart" beats a crash.
  //   - Honour one-way legs -- chart.travellable(leg, from) is the test.  They
  //     are a property of the aerodrome, not of the aeroplane, so they apply
  //     even here.
  //   - Take the OLDEST point out of the queue first.  That is what makes the
  //     first arrival the one with fewest legs.
  //   - Record, for each point, the leg you first reached it along, then hand
  //     that array to assembleRoute(): it fills in nodes, links, distanceM and
  //     seconds for you.
  //   - Fill in expanded and generated.  Problems 02, 07 and 10 compare them.
  //   - When there is no route, refuse() and say between which two points.
  void chart;
  void from;
  void to;
  void assembleRoute;
  void stayPut;
  void NO_LINK;
  const _unused: LinkId[] = [];
  void _unused;
  return refuse('fewestLegs is not implemented yet');
}
