// Reference solution -- Problem 01: the first route.
//
// Fewest legs, which is what a controller counts when they read a route out.
// Breadth first: the frontier grows a ring at a time, so the first time you
// reach the destination you reached it in as few legs as possible.
//
// Note the two things that are not the algorithm and are most of the work --
// checking the arguments, and returning a route that validateRoute() accepts.

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
  if (from < 0 || from >= chart.numNodes) return refuse('the start is not a point on the chart');
  if (to < 0 || to >= chart.numNodes)
    return refuse('the destination is not a point on the chart');
  if (from === to) return stayPut(from);

  const reached = new Array<boolean>(chart.numNodes).fill(false);
  const arrivedBy = new Array<LinkId>(chart.numNodes).fill(NO_LINK);

  // A plain array used as a FIFO with a moving head; shift() on a large array
  // is O(n) and this is the one place it would show.
  const queue: NodeId[] = [from];
  let head = 0;
  reached[from] = true;

  let expanded = 0;
  let generated = 1;

  while (head < queue.length) {
    const at = queue[head++]!;
    ++expanded;

    if (at === to) {
      const route = assembleRoute(chart, from, to, arrivedBy);
      route.expanded = expanded;
      route.generated = generated;
      return route;
    }

    for (const e of chart.linksAt(at)) {
      // One-way legs are a property of the aerodrome, not of the aeroplane, so
      // even this problem has to honour them.
      if (!chart.travellable(e, at)) continue;
      const next = chart.other(e, at);
      if (next < 0 || reached[next]) continue;
      reached[next] = true;
      arrivedBy[next] = e;
      queue.push(next);
      ++generated;
    }
  }

  return refuse(
    `no route on the chart from ${chart.node(from).name} to ${chart.node(to).name}`,
  );
}
