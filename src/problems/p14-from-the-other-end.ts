// Problem 14 -- From the other end.
// Brief: docs/taxi/p14-from-the-other-end.md

import {
  type Aircraft,
  type Chart,
  legSeconds,
  MinHeap,
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
  // TODO(you): Problem 03's Dijkstra, started at the DESTINATION and worked
  // outwards.
  //
  // The question at each step is not "where can I go from here" but "how could
  // I have arrived here".  On Kilo Field that is a genuinely different
  // question, because Foxtrot is one-way: the test is
  //
  //     chart.travellable(e, w)     can leg e be driven starting from w
  //
  // where w is the far end.  Using travellable(e, at) instead is the forward
  // question, and it quietly lets the search run the wrong way down Foxtrot.
  // The route it produces looks perfectly reasonable.
  //
  // What you build is a table of NEXT legs rather than previous ones, so the
  // answer assembles forwards with no reversal at the end.  Notice that the
  // table is Problem 08's answer, arrived at from a different direction.
  void chart;
  void ac;
  void from;
  void to;
  void unusableReason;
  void legSeconds;
  void MinHeap;
  void UNREACHABLE;
  void routeFromLegs;
  void stayPut;
  void NO_NODE;
  return refuse('backwardRoute is not implemented yet');
}

export function bidirectionalRoute(chart: Chart, from: NodeId, to: NodeId): TaxiRoute {
  // TODO(you): a breadth-first wavefront from each end, stopping when they
  // touch.  Two visited sets, two trees of parent legs, and the fiddly bit is
  // joining the two halves at the meeting point -- the forward half has to be
  // reversed and the backward half does not.
  //
  // Expand one WHOLE wavefront per round, always the smaller of the two.  The
  // book's Figure 2.7 takes a single point from each queue per iteration, which
  // is simpler but can return a route one leg longer than necessary, because
  // the two trees may touch in the middle of a level.
  //
  // Compare `expanded` with Problem 01 on the busy hub.  Two small circles
  // cover far less than one large one, and that is the entire argument.
  void chart;
  void from;
  void to;
  return refuse('bidirectionalRoute is not implemented yet');
}
