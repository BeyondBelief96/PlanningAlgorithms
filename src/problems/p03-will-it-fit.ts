// Problem 03 -- Will it fit?            Brief: docs/taxi/p03-will-it-fit.md

import {
  assembleRoute,
  type Aircraft,
  type Chart,
  legSeconds,
  type LinkId,
  MinHeap,
  type NodeId,
  refuse,
  stayPut,
  type TaxiRoute,
  UNREACHABLE,
} from '../chart/index.js';

export function unusableReason(chart: Chart, e: LinkId, ac: Aircraft): string {
  // TODO(you): "" when this aeroplane may use this leg today, otherwise one
  // sentence saying why not.
  //
  // Three reasons -- closed, too wide, too heavy -- and the message should name
  // the leg and the number that fails.  "TWY D between A2 and D1 takes a
  // wingspan of 36 m, B777 is 64.8 m" is something somebody can act on.
  //
  // Check closed FIRST.  A closed taxiway is closed to everybody, and saying
  // "too wide" about it would be a lie.
  void chart;
  void e;
  void ac;
  return '';
}

export function quickestRouteFor(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  to: NodeId,
): TaxiRoute {
  // TODO(you): Problem 02, over legs this aeroplane is allowed on.
  //
  // Apply the filter where you enumerate the legs, NOT to the finished route.
  // Filtering afterwards is a different, wrong algorithm: it tells you the best
  // route is unusable instead of finding the best usable one.
  //
  // When there is no route, try to say something better than "no route" -- the
  // last reason a leg was turned down is usually the reason.
  void chart;
  void ac;
  void from;
  void to;
  void assembleRoute;
  void legSeconds;
  void MinHeap;
  void stayPut;
  void UNREACHABLE;
  return refuse('quickestRouteFor is not implemented yet');
}
