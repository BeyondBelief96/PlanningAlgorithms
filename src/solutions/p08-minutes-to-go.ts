// Reference solution -- Problem 08: minutes to go.
//
// The change of object, and the most useful thing in Part 1.
//
// Everything so far answered "what should this aeroplane do, given that it is
// on stand 2?".  This answers "what should an aeroplane do?", for every point
// on the aerodrome at once -- because an aeroplane on a real surface is
// routinely not where the plan said it would be.  It stopped short.  It was
// held.  It took the wrong exit.  It was told to give way and is now sitting
// somewhere nobody planned for.
//
// You get there by searching from the destination backwards, which sounds like
// the same thing and is not:
//
//   - "Which legs arrive here?" is a different question from "which legs leave
//     here?".  Taxiway F at Kilo Field is one-way northbound, so it is a way of
//     REACHING Bravo and never a way of leaving it.  Get this wrong and you
//     produce a table that cheerfully routes arrivals the wrong way down a
//     one-way taxiway, and every route it produces looks fine.
//   - What comes out is not a route.  It is a number for every point, plus the
//     leg to take from each -- which is what Problems 09 and 10 live on.

import {
  type Aircraft,
  type Chart,
  legSeconds,
  MinHeap,
  NO_LINK,
  type NodeId,
  UNREACHABLE,
} from '../chart/index.js';
import type { CostToGo } from '../problems/types.js';
import { unusableReason } from './p03-will-it-fit.js';

export function secondsToGo(chart: Chart, ac: Aircraft, goal: NodeId): CostToGo {
  const table: CostToGo = {
    goal,
    seconds: new Array<number>(chart.numNodes).fill(UNREACHABLE),
    next: new Array<number>(chart.numNodes).fill(NO_LINK),
  };
  if (goal < 0 || goal >= chart.numNodes) return table;

  const settled = new Array<boolean>(chart.numNodes).fill(false);
  const queue = new MinHeap<NodeId>();
  table.seconds[goal] = 0;
  queue.push(0, goal);

  for (;;) {
    const top = queue.pop();
    if (!top) break;
    const at = top.value;
    if (settled[at]) continue;
    settled[at] = true;

    // Who can reach `at`?  Not "where can I go from at" -- that is the other
    // question, and on a one-way taxiway it has a different answer.
    for (const e of chart.linksAt(at)) {
      const before = chart.other(e, at);
      if (before < 0 || settled[before]) continue;

      // The leg has to be travellable in the direction that arrives here.
      if (!chart.travellable(e, before)) continue;
      if (unusableReason(chart, e, ac)) continue;

      const candidate = top.key + legSeconds(chart, e);
      if (candidate + 1e-9 < table.seconds[before]!) {
        table.seconds[before] = candidate;
        // From `before`, the leg to take is the one that got us here.
        table.next[before] = e;
        queue.push(candidate, before);
      }
    }
  }

  table.next[goal] = NO_LINK; // nothing to do once you are there
  return table;
}
