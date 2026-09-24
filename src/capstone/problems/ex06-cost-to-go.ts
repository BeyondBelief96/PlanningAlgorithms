// Exercise 06 -- cost-to-go by reverse Dijkstra (Step 6).
// Brief: docs/capstone/ex06-cost-to-go.md

import {
  type AircraftModel,
  type DirectedEdge,
  type Edge,
  INF,
  MinHeap,
  type PermissionSet,
  policyFor,
  type TaxiGraph,
  type ZoneClass,
} from '../../airport/index.js';
import {
  allowsEdge,
  type CostToGo,
  type EdgeFilter,
  emptyCostToGo,
  HOTSPOT_PENALTY,
  packState,
  SOFT_GATE_PENALTY,
  unpackState,
} from '../types.js';
import { turnIsFeasible } from './ex05-graph-filter.js';

export function zoneCostRate(zone: ZoneClass): number {
  // TODO(you): seconds per metre, from the zone speed limit.  This is what
  // makes the search prefer a long fast taxiway to a short slow apron.  A zone
  // nothing drives on has no finite rate.
  void zone;
  void policyFor;
  return INF;
}

export function edgeCost(
  graph: TaxiGraph,
  d: DirectedEdge,
  aircraft: AircraftModel,
): number {
  // TODO(you): the whole edge, i.e. partialEdgeCost() entered at s = 0.
  void graph;
  void d;
  void aircraft;
  return INF;
}

export function partialEdgeCost(
  graph: TaxiGraph,
  d: DirectedEdge,
  s: number,
  aircraft: AircraftModel,
): number {
  // TODO(you): the remaining length at the zone rate, plus HOTSPOT_PENALTY if
  // the edge is a hotspot and SOFT_GATE_PENALTY if its *head* is a soft gate.
  // Fixed penalties are earned whether you join the edge at the tail or halfway
  // along it, which is why they do not scale with the remainder.
  void graph;
  void d;
  void s;
  void aircraft;
  void HOTSPOT_PENALTY;
  void SOFT_GATE_PENALTY;
  return INF;
}

export function advanceRouteIndex(edge: Edge, k: number, labels: readonly string[]): number {
  // TODO(you): the route constraint as a state machine.  `k` counts labels
  // consumed.  Return the new k, or -1 when this edge is not allowed here.
  //
  //   no labels at all             no constraint; k is unchanged
  //   edge.taxiway === labels[k]   consume it, k becomes k + 1
  //   edge.taxiway === labels[k-1] stay on the same taxiway, k unchanged
  //   a runway or protected zone   transparent: the clearance names the
  //                                crossing separately, so k is unchanged
  //   k === 0 or k === labels.length, on apron/stand/de-icing
  //                                the ramp, which the clearance never spells
  //                                out.  k unchanged.
  void edge;
  void k;
  void labels;
  return -1;
}

export function costToGoAt(costToGo: CostToGo, d: DirectedEdge, k: number): number {
  // TODO(you): a bounds-checked read of value[packState(costToGo, d, k)].
  void costToGo;
  void d;
  void k;
  void packState;
  return INF;
}

export function costToGoReachable(costToGo: CostToGo, d: DirectedEdge, k: number): boolean {
  // TODO(you): a finite cost-to-go means a route exists from here.
  void costToGo;
  void d;
  void k;
  return false;
}

export function computeCostToGo(
  gated: TaxiGraph,
  permissions: PermissionSet,
  filter: EdgeFilter,
  aircraft: AircraftModel,
): CostToGo {
  // TODO(you): Dijkstra, run backwards, over states (directed edge, route index).
  //
  // A state means "standing at the head of this directed edge, with k labels of
  // the cleared route consumed".  Size value and next to
  // gated.numDirectedEdges * routeStates, and index them with packState().
  //
  // The terminal states are the allowed edges whose head is permissions.goal,
  // with the whole route consumed, at cost 0.
  //
  // To relax a state (d, k), look at every allowed edge p *arriving* at
  // gated.tail(d).  The turn from p onto d must be feasible, and
  // advanceRouteIndex() must carry p's route index kp to exactly k.  Then
  //
  //     candidate = value[(d, k)] + edgeCost(d)
  //
  // because the cost of standing at the head of p is the cost of driving all of
  // d plus whatever d's head costs.  Record `next` so extractGraphRoute() can
  // walk the answer out.
  void gated;
  void permissions;
  void filter;
  void aircraft;
  void allowsEdge;
  void MinHeap;
  void turnIsFeasible;
  void unpackState;
  return emptyCostToGo();
}

export function extractGraphRoute(
  costToGo: CostToGo,
  start: DirectedEdge,
  k: number,
): DirectedEdge[] {
  // TODO(you): follow CostToGo.next from packState(start, k) to the goal.
  // Bound the loop: a mistake in computeCostToGo() otherwise hangs the test run.
  void costToGo;
  void start;
  void k;
  return [];
}
