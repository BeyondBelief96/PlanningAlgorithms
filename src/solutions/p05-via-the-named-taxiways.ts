// Reference solution -- Problem 05: via the named taxiways.
//
// The most important problem in Part 1, and the one with no counterpart in a
// textbook.
//
// "VIA ALPHA DELTA BRAVO ECHO" is not a preference and it is not a filter.  It
// is a constraint the search runs *under*.  The distinction is not academic:
//
//   - filter afterwards -- find the quickest route, then check it used A, D, B
//     and E in order.  When it did not, you have nothing to say except "no".
//     There may be a perfectly good complying route; you never looked for it.
//   - search under it -- carry "how much of the clearance have I used up?" in
//     the state, and the quickest complying route falls out directly.
//
// So the state is (point, how many of the named taxiways have been joined).
// The same point appears several times over, once per stage, which is the right
// answer: standing at D1 having joined Delta and standing at D1 having joined
// Bravo are genuinely different situations to be in.

import {
  type Aircraft,
  type Chart,
  type Clearance,
  legSeconds,
  type LinkId,
  MinHeap,
  NO_NODE,
  type NodeId,
  refuse,
  routeFromLegs,
  type TaxiRoute,
} from '../chart/index.js';
import { quickestRouteFor, unusableReason } from './p03-will-it-fit.js';

interface State {
  at: NodeId;
  /** How many entries of `via` have been joined.  0 means none yet. */
  stage: number;
}

function key(s: State): string {
  return `${s.at}:${s.stage}`;
}

export function routeUnderClearance(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  clr: Clearance,
): TaxiRoute {
  if (from < 0 || from >= chart.numNodes) return refuse('the start is not a point on the chart');

  const goal = chart.find(clr.destination);
  if (goal === NO_NODE)
    return refuse(`UNABLE: ${clr.destination} is not a point on this aerodrome`);

  const stages = clr.via.length;
  // "By any route" is a thing controllers say at quiet aerodromes.
  if (stages === 0) return quickestRouteFor(chart, ac, from, goal);

  const best = new Map<string, number>();
  const cameFrom = new Map<string, { state: State; via: LinkId }>();
  const settled = new Set<string>();

  const queue = new MinHeap<State>();
  const start: State = { at: from, stage: 0 };
  best.set(key(start), 0);
  queue.push(0, start);

  let expanded = 0;
  let generated = 1;
  let arrived = false;

  for (;;) {
    const top = queue.pop();
    if (!top) break;
    const here = top.value;
    const hereKey = key(here);
    if (settled.has(hereKey)) continue;
    settled.add(hereKey);
    ++expanded;

    if (here.at === goal && here.stage === stages) {
      arrived = true;
      break;
    }

    for (const e of chart.linksAt(here.at)) {
      if (!chart.travellable(e, here.at)) continue;
      if (unusableReason(chart, e, ac)) continue;

      const leg = chart.link(e);
      let nextStage = -1;

      if (here.stage < stages && leg.taxiway === clr.via[here.stage]) {
        nextStage = here.stage + 1; // joining the next named taxiway
      } else if (here.stage > 0 && leg.taxiway === clr.via[here.stage - 1]) {
        nextStage = here.stage; // still on the one we are on
      } else if (here.stage === 0 && (leg.surface === 'stand' || leg.surface === 'apron')) {
        nextStage = 0; // manoeuvring off the stand to reach the first named one
      }
      if (nextStage < 0) continue;

      const next = chart.other(e, here.at);
      if (next < 0) continue;

      const there: State = { at: next, stage: nextStage };
      const thereKey = key(there);
      if (settled.has(thereKey)) continue;

      const candidate = top.key + legSeconds(chart, e);
      const known = best.get(thereKey);
      if (known === undefined || candidate + 1e-9 < known) {
        best.set(thereKey, candidate);
        cameFrom.set(thereKey, { state: here, via: e });
        queue.push(candidate, there);
        ++generated;
      }
    }
  }

  if (!arrived) {
    // Say which of the two things went wrong, because they mean different
    // things on the radio.  "I cannot get there at all" is a chart problem;
    // "I cannot get there THAT WAY" is a readback problem, and the answer is
    // to ask for a different routing.
    const anyRoute = quickestRouteFor(chart, ac, from, goal);
    if (!anyRoute.ok)
      return refuse(
        `UNABLE: no route for ${ac.type} from ${chart.node(from).name} to ${clr.destination}`,
      );
    return refuse(
      `UNABLE: ${clr.destination} cannot be reached via the taxiways given ` +
        `(${clr.via.join(' ')}); request a different routing`,
    );
  }

  const legList: LinkId[] = [];
  let at: State = { at: goal, stage: stages };
  while (!(at.at === from && at.stage === 0)) {
    const step = cameFrom.get(key(at))!;
    legList.push(step.via);
    at = step.state;
  }
  legList.reverse();

  const route = routeFromLegs(chart, from, legList);
  route.expanded = expanded;
  route.generated = generated;
  return route;
}
