// Exercise 02 -- gated boundaries in the graph (Step 2).
// Brief: docs/capstone/ex02-gated-graph.md

import {
  distancePointSegment,
  policyFor,
  TaxiGraph,
  type ZoneLayer,
  zonePriority,
} from '../../airport/index.js';
import { ZONE_SCAN_STEP, ZONE_SPLIT_TOLERANCE } from '../types.js';
import { zoneAt } from './ex01-zone-layer.js';

export function buildGatedGraph(raw: TaxiGraph, layer: ZoneLayer): TaxiGraph {
  // TODO(you): the exercise that makes the invariant enforceable.  Three
  // passes over the raw chart:
  //
  //   1  Copy every vertex.  Then, for every raw edge, walk it in steps of
  //      ZONE_SCAN_STEP asking zoneAt() what zone the point is in.  Where the
  //      answer changes, bisect to ZONE_SPLIT_TOLERANCE and put a new vertex
  //      there.  Add one edge per piece, each tagged with the zone of its own
  //      midpoint and inheriting oneWay, maxWingspan and maxWeightTonnes.
  //
  //   2  hotspot and closed are properties of the *whole* sub-edge, not of its
  //      midpoint.  Taxiway F only clips the hotspot in its last fifty metres,
  //      and a midpoint test misses it.
  //
  //   3  After build(), a vertex whose incident edges do not all agree on the
  //      zone is a boundary, and a boundary on the graph is a gate.  Record
  //      innerZone (lowest zonePriority) and outerZone (highest); the gate is
  //      hard when policyFor(outerZone).requiresClearance, otherwise soft.
  //      Then find which runway is behind it, and whether a painted holding
  //      position sits on it -- that is what gives the gate a name a clearance
  //      can say out loud.
  void raw;
  void layer;
  void ZONE_SCAN_STEP;
  void ZONE_SPLIT_TOLERANCE;
  void zoneAt;
  void policyFor;
  void zonePriority;
  void distancePointSegment;
  return new TaxiGraph();
}
