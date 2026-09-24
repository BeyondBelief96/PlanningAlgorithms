// Exercise 05 -- filtering the graph for this aircraft and this mission (Step 5).
// Brief: docs/capstone/ex05-graph-filter.md

import {
  type AircraftModel,
  allowsGate,
  type DirectedEdge,
  directedIndex,
  type PermissionSet,
  policyFor,
  type TaxiGraph,
  wrapAngle,
  zonePriority,
} from '../../airport/index.js';
import { type EdgeFilter, emptyEdgeFilter, MAX_NODE_TURN } from '../types.js';

export function filterGraph(
  gated: TaxiGraph,
  aircraft: AircraftModel,
  permissions: PermissionSet,
): EdgeFilter {
  // TODO(you): one pass, striking out every directed edge this aircraft or
  // this mission may not use, with a reason a human can read.  Size both arrays
  // to gated.numDirectedEdges and index them with directedIndex(d).
  //
  //   one-way travelled backwards
  //   closed by NOTAM
  //   wingspan over the edge limit -- say which limit
  //   a missionOnly zone (de-icing) that the clearance did not ask for
  //   a zone nothing drives on: forbidden, shoulder, unknown
  //   and the gate rule, below
  //
  // The gate rule is DIRECTIONAL, and that is the part worth thinking about.
  // Look at the vertex you are leaving, i.e. gated.tail(d).  It only blocks you
  // when it is a hard gate, the clearance does not open it, AND the edge you
  // are about to travel is more restrictive than the gate's inner side
  // (zonePriority).  Going the other way -- off a runway onto a taxiway -- is
  // never blocked: an aeroplane that has just landed has to be able to leave
  // the runway without asking permission to do so.
  void gated;
  void aircraft;
  void permissions;
  void directedIndex;
  void allowsGate;
  void policyFor;
  void zonePriority;
  return emptyEdgeFilter();
}

export function turnIsFeasible(
  graph: TaxiGraph,
  into: DirectedEdge,
  outOf: DirectedEdge,
  aircraft: AircraftModel,
): boolean {
  // TODO(you): can the aircraft actually get from `into` to `outOf` at their
  // shared vertex?  They must meet head to tail, and the same edge reversed is
  // a reversal rather than a turn.  A turn sharper than MAX_NODE_TURN is not a
  // turn either.
  //
  // Otherwise: a corner of angle theta taken at radius r eats
  // r * tan(theta / 2) of straight line on EACH side of the junction, so both
  // edges have to be at least that long.
  void graph;
  void into;
  void outOf;
  void aircraft;
  void wrapAngle;
  void MAX_NODE_TURN;
  return false;
}
