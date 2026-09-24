// Reference solution -- Problem 13: deep first, and what it costs.
//
// Problem 01 searched breadth first: examine everything one leg away, then
// everything two legs away, and so on.  It always finds the route with fewest
// legs, and it pays for that by holding the whole frontier in memory -- on a
// real aerodrome graph, or on the pose lattice of the capstone, that frontier
// does not fit.
//
// Depth first holds only the current branch.  It charges off down one line of
// taxiways until it can go no further, and the route it comes back with may be
// absurd: it is the first one it stumbled into, not the shortest.
//
// Iterative deepening has both properties, by doing depth first over and over
// with a growing limit and throwing the previous pass away each time.  The
// waste is bounded and much smaller than it looks: on a graph with branching
// factor b, the last pass alone does about (b - 1)/b of the total work, so
// repeating everything before it costs a constant factor rather than a
// quadratic one.
//
// [book] LaValle Section 2.2.2.

import {
  assembleRoute,
  type Chart,
  type LinkId,
  NO_LINK,
  NO_NODE,
  type NodeId,
  refuse,
  routeFromLegs,
  stayPut,
  type TaxiRoute,
} from '../chart/index.js';

export function depthFirstRoute(chart: Chart, from: NodeId, to: NodeId): TaxiRoute {
  if (from < 0 || from >= chart.numNodes) return refuse('the start is not a point on the chart');
  if (to < 0 || to >= chart.numNodes) return refuse('the destination is not a point on the chart');
  if (from === to) return stayPut(from);

  // The same template as Problem 01.  The ONLY difference is which end of the
  // container the next point comes out of -- and that one line is the whole
  // difference between the two algorithms.  It is worth staring at.
  const stack: NodeId[] = [from];
  const visited = new Array<boolean>(chart.numNodes).fill(false);
  const arrivedBy = new Array<LinkId>(chart.numNodes).fill(NO_LINK);
  visited[from] = true;

  let expanded = 0;
  let generated = 1;

  while (stack.length > 0) {
    const at = stack.pop()!; // pop, not shift.  That is the algorithm.
    ++expanded;
    if (at === to) {
      const route = assembleRoute(chart, from, to, arrivedBy);
      route.expanded = expanded;
      route.generated = generated;
      return route;
    }
    for (const e of chart.linksAt(at)) {
      if (!chart.travellable(e, at)) continue;
      const next = chart.other(e, at);
      if (next === NO_NODE || visited[next]) continue;
      visited[next] = true;
      arrivedBy[next] = e;
      stack.push(next);
      ++generated;
    }
  }
  return refuse(
    `no route from ${chart.node(from).name} to ${chart.node(to).name} on this chart`,
  );
}

/**
 * Depth-limited search.  `onPath` rather than a global visited set, because a
 * point that was too deep down one branch may be shallow enough down another --
 * and a global visited set would wrongly rule it out.
 */
function within(
  chart: Chart,
  at: NodeId,
  to: NodeId,
  budget: number,
  onPath: boolean[],
  legs: LinkId[],
  stats: { expanded: number; generated: number },
): boolean {
  ++stats.expanded;
  if (at === to) return true;
  if (budget === 0) return false;

  onPath[at] = true;
  for (const e of chart.linksAt(at)) {
    if (!chart.travellable(e, at)) continue;
    const next = chart.other(e, at);
    if (next === NO_NODE || onPath[next]) continue;
    legs.push(e);
    ++stats.generated;
    if (within(chart, next, to, budget - 1, onPath, legs, stats)) {
      onPath[at] = false;
      return true;
    }
    legs.pop();
  }
  onPath[at] = false;
  return false;
}

export function routeWithinLegs(
  chart: Chart,
  from: NodeId,
  to: NodeId,
  maxLegs: number,
): TaxiRoute {
  if (from < 0 || from >= chart.numNodes) return refuse('the start is not a point on the chart');
  if (to < 0 || to >= chart.numNodes) return refuse('the destination is not a point on the chart');
  if (maxLegs < 0) return refuse('a leg budget below zero is not a budget');

  const stats = { expanded: 0, generated: 0 };
  const onPath = new Array<boolean>(chart.numNodes).fill(false);
  const legs: LinkId[] = [];
  const found = within(chart, from, to, maxLegs, onPath, legs, stats);

  // The work counters go on the refusal too.  Iterative deepening adds them up
  // across the passes that failed, and a refusal that forgets how hard it tried
  // makes the whole comparison with Problem 01 meaningless.
  const route = found
    ? routeFromLegs(chart, from, legs)
    : refuse(
        `no route from ${chart.node(from).name} to ${chart.node(to).name} in ${maxLegs} leg(s)`,
      );
  route.expanded = stats.expanded;
  route.generated = stats.generated;
  return route;
}

export function iterativeDeepeningRoute(chart: Chart, from: NodeId, to: NodeId): TaxiRoute {
  if (from < 0 || from >= chart.numNodes) return refuse('the start is not a point on the chart');
  if (to < 0 || to >= chart.numNodes) return refuse('the destination is not a point on the chart');

  // A route never needs more legs than the chart has points minus one, so that
  // is where the deepening stops.  Without a bound this loops forever on a
  // chart where the destination cannot be reached.
  let expanded = 0;
  let generated = 0;
  for (let limit = 0; limit < chart.numNodes; ++limit) {
    const attempt = routeWithinLegs(chart, from, to, limit);
    expanded += attempt.expanded;
    generated += attempt.generated;
    if (attempt.ok) {
      attempt.expanded = expanded;
      attempt.generated = generated;
      return attempt;
    }
  }
  const failed = refuse(
    `no route from ${chart.node(from).name} to ${chart.node(to).name} on this chart`,
  );
  failed.expanded = expanded;
  failed.generated = generated;
  return failed;
}
