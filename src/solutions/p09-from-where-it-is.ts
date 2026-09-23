// Reference solution -- Problem 09: from where it actually is.
//
// The payoff for Problem 08, and it is worth noticing how little code it is.
// There is no search here at all.  The aeroplane turns up somewhere nobody
// planned for, you index an array, and you have an instruction.
//
// That property -- an answer available immediately, from anywhere -- is the
// whole reason a planner keeps a table rather than a route.  A route has an
// opinion about one sequence of points and nothing to say about anywhere else.
//
// Note the third case.  "UNABLE" is not an error path; it is one of the three
// things this function is for.  From the far end of a one-way taxiway, or from
// the wrong side of a closure, there is genuinely nothing else to say.

import {
  type Aircraft,
  type Chart,
  type LinkId,
  NO_LINK,
  type NodeId,
  refuse,
  routeFromLegs,
  type TaxiRoute,
  UNREACHABLE,
} from '../chart/index.js';
import type { CostToGo } from '../problems/types.js';

function goalName(chart: Chart, table: CostToGo): string {
  return table.goal >= 0 && table.goal < chart.numNodes ? chart.node(table.goal).name : 'there';
}

export function nextInstruction(chart: Chart, table: CostToGo, at: NodeId): string {
  if (at < 0 || at >= chart.numNodes) return 'UNABLE: not a point on this aerodrome';
  if (at >= table.next.length) return 'UNABLE: the table was built for a different chart';

  if (at === table.goal) return 'HOLD POSITION';

  if (table.seconds[at] === UNREACHABLE)
    return `UNABLE: no route from ${chart.node(at).name} to ${goalName(chart, table)}`;

  const e = table.next[at];
  if (e === undefined || e === NO_LINK)
    return `UNABLE: no next leg recorded at ${chart.node(at).name}`;
  return chart.link(e).taxiway;
}

export function followTable(
  chart: Chart,
  _ac: Aircraft,
  table: CostToGo,
  at: NodeId,
): TaxiRoute {
  if (at < 0 || at >= chart.numNodes) return refuse('the start is not a point on the chart');
  if (at >= table.next.length) return refuse('the table was built for a different chart');

  if (table.seconds[at] === UNREACHABLE)
    return refuse(`UNABLE: no route from ${chart.node(at).name} to ${goalName(chart, table)}`);

  const legList: LinkId[] = [];
  let here = at;
  // A table built by a correct Problem 08 never loops, because every step
  // strictly reduces the time remaining.  A table built by a half-written
  // Problem 08 certainly can.
  for (let guard = 0; here !== table.goal; ++guard) {
    if (guard > chart.numLinks)
      return refuse('the table loops: following it never reaches the destination');
    const e = table.next[here];
    if (e === undefined || e === NO_LINK)
      return refuse('the table stops short of the destination');
    legList.push(e);
    here = chart.other(e, here);
    if (here < 0) return refuse('the table names a leg that does not touch the point');
  }

  return routeFromLegs(chart, at, legList);
}
