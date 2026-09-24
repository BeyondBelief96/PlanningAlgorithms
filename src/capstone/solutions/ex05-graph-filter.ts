// Reference solution -- Exercise 05: filtering the graph (Step 5).
//
// Two things happen here.  Edges that this aircraft or this mission may not use
// are struck out once, before any search runs.  And the gate rule is enforced
// *directionally*: a hard gate stops you going in, never coming out.  An
// aeroplane that has just landed has to be able to leave the runway without
// asking permission to do so.

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
import { type EdgeFilter, MAX_NODE_TURN } from '../types.js';

export function filterGraph(
  gated: TaxiGraph,
  aircraft: AircraftModel,
  permissions: PermissionSet,
): EdgeFilter {
  const n = gated.numDirectedEdges;
  const filter: EdgeFilter = {
    allowed: Array.from({ length: n }, () => true),
    reason: Array.from({ length: n }, () => ''),
  };

  for (const e of gated.edges) {
    for (const forward of [true, false]) {
      const d: DirectedEdge = { edge: e.id, forward };
      const i = directedIndex(d);
      const block = (why: string): void => {
        filter.allowed[i] = false;
        filter.reason[i] = why;
      };

      if (e.oneWay && !forward) {
        block('one-way the other way');
      } else if (e.closed) {
        block('closed by NOTAM or construction');
      } else if (aircraft.wingspan > e.maxWingspan) {
        block(
          `wingspan ${Math.trunc(aircraft.wingspan)} m exceeds ${Math.trunc(e.maxWingspan)} m`,
        );
      } else if (policyFor(e.zone).missionOnly && !permissions.deIcingInMission) {
        block('not in the mission');
      } else if (e.zone === 'forbidden' || e.zone === 'shoulder' || e.zone === 'unknown') {
        block('leads into a zone that is not drivable');
      } else {
        // The gate rule.  Entering an edge whose zone is more restrictive than
        // the gate's inner side is a crossing, and a crossing needs a clearance.
        const gate = gated.vertex(gated.tail(d));
        if (
          gate.gate === 'hard' &&
          !allowsGate(permissions, gate.id) &&
          zonePriority(e.zone) > zonePriority(gate.innerZone)
        )
          block(`unauthorized crossing at ${gate.name}`);
      }
    }
  }
  return filter;
}

export function turnIsFeasible(
  graph: TaxiGraph,
  into: DirectedEdge,
  outOf: DirectedEdge,
  aircraft: AircraftModel,
): boolean {
  if (into.edge < 0 || outOf.edge < 0) return false;
  if (into.edge === outOf.edge) return false; // that is a reversal, not a turn
  if (graph.head(into) !== graph.tail(outOf)) return false;

  const theta = Math.abs(wrapAngle(graph.heading(outOf) - graph.heading(into)));
  if (theta > MAX_NODE_TURN) return false;
  if (theta < 1e-6) return true;

  // A corner of angle theta taken at radius r eats r * tan(theta / 2) of
  // straight line on each side of the junction.
  const need = aircraft.minTurnRadius * Math.tan(0.5 * theta);
  return need <= graph.length(into.edge) + 1e-9 && need <= graph.length(outOf.edge) + 1e-9;
}
