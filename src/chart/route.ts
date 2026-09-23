// The answer, and how it is checked.
//
// Part of the *given* library.
//
// Note the shape of TaxiRoute: it is either a route or a *reason*.  That is not
// defensive programming, it is the deliverable.  A surface planner that cannot
// say "no, and here is why" is worse than useless, because the case where it
// should refuse is exactly the case where somebody gets hurt.  Half the tests
// in Part 1 check refusals.

import { type Chart, type LinkId, type NodeId, NO_LINK, NO_NODE, taxiSpeed } from './chart.js';

export const UNREACHABLE = Number.POSITIVE_INFINITY;

export interface TaxiRoute {
  ok: boolean;
  /**
   * Non-empty exactly when ok is false.  Say what is wrong and name the thing
   * that is wrong -- "TWY D takes 36 m, B777 is 64.8 m" beats "no route found"
   * every time.
   */
  refusal: string;

  /** nodes.length === links.length + 1 for a route of at least one leg. */
  nodes: NodeId[];
  links: LinkId[];

  distanceM: number;
  seconds: number;

  /**
   * Where the aircraft must come to a full stop and wait, if anywhere.  A
   * departure taxi normally ends at one of these.
   */
  stopAt: NodeId;

  /** How hard the planner worked.  Problems 02, 07 and 10 compare these. */
  expanded: number;
  generated: number;
}

export function emptyRoute(): TaxiRoute {
  return {
    ok: false,
    refusal: '',
    nodes: [],
    links: [],
    distanceM: 0,
    seconds: 0,
    stopAt: NO_NODE,
    expanded: 0,
    generated: 0,
  };
}

/** Build a refusal.  `why` must not be empty. */
export function refuse(why: string): TaxiRoute {
  const r = emptyRoute();
  r.refusal = why.trim() || 'refused, no reason given';
  return r;
}

/** A route that is already where it needs to be. */
export function stayPut(at: NodeId): TaxiRoute {
  const r = emptyRoute();
  r.ok = true;
  r.nodes = [at];
  return r;
}

/**
 * Seconds to travel one leg, ignoring turns: its length divided by the speed of
 * its surface.  This is the cost model for the whole of Part 1, and it is given
 * so that everybody's numbers agree.
 */
export function legSeconds(chart: Chart, e: LinkId): number {
  const l = chart.link(e);
  return l.lengthM / taxiSpeed(l.surface);
}

// --- Assembling an answer ---------------------------------------------------
//
// Walking parent pointers back is bookkeeping, not algorithm, and every problem
// would otherwise repeat it.  Both of these fill in nodes, links, distanceM and
// seconds, and set ok.

/** Hand it the legs in order, starting from `from`. */
export function routeFromLegs(chart: Chart, from: NodeId, legList: readonly LinkId[]): TaxiRoute {
  const route = emptyRoute();
  route.ok = true;
  route.nodes.push(from);
  let at = from;
  for (const e of legList) {
    const next = chart.other(e, at);
    if (next === NO_NODE) return refuse('the legs do not join up');
    route.links.push(e);
    route.nodes.push(next);
    route.distanceM += chart.link(e).lengthM;
    route.seconds += legSeconds(chart, e);
    at = next;
  }
  return route;
}

/**
 * `arrivedBy[v]` is the leg the search reached v along; `arrivedBy[from]` is
 * ignored.  Walks back from `to` and turns it round.
 */
export function assembleRoute(
  chart: Chart,
  from: NodeId,
  to: NodeId,
  arrivedBy: readonly LinkId[],
): TaxiRoute {
  const legList: LinkId[] = [];
  let at = to;
  // A route never needs more legs than the chart has.
  for (let guard = 0; at !== from; ++guard) {
    if (guard > chart.numLinks) return refuse('the parent links form a loop');
    const e = arrivedBy[at];
    if (e === undefined || e === NO_LINK)
      return refuse(`no route recorded to ${chart.node(to).name}`);
    legList.push(e);
    at = chart.other(e, at);
    if (at === NO_NODE) return refuse('a recorded leg does not touch the point it led to');
  }
  legList.reverse();
  return routeFromLegs(chart, from, legList);
}

/**
 * The taxiways a route uses, in order, with consecutive repeats collapsed --
 * what you would actually say on the radio.
 *
 *     ["STAND 2", "APRON", "A", "D", "B", "E"]
 */
export function taxiwaysUsed(chart: Chart, route: TaxiRoute): string[] {
  const out: string[] = [];
  for (const e of route.links) {
    const name = chart.link(e).taxiway;
    if (out.length === 0 || out[out.length - 1] !== name) out.push(name);
  }
  return out;
}

/** One line, for printing. */
export function describe(chart: Chart, route: TaxiRoute): string {
  if (!route.ok) return `REFUSED: ${route.refusal}`;

  const ways = taxiwaysUsed(chart, route);
  const total = Math.round(route.seconds);
  const mmss = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  let out = `${ways.length ? ways.join(' > ') : '(no movement)'}  (${Math.round(route.distanceM)} m, ${mmss})`;
  if (route.stopAt !== NO_NODE) out += `  hold short at ${chart.node(route.stopAt).name}`;
  return out;
}

/**
 * Re-walks the route and checks it holds together: the legs really join the
 * points, consecutive legs really share a point, no one-way leg is travelled
 * backwards, distanceM and seconds really are the sums, and a refusal really
 * carries a reason.  Returns "" when the route is sound, otherwise the first
 * thing wrong with it.
 *
 * Every test in Part 1 runs this on every route you return.  A route you cannot
 * check is not a route you can taxi.
 */
export function validateRoute(chart: Chart, route: TaxiRoute): string {
  if (!route.ok) {
    return route.refusal ? '' : 'route is not ok but carries no reason';
  }
  if (route.refusal) return 'route is ok but carries a refusal reason';

  if (route.nodes.length === 0) return 'an ok route must name at least the point it starts at';
  if (route.nodes.length !== route.links.length + 1)
    return `nodes.length (${route.nodes.length}) must be links.length + 1 (${route.links.length + 1})`;

  for (const v of route.nodes)
    if (v < 0 || v >= chart.numNodes) return `route visits point ${v}, which is not on the chart`;

  let metres = 0;
  let seconds = 0;
  for (let i = 0; i < route.links.length; ++i) {
    const e = route.links[i]!;
    if (e < 0 || e >= chart.numLinks) return `route uses leg ${e}, which is not on the chart`;

    const from = route.nodes[i]!;
    const to = route.nodes[i + 1]!;
    if (chart.other(e, from) !== to)
      return `leg ${i} (${chart.link(e).taxiway}) does not join ${chart.node(from).name} to ${chart.node(to).name}`;
    if (!chart.travellable(e, from))
      return `leg ${i} runs the wrong way down one-way ${chart.link(e).taxiway}`;

    metres += chart.link(e).lengthM;
    seconds += legSeconds(chart, e);
  }

  if (Math.abs(metres - route.distanceM) > 0.5)
    return `distanceM is ${route.distanceM.toFixed(1)} but the legs add up to ${metres.toFixed(1)}`;

  // seconds may legitimately exceed the sum of the legs -- Problem 04 adds turn
  // penalties -- but it must never be less.
  if (route.seconds < seconds - 0.5)
    return `seconds is ${route.seconds.toFixed(1)} but the legs alone take ${seconds.toFixed(1)}`;

  if (route.stopAt !== NO_NODE) {
    if (route.stopAt < 0 || route.stopAt >= chart.numNodes)
      return 'stopAt is not a point on the chart';
    if (!route.nodes.includes(route.stopAt)) return 'stopAt names a point the route never reaches';
  }
  return '';
}
