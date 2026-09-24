// Reference solution -- Exercise 06: cost-to-go by reverse Dijkstra (Step 6).
//
// Part 1's Problem 08, with two twists.  The state is a *directed* edge, so
// heading is part of the state and a turn can be checked against the minimum
// radius.  And the state carries how much of the cleared route has been
// consumed, which turns "must use A then D then B then E" into an ordinary
// shortest-path problem on a product graph rather than a filter applied
// afterwards.

import {
  type AircraftModel,
  type DirectedEdge,
  type Edge,
  INF,
  MinHeap,
  NO_VERTEX,
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

function transparentZone(zone: ZoneClass): boolean {
  // Crossing a runway is not "using a taxiway": the clearance names the
  // crossing separately, so these edges leave the route index alone.
  return zone === 'runway' || zone === 'runwayProtected';
}

function rampZone(zone: ZoneClass): boolean {
  return zone === 'apron' || zone === 'stand' || zone === 'deicing';
}

/** Seconds per metre. */
export function zoneCostRate(zone: ZoneClass): number {
  const limit = policyFor(zone).speedLimit;
  return limit > 0 ? 1 / limit : INF;
}

export function edgeCost(graph: TaxiGraph, d: DirectedEdge, aircraft: AircraftModel): number {
  return partialEdgeCost(graph, d, 0, aircraft);
}

export function partialEdgeCost(
  graph: TaxiGraph,
  d: DirectedEdge,
  s: number,
  _aircraft: AircraftModel,
): number {
  if (d.edge < 0) return INF;
  const e = graph.edge(d.edge);
  const remaining = Math.max(0, graph.length(d.edge) - Math.max(0, s));
  let cost = remaining * zoneCostRate(e.zone);
  if (e.hotspot) cost += HOTSPOT_PENALTY;
  if (graph.vertex(graph.head(d)).gate === 'soft') cost += SOFT_GATE_PENALTY;
  return cost;
}

export function advanceRouteIndex(edge: Edge, k: number, labels: readonly string[]): number {
  const n = labels.length;
  if (n === 0) return k; // no route constraint at all
  if (k < 0 || k > n) return -1;
  if (k < n && edge.taxiway === labels[k]) return k + 1;
  if (k > 0 && edge.taxiway === labels[k - 1]) return k;
  if (transparentZone(edge.zone)) return k;
  // Before the route starts and after it ends you are on the ramp, which the
  // clearance never spells out.
  if ((k === 0 || k === n) && rampZone(edge.zone)) return k;
  return -1;
}

export function costToGoAt(costToGo: CostToGo, d: DirectedEdge, k: number): number {
  if (d.edge < 0 || k < 0 || k >= costToGo.routeStates) return INF;
  return costToGo.value[packState(costToGo, d, k)] ?? INF;
}

export function costToGoReachable(costToGo: CostToGo, d: DirectedEdge, k: number): boolean {
  return Number.isFinite(costToGoAt(costToGo, d, k));
}

export function computeCostToGo(
  gated: TaxiGraph,
  permissions: PermissionSet,
  filter: EdgeFilter,
  aircraft: AircraftModel,
): CostToGo {
  const ctg = emptyCostToGo();
  ctg.routeStates = permissions.routeLabels.length + 1;
  const states = gated.numDirectedEdges * ctg.routeStates;
  ctg.value = Array.from({ length: states }, () => INF);
  ctg.next = Array.from({ length: states }, () => -1);
  if (permissions.goal === NO_VERTEX || states === 0) return ctg;

  const lastIndex = ctg.routeStates - 1;
  const queue = new MinHeap<number>();

  // Terminal states: standing at the head of an allowed edge that ends at the
  // goal, with the whole cleared route consumed.
  for (const e of gated.edges) {
    for (const forward of [true, false]) {
      const d: DirectedEdge = { edge: e.id, forward };
      if (!allowsEdge(filter, d)) continue;
      if (gated.head(d) !== permissions.goal) continue;
      const s = packState(ctg, d, lastIndex);
      ctg.value[s] = 0;
      queue.push(0, s, s);
    }
  }

  for (;;) {
    const top = queue.pop();
    if (!top) break;
    const state = top.value;
    if (top.key > ctg.value[state]! + 1e-12) continue; // stale entry

    const { d, k } = unpackState(ctg, state);
    const stepCost = edgeCost(gated, d, aircraft);
    if (!Number.isFinite(stepCost)) continue;

    // Predecessors: any allowed edge arriving at the tail of d, from which the
    // turn onto d is flyable and the route index advances to exactly k.
    for (const p of gated.arriving(gated.tail(d))) {
      if (!allowsEdge(filter, p)) continue;
      if (!turnIsFeasible(gated, p, d, aircraft)) continue;
      for (let kp = 0; kp < ctg.routeStates; ++kp) {
        if (advanceRouteIndex(gated.edge(d.edge), kp, permissions.routeLabels) !== k) continue;
        const previous = packState(ctg, p, kp);
        const candidate = top.key + stepCost;
        if (candidate >= ctg.value[previous]!) continue;
        ctg.value[previous] = candidate;
        ctg.next[previous] = state;
        queue.push(candidate, previous, previous);
      }
    }
  }
  return ctg;
}

export function extractGraphRoute(
  costToGo: CostToGo,
  start: DirectedEdge,
  k: number,
): DirectedEdge[] {
  const route: DirectedEdge[] = [];
  if (!costToGoReachable(costToGo, start, k)) return route;
  let state = packState(costToGo, start, k);
  route.push(start);
  // The state graph is acyclic along `next` because every step strictly
  // decreases the cost-to-go, but a bound costs nothing and catches mistakes.
  for (let guard = 0; guard < costToGo.next.length; ++guard) {
    const nextState = costToGo.next[state]!;
    if (nextState < 0) break;
    state = nextState;
    route.push(unpackState(costToGo, state).d);
  }
  return route;
}
