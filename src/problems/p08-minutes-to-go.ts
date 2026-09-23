// Problem 08 -- Minutes to go.          Brief: docs/taxi/p08-minutes-to-go.md

import {
  type Aircraft,
  type Chart,
  legSeconds,
  MinHeap,
  NO_LINK,
  type NodeId,
  UNREACHABLE,
} from '../chart/index.js';
import type { CostToGo } from './types.js';

export function secondsToGo(chart: Chart, ac: Aircraft, goal: NodeId): CostToGo {
  // TODO(you): for EVERY point on the chart, how long the taxi still is from
  // there, and which leg to take next.
  //
  // Search from the destination backwards.  That sounds like the same thing as
  // searching forwards and is not:
  //
  //   - "Which legs ARRIVE here?" is a different question from "which legs
  //     leave here?".  Taxiway F at Kilo Field is one-way northbound, so it is
  //     a way of reaching Bravo and never a way of leaving it.  Get this wrong
  //     and you produce a table that routes arrivals the wrong way down a
  //     one-way taxiway -- and every route it produces looks fine.
  //   - What comes out is not a route.  It is a number for every point.
  //
  // Leave UNREACHABLE and NO_LINK where there is no route.  That is a real
  // answer, and Problem 09 depends on being able to see it.
  void ac;
  void legSeconds;
  void MinHeap;
  return {
    goal,
    seconds: new Array<number>(chart.numNodes).fill(UNREACHABLE),
    next: new Array<number>(chart.numNodes).fill(NO_LINK),
  };
}
