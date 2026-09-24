// Reference solution -- Problem 14: from the other end.
//
// Every search so far started where the aeroplane is.  Backward search starts
// where it is going and works out, asking not "where can I go from here" but
// "how could I have arrived here".  On a chart with one-way taxiways those are
// genuinely different questions, and getting the second one wrong produces a
// route that looks fine and taxis Foxtrot the wrong way.
//
// What backward search leaves behind is worth more than the route: a cost to
// finish from EVERY point, which is exactly Problem 08's table and exactly what
// the capstone replans against.
//
// Bidirectional runs both at once and stops when the two wavefronts touch.  It
// examines far less of the aerodrome, and the bookkeeping to make the meeting
// point yield a shortest route is the interesting part.
//
// [book] LaValle Section 2.2.3, Figures 2.6 and 2.7.

import {
  type Aircraft,
  type Chart,
  legSeconds,
  type LinkId,
  MinHeap,
  NO_LINK,
  NO_NODE,
  type NodeId,
  refuse,
  routeFromLegs,
  stayPut,
  type TaxiRoute,
  UNREACHABLE,
} from '../chart/index.js';
import { unusableReason } from './p03-will-it-fit.js';

export function backwardRoute(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  to: NodeId,
): TaxiRoute {
  if (from < 0 || from >= chart.numNodes) return refuse('the start is not a point on the chart');
  if (to < 0 || to >= chart.numNodes) return refuse('the destination is not a point on the chart');
  if (from === to) return stayPut(from);

  // toGo[v] is the least time from v to the destination, and leaveBy[v] is the
  // leg to take at v to achieve it.  Note the direction: this is a table of
  // NEXT legs, not previous ones.
  const toGo = new Array<number>(chart.numNodes).fill(UNREACHABLE);
  const leaveBy = new Array<LinkId>(chart.numNodes).fill(NO_LINK);
  const settled = new Array<boolean>(chart.numNodes).fill(false);

  const queue = new MinHeap<NodeId>();
  toGo[to] = 0;
  queue.push(0, to);

  let expanded = 0;
  let generated = 1;

  while (true) {
    const top = queue.pop();
    if (!top) break;
    const at = top.value;
    if (settled[at]) continue;
    settled[at] = true;
    ++expanded;
    if (at === from) break;

    // The predecessors of `at`: every leg that can be travelled INTO it.  The
    // test is travellable(e, w) -- can this leg be driven starting from w --
    // and not travellable(e, at), which would be the forward question and would
    // quietly let the search run the wrong way down a one-way taxiway.
    for (const e of chart.linksAt(at)) {
      const w = chart.other(e, at);
      if (w === NO_NODE || settled[w]) continue;
      if (!chart.travellable(e, w)) continue;
      if (unusableReason(chart, e, ac)) continue;

      const candidate = top.key + legSeconds(chart, e);
      if (candidate + 1e-9 >= toGo[w]!) continue;
      toGo[w] = candidate;
      leaveBy[w] = e;
      queue.push(candidate, w);
      ++generated;
    }
  }

  if (toGo[from] === UNREACHABLE)
    return refuse(
      `no route for ${ac.type} from ${chart.node(from).name} to ${chart.node(to).name}`,
    );

  // Walk FORWARDS along the next-leg table.  A backward search assembles its
  // answer in the order it will be flown, with no reversal at the end.
  const legs: LinkId[] = [];
  let at = from;
  for (let guard = 0; at !== to; ++guard) {
    if (guard > chart.numLinks) return refuse('the next-leg table forms a loop');
    const e = leaveBy[at]!;
    if (e === NO_LINK) return refuse('the next-leg table stops short of the destination');
    legs.push(e);
    at = chart.other(e, at);
  }

  const route = routeFromLegs(chart, from, legs);
  route.expanded = expanded;
  route.generated = generated;
  return route;
}

export function bidirectionalRoute(chart: Chart, from: NodeId, to: NodeId): TaxiRoute {
  if (from < 0 || from >= chart.numNodes) return refuse('the start is not a point on the chart');
  if (to < 0 || to >= chart.numNodes) return refuse('the destination is not a point on the chart');
  if (from === to) return stayPut(from);

  const seenF = new Array<boolean>(chart.numNodes).fill(false);
  const seenB = new Array<boolean>(chart.numNodes).fill(false);
  const arrivedBy = new Array<LinkId>(chart.numNodes).fill(NO_LINK); // forward tree
  const leaveBy = new Array<LinkId>(chart.numNodes).fill(NO_LINK); //   backward tree

  let frontF: NodeId[] = [from];
  let frontB: NodeId[] = [to];
  seenF[from] = true;
  seenB[to] = true;

  let expanded = 0;
  let generated = 2;

  // One whole wavefront per round, always the smaller of the two.
  //
  // Figure 2.7 instead takes a single point from each queue per iteration.
  // That is simpler, but it can return a route one leg longer than necessary,
  // because the two trees may touch in the middle of a level.  Expanding whole
  // levels costs nothing extra and keeps breadth first's fewest-legs guarantee.
  while (frontF.length > 0 && frontB.length > 0) {
    const forward = frontF.length <= frontB.length;
    const frontier = forward ? frontF : frontB;
    const seenHere = forward ? seenF : seenB;
    const seenThere = forward ? seenB : seenF;

    const next: NodeId[] = [];
    const meetings: NodeId[] = [];

    for (const at of frontier) {
      ++expanded;
      for (const e of chart.linksAt(at)) {
        const w = chart.other(e, at);
        if (w === NO_NODE) continue;
        // Forwards: can I drive e starting at `at`?  Backwards: could I have
        // driven e starting at w, to arrive at `at`?
        if (!chart.travellable(e, forward ? at : w)) continue;
        if (seenHere[w]) continue;

        seenHere[w] = true;
        if (forward) arrivedBy[w] = e;
        else leaveBy[w] = e;
        next.push(w);
        ++generated;
        if (seenThere[w]) meetings.push(w);
      }
    }

    const meet = meetings[0];
    if (meet !== undefined) {
      // Any meeting point in this level gives a shortest route; take the first.
      const legs: LinkId[] = [];

      // The head: walk the forward tree back from the meeting point and turn it
      // round.
      const head: LinkId[] = [];
      let at = meet;
      for (let guard = 0; at !== from; ++guard) {
        if (guard > chart.numLinks) return refuse('the forward tree forms a loop');
        const e = arrivedBy[at]!;
        if (e === NO_LINK) return refuse('the two halves do not join up');
        head.push(e);
        at = chart.other(e, at);
      }
      head.reverse();
      legs.push(...head);

      // The tail: walk the backward tree forwards from the meeting point.  It
      // is already in flying order.
      at = meet;
      for (let guard = 0; at !== to; ++guard) {
        if (guard > chart.numLinks) return refuse('the backward tree forms a loop');
        const e = leaveBy[at]!;
        if (e === NO_LINK) return refuse('the two halves do not join up');
        legs.push(e);
        at = chart.other(e, at);
      }

      const route = routeFromLegs(chart, from, legs);
      route.expanded = expanded;
      route.generated = generated;
      return route;
    }

    if (forward) frontF = next;
    else frontB = next;
  }

  const failed = refuse(
    `no route from ${chart.node(from).name} to ${chart.node(to).name} on this chart`,
  );
  failed.expanded = expanded;
  failed.generated = generated;
  return failed;
}
