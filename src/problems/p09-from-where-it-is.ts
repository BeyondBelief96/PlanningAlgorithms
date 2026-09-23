// Problem 09 -- From where it actually is.
// Brief: docs/taxi/p09-from-where-it-is.md

import {
  type Aircraft,
  type Chart,
  NO_LINK,
  type NodeId,
  refuse,
  routeFromLegs,
  type TaxiRoute,
  UNREACHABLE,
} from '../chart/index.js';
import type { CostToGo } from './types.js';

export function nextInstruction(chart: Chart, table: CostToGo, at: NodeId): string {
  // TODO(you): what to tell the crew, from anywhere, with NO SEARCH AT ALL.
  //
  // Three answers, and the third is not an error path -- it is one of the three
  // things this function is for:
  //
  //   the taxiway name    when there is a next leg
  //   "HOLD POSITION"     at the destination
  //   "UNABLE: ..."       when there is no route from here
  void chart;
  void table;
  void at;
  void NO_LINK;
  void UNREACHABLE;
  return 'UNABLE: nextInstruction is not implemented yet';
}

export function followTable(
  chart: Chart,
  ac: Aircraft,
  table: CostToGo,
  at: NodeId,
): TaxiRoute {
  // TODO(you): walk the table from `at` until you reach the goal.
  //
  // A table built by a correct Problem 08 never loops, because every step
  // strictly reduces the time remaining.  A table built by a half-written
  // Problem 08 certainly can, so put a guard in and say so when it trips.
  void chart;
  void ac;
  void table;
  void at;
  void routeFromLegs;
  return refuse('followTable is not implemented yet');
}
