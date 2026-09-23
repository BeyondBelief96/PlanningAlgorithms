// Problem 04 -- Turns cost time.        Brief: docs/taxi/p04-turns-cost-time.md

import {
  type Aircraft,
  type Chart,
  legSeconds,
  MinHeap,
  NO_LINK,
  type NodeId,
  refuse,
  routeFromLegs,
  stayPut,
  type TaxiRoute,
} from '../chart/index.js';

/** 30 degrees.  Anything sharper is a turn you have to slow down for. */
export const TURN_THRESHOLD = Math.PI / 6;

export function quickestRouteWithTurns(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  to: NodeId,
): TaxiRoute {
  // TODO(you): as Problem 03, but a turn of more than TURN_THRESHOLD costs
  // ac.turnPenaltyS seconds.  chart.turnAngle(incoming, outgoing, at) gives you
  // the angle.
  //
  // Before you write any code, work out what the state has to be.  Whether
  // leaving D1 north-east is a turn depends on which leg you ARRIVED along, so
  // "the cheapest way to be at D1" is no longer a single number.  Search over
  // points alone and you charge a penalty belonging to a different arrival -- a
  // route twenty seconds out here and there, always plausible, never right.
  //
  //   - An aeroplane cannot turn round on the spot: do not allow leaving along
  //     the leg you arrived on.
  //   - Build the answer with routeFromLegs(), then overwrite `seconds` with
  //     the cost your search actually found.  The legs alone do not include the
  //     turns, and validateRoute() allows seconds to exceed them for exactly
  //     this reason.
  void chart;
  void ac;
  void from;
  void to;
  void legSeconds;
  void MinHeap;
  void NO_LINK;
  void routeFromLegs;
  void stayPut;
  return refuse('quickestRouteWithTurns is not implemented yet');
}
