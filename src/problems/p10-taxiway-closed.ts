// Problem 10 -- Bravo is closed.        Brief: docs/taxi/p10-taxiway-closed.md

import { type Aircraft, type Chart, type NodeId, refuse, UNREACHABLE } from '../chart/index.js';
import type { Disruption } from './types.js';

export function withTaxiwayClosed(chart: Chart, taxiway: string): Chart {
  // TODO(you): a copy of the chart with every leg of that taxiway closed.
  //
  // chart.clone() gives you a copy whose legs you may edit without touching the
  // original -- which matters, because the tests close a taxiway and then use
  // the original chart again.  Remember to build() the copy.
  void taxiway;
  return chart;
}

export function closureCost(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  to: NodeId,
  taxiway: string,
): Disruption {
  // TODO(you): plan the taxi before and after the closure, and report what it
  // cost.
  //
  // When there is no route afterwards, `after` carries the refusal and
  // delaySeconds is UNREACHABLE.  Whether a closure costs two minutes or
  // everything depends on which aeroplane is asking, and this has to be able to
  // say so.
  void chart;
  void ac;
  void from;
  void to;
  void taxiway;
  const nope = refuse('closureCost is not implemented yet');
  return { before: nope, after: nope, delaySeconds: UNREACHABLE };
}
