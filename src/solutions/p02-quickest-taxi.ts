// Reference solution -- Problem 02: the quickest taxi.
//
// Same search, different queue.  Instead of "oldest first", take out whichever
// point is cheapest to have reached so far -- and suddenly the answer is a
// route somebody might actually fly rather than one that merely has few legs.
//
// Three things to notice, all of which are where the bugs live:
//
//   - The cost of a point is only final at the moment it comes OUT of the
//     queue.  Hence the arrival check is on removal, not on generation.
//   - `settled` is what makes the stale-duplicate trick safe: the first time a
//     point comes out its cost is final, so every later copy is worse.
//   - The route this returns at Kilo Field taxis 500 m down runway 09/27,
//     because a runway is the fastest pavement on the aerodrome.  It is the
//     quickest route.  It is also completely unacceptable, and nothing in this
//     function knows that.  Problem 06 is where it gets fixed.

import {
  assembleRoute,
  type Aircraft,
  type Chart,
  legSeconds,
  type LinkId,
  MinHeap,
  NO_LINK,
  type NodeId,
  refuse,
  stayPut,
  type TaxiRoute,
  UNREACHABLE,
} from '../chart/index.js';

export function quickestRoute(
  chart: Chart,
  _ac: Aircraft,
  from: NodeId,
  to: NodeId,
): TaxiRoute {
  // The aeroplane does not matter yet.  Problem 03 is where it starts to.
  if (from < 0 || from >= chart.numNodes) return refuse('the start is not a point on the chart');
  if (to < 0 || to >= chart.numNodes)
    return refuse('the destination is not a point on the chart');
  if (from === to) return stayPut(from);

  const best = new Array<number>(chart.numNodes).fill(UNREACHABLE);
  const arrivedBy = new Array<LinkId>(chart.numNodes).fill(NO_LINK);
  const settled = new Array<boolean>(chart.numNodes).fill(false);

  const queue = new MinHeap<NodeId>();
  best[from] = 0;
  queue.push(0, from);

  let expanded = 0;
  let generated = 1;

  for (;;) {
    const top = queue.pop();
    if (!top) break;
    const at = top.value;
    if (settled[at]) continue; // a stale duplicate
    settled[at] = true;
    ++expanded;

    if (at === to) break;

    for (const e of chart.linksAt(at)) {
      if (!chart.travellable(e, at)) continue;
      const next = chart.other(e, at);
      if (next < 0 || settled[next]) continue;

      const candidate = top.key + legSeconds(chart, e);
      if (candidate + 1e-9 < best[next]!) {
        best[next] = candidate;
        arrivedBy[next] = e;
        queue.push(candidate, next);
        ++generated;
      }
    }
  }

  if (!settled[to])
    return refuse(`no route on the chart from ${chart.node(from).name} to ${chart.node(to).name}`);

  const route = assembleRoute(chart, from, to, arrivedBy);
  route.expanded = expanded;
  route.generated = generated;
  return route;
}
