// Reference solution -- Problem 03: will it fit?
//
// The search does not change at all.  What changes is which legs exist, and
// that turns out to be where a surface planner earns its keep: the quickest
// route for an A320 and the quickest route for a 777 are different routes, and
// for some aeroplanes there is no route at all.
//
// Two decisions worth arguing with.
//
//   - The reasons are specific and name the number.  "TWY D takes 36 m, B777
//     is 64.8 m" is a message somebody can act on.  "No route found" sends
//     them to read the chart themselves.
//   - The filter is applied where the legs are enumerated, not afterwards.
//     Filtering a finished route is a different, wrong algorithm: it tells you
//     the best route is unusable instead of finding the best usable one.

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

export function unusableReason(chart: Chart, e: LinkId, ac: Aircraft): string {
  if (e < 0 || e >= chart.numLinks) return 'that leg is not on the chart';
  const l = chart.link(e);
  // "STAND 2 between STAND 2 and P2" reads like a bug report about the message
  // rather than about the aeroplane, so name the two ends only when the leg is
  // one of several sharing a name.
  const ends = [chart.node(l.from).name, chart.node(l.to).name];
  const between = ends.includes(l.taxiway)
    ? l.taxiway
    : `${l.taxiway} between ${ends[0]} and ${ends[1]}`;

  // Closed first.  A closed taxiway is closed to everybody, and saying "too
  // wide" about it would be a lie.
  if (l.closed) return `${between} is closed`;
  if (ac.wingspanM > l.maxWingspanM)
    return `${between} takes a wingspan of ${l.maxWingspanM} m, ${ac.type} is ${ac.wingspanM} m`;
  if (ac.weightT > l.maxWeightT)
    return `${between} takes ${l.maxWeightT} t, ${ac.type} is ${ac.weightT} t`;
  return '';
}

export function quickestRouteFor(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  to: NodeId,
): TaxiRoute {
  if (from < 0 || from >= chart.numNodes) return refuse('the start is not a point on the chart');
  if (to < 0 || to >= chart.numNodes)
    return refuse('the destination is not a point on the chart');
  if (from === to) return stayPut(from);

  const best = new Array<number>(chart.numNodes).fill(UNREACHABLE);
  const arrivedBy = new Array<LinkId>(chart.numNodes).fill(NO_LINK);
  const settled = new Array<boolean>(chart.numNodes).fill(false);

  // Kept only so a refusal can say something better than "no route": if the
  // search ran out of pavement, the last reason a leg was turned down is
  // usually the reason the crew wants.
  let lastRefusal = '';

  const queue = new MinHeap<NodeId>();
  best[from] = 0;
  queue.push(0, from);

  let expanded = 0;
  let generated = 1;

  for (;;) {
    const top = queue.pop();
    if (!top) break;
    const at = top.value;
    if (settled[at]) continue;
    settled[at] = true;
    ++expanded;

    if (at === to) break;

    for (const e of chart.linksAt(at)) {
      if (!chart.travellable(e, at)) continue;

      const why = unusableReason(chart, e, ac);
      if (why) {
        lastRefusal = why;
        continue;
      }

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

  if (!settled[to]) {
    const head = `no route for ${ac.type} from ${chart.node(from).name} to ${chart.node(to).name}`;
    return refuse(lastRefusal ? `${head}: ${lastRefusal}` : head);
  }

  const route = assembleRoute(chart, from, to, arrivedBy);
  route.expanded = expanded;
  route.generated = generated;
  return route;
}
