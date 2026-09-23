// Reference solution -- Problem 04: turns cost time.
//
// The first problem where the obvious state is the wrong state, and it is worth
// being precise about why.
//
// A turn costs twenty seconds.  Whether arriving at D1 and leaving north-east
// IS a turn depends on which leg you arrived along -- come up Delta from the
// south and it is a right-angle turn; come along Bravo from the west and it is
// straight on.  So "the cheapest way to be at D1" is not a single number any
// more.  There are as many numbers as there are ways to arrive.
//
// Hence the state is (point, leg you arrived along), not (point).  That is
// exactly the move the capstone makes when it searches over directed edges
// rather than vertices, and for exactly the same reason: heading has to be in
// the state for anything about turning to be checkable.
//
// The cost of getting this wrong is subtle and nasty.  Search over points alone
// and you settle D1 at its cheapest arrival, then charge a turn penalty that
// belongs to a different arrival -- a route that is twenty seconds out here and
// there, always plausible, never right.

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
} from '../chart/index.js';
import { unusableReason } from './p03-will-it-fit.js';

/** 30 degrees.  Anything sharper than this is a turn you have to slow for. */
export const TURN_THRESHOLD = Math.PI / 6;

interface State {
  at: NodeId;
  /** The leg arrived along.  NO_LINK at the start, where no turn can apply. */
  via: LinkId;
}

/** Two numbers packed into a map key.  A state is a point AND an arrival. */
function key(s: State): string {
  return `${s.at}:${s.via}`;
}

export function quickestRouteWithTurns(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  to: NodeId,
): TaxiRoute {
  if (from < 0 || from >= chart.numNodes) return refuse('the start is not a point on the chart');
  if (to < 0 || to >= chart.numNodes)
    return refuse('the destination is not a point on the chart');
  if (from === to) return stayPut(from);

  const best = new Map<string, number>();
  const cameFrom = new Map<string, State>();
  const settled = new Set<string>();

  const queue = new MinHeap<State>();
  const start: State = { at: from, via: NO_LINK };
  best.set(key(start), 0);
  queue.push(0, start);

  let expanded = 0;
  let generated = 1;
  let arrived: State | undefined;

  for (;;) {
    const top = queue.pop();
    if (!top) break;
    const here = top.value;
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
      // An aeroplane cannot turn round on the spot.
      if (e === here.via) continue;

      const next = chart.other(e, here.at);
      if (next < 0) continue;

      let candidate = top.key + legSeconds(chart, e);
      if (here.via !== NO_LINK && chart.turnAngle(here.via, e, here.at) > TURN_THRESHOLD)
        candidate += ac.turnPenaltyS;

      const there: State = { at: next, via: e };
      const thereKey = key(there);
      if (settled.has(thereKey)) continue;

      const known = best.get(thereKey);
      if (known === undefined || candidate + 1e-9 < known) {
        best.set(thereKey, candidate);
        cameFrom.set(thereKey, here);
        queue.push(candidate, there);
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
  // The legs alone do not include the turns, so take the cost the search found.
  route.seconds = best.get(key(arrived))!;
  route.expanded = expanded;
  route.generated = generated;
  return route;
}
