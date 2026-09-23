// Reference solution -- Problem 10: Bravo is closed.
//
// The aerodrome changes while the aeroplane is taxiing.  A tug breaks down, a
// taxiway closes for a fuel spill, a light aircraft goes off the pavement.
// This happens several times a day at a busy airport; it is not an exceptional
// case, it is the normal one.
//
// The interesting part is what it costs, and at Kilo Field the answer is
// asymmetric in a way worth seeing for yourself:
//
//   - close Delta and an A320 shrugs.  Foxtrot goes the same way for the same
//     money, so the delay is zero.
//   - close Foxtrot as well and it is stuck, because Delta will not take its
//     wingspan.  Same two closures, and whether the answer is "no delay" or
//     "no route at all" depends entirely on which aeroplane is asking.

import { type Aircraft, type Chart, type NodeId, UNREACHABLE } from '../chart/index.js';
import type { Disruption } from '../problems/types.js';
import { quickestRouteFor } from './p03-will-it-fit.js';

export function withTaxiwayClosed(chart: Chart, taxiway: string): Chart {
  const copy = chart.clone();
  for (const e of copy.links) if (e.taxiway === taxiway) e.closed = true;
  copy.build();
  return copy;
}

export function closureCost(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  to: NodeId,
  taxiway: string,
): Disruption {
  const before = quickestRouteFor(chart, ac, from, to);
  const after = quickestRouteFor(withTaxiwayClosed(chart, taxiway), ac, from, to);

  return {
    before,
    after,
    delaySeconds: before.ok && after.ok ? after.seconds - before.seconds : UNREACHABLE,
  };
}
