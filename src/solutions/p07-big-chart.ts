// Reference solution -- Problem 07: a chart the size of a real one.
//
// Kilo Field has 27 points.  A real hub has thousands, and a planner that
// examines all of them to answer one question is a planner that answers it too
// late.  Nothing about the answer changes here; what changes is how much of the
// aerodrome you had to look at to find it.
//
// The idea: order the queue by "seconds so far + a guess at the seconds still
// to come".  Straight-line distance to the destination, divided by the fastest
// speed anywhere on the chart, is a guess that can never run high -- no route
// is shorter than the straight line and nothing moves faster than the runway
// speed -- so the answer stays exactly what Problem 04 gave.
//
// That "can never run high" is the whole of it.  A guess that sometimes
// overshoots gives you a route that is sometimes three minutes longer than it
// needed to be, and nothing in the output tells you which times those were.

import {
  type Aircraft,
  type Chart,
  legSeconds,
  type LinkId,
  MinHeap,
  NO_LINK,
  type NodeId,
  refuse,
  routeFromLegs,
  stayPut,
  type TaxiRoute,
  taxiSpeed,
} from '../chart/index.js';
import { unusableReason } from './p03-will-it-fit.js';
import { TURN_THRESHOLD } from './p04-turns-cost-time.js';

interface State {
  at: NodeId;
  via: LinkId;
}

function key(s: State): string {
  return `${s.at}:${s.via}`;
}

/** The fastest anything moves anywhere on this chart. */
function fastest(chart: Chart): number {
  let best = 1;
  for (const l of chart.links) best = Math.max(best, taxiSpeed(l.surface));
  return best;
}

export function quickestRouteGuided(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  to: NodeId,
): TaxiRoute {
  if (from < 0 || from >= chart.numNodes) return refuse('the start is not a point on the chart');
  if (to < 0 || to >= chart.numNodes)
    return refuse('the destination is not a point on the chart');
  if (from === to) return stayPut(from);

  const topSpeed = fastest(chart);
  const guess = (v: NodeId) => chart.straightLineM(v, to) / topSpeed;

  const best = new Map<string, number>();
  const cameFrom = new Map<string, State>();
  const settled = new Set<string>();

  // The heap is keyed by the estimate; `best` still holds the real cost.
  const queue = new MinHeap<{ state: State; cost: number }>();
  const start: State = { at: from, via: NO_LINK };
  best.set(key(start), 0);
  queue.push(guess(from), { state: start, cost: 0 });

  let expanded = 0;
  let generated = 1;
  let arrived: State | undefined;

  for (;;) {
    const top = queue.pop();
    if (!top) break;
    const { state: here, cost } = top.value;
    const hereKey = key(here);
    if (settled.has(hereKey)) continue;
    settled.add(hereKey);
    ++expanded;

    if (here.at === to) {
      arrived = here;
      break;
    }

    for (const e of chart.linksAt(here.at)) {
      if (!chart.travellable(e, here.at)) continue;
      if (unusableReason(chart, e, ac)) continue;
      if (e === here.via) continue;

      const next = chart.other(e, here.at);
      if (next < 0) continue;

      let candidate = cost + legSeconds(chart, e);
      if (here.via !== NO_LINK && chart.turnAngle(here.via, e, here.at) > TURN_THRESHOLD)
        candidate += ac.turnPenaltyS;

      const there: State = { at: next, via: e };
      const thereKey = key(there);
      if (settled.has(thereKey)) continue;

      const known = best.get(thereKey);
      if (known === undefined || candidate + 1e-9 < known) {
        best.set(thereKey, candidate);
        cameFrom.set(thereKey, here);
        queue.push(candidate + guess(next), { state: there, cost: candidate });
        ++generated;
      }
    }
  }

  if (!arrived)
    return refuse(
      `no route for ${ac.type} from ${chart.node(from).name} to ${chart.node(to).name}`,
    );

  const legList: LinkId[] = [];
  let at = arrived;
  while (!(at.at === from && at.via === NO_LINK)) {
    legList.push(at.via);
    at = cameFrom.get(key(at))!;
  }
  legList.reverse();

  const route = routeFromLegs(chart, from, legList);
  route.seconds = best.get(key(arrived))!;
  route.expanded = expanded;
  route.generated = generated;
  return route;
}
