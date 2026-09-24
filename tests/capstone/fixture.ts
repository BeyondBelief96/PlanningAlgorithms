// Shared setup for the capstone tests.
//
// The capstone is a pipeline, so most tests need the first few stages before
// they can say anything about their own.  This builds them once.
//
// That means a test for Exercise NN will only pass once Exercises 1..NN are all
// green.  Work them in order; `npm run test:reference` is there to tell you
// whether the test itself is reasonable.

import {
  type AircraftModel,
  a320,
  type Airport,
  type Clearance,
  type DirectedEdge,
  distance,
  kiloAirport,
  NO_DIRECTED_EDGE,
  NO_VERTEX,
  parseClearance,
  PI,
  type PermissionSet,
  type Pose,
  scale,
  add,
  type TaxiGraph,
  type Vec2,
  type VertexId,
  type ZoneLayer,
} from '../../src/airport/index.js';
import type { CostToGo, EdgeFilter, Localization } from '../../src/capstone/types.js';
import { impl } from './impl.js';

export const DEPARTURE =
  'TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27';
export const ARRIVAL = 'TAXI TO STAND 2 VIA C B D A CROSS RUNWAY 36';

/** Pushed back at stand 2, facing north.  The default start for most tests. */
export const AT_STAND_2: Pose = { p: { x: 290, y: 95 }, heading: 0.5 * PI };

export class Fixture {
  readonly airport: Airport = kiloAirport();
  readonly aircraft: AircraftModel;
  readonly gated: TaxiGraph;
  readonly clearance: Clearance;
  readonly permissions: PermissionSet;
  readonly filter: EdgeFilter;
  readonly costToGo: CostToGo;
  readonly localization: Localization;

  /** Builds every stage up to and including the ones the test needs. */
  constructor(
    clearanceText: string = DEPARTURE,
    start: Pose = AT_STAND_2,
    model: AircraftModel = a320(),
  ) {
    this.aircraft = model;
    this.gated = impl.buildGatedGraph(this.airport.graph, this.airport.zones);
    this.clearance = parseClearance(clearanceText);
    this.permissions = impl.buildPermissions(this.gated, this.airport.zones, this.clearance);
    this.filter = impl.filterGraph(this.gated, this.aircraft, this.permissions);
    this.costToGo = impl.computeCostToGo(
      this.gated,
      this.permissions,
      this.filter,
      this.aircraft,
    );
    this.localization = impl.localize(this.airport.zones, this.gated, this.aircraft, start);
  }

  get zones(): ZoneLayer {
    return this.airport.zones;
  }

  gateNear(x: number, y: number): VertexId {
    for (const v of this.gated.vertices)
      if (v.gate !== 'none' && distance(v.p, { x, y }) < 0.5) return v.id;
    return NO_VERTEX;
  }

  /**
   * The first directed edge whose label matches and whose midpoint is nearest
   * the given point -- enough to name an edge in a test without hard-coding ids.
   */
  edgeNear(label: string, x: number, y: number): DirectedEdge {
    return edgeNearOn(this.gated, label, { x, y });
  }

  /**
   * The directed edge of `label` nearest a point, in the direction that goes
   * from `from` toward `to`.
   */
  directed(label: string, from: Vec2, to: Vec2): DirectedEdge {
    let best: DirectedEdge = NO_DIRECTED_EDGE;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const e of this.gated.edges) {
      if (e.taxiway !== label) continue;
      for (const forward of [true, false]) {
        const d: DirectedEdge = { edge: e.id, forward };
        const score =
          distance(this.gated.tailPoint(d), from) + distance(this.gated.headPoint(d), to);
        if (score >= bestScore) continue;
        bestScore = score;
        best = d;
      }
    }
    return best;
  }

  candidates() {
    return impl.generateMergeCandidates(
      this.gated,
      this.zones,
      this.aircraft,
      this.localization,
      this.permissions,
      this.filter,
      this.costToGo,
    );
  }
}

export function edgeNearOn(graph: TaxiGraph, label: string, p: Vec2): DirectedEdge {
  let best: DirectedEdge = NO_DIRECTED_EDGE;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const e of graph.edges) {
    if (e.taxiway !== label) continue;
    const g = graph.geometry(e.id);
    const d = distance(scale(add(g.a, g.b), 0.5), p);
    if (d >= bestDistance) continue;
    bestDistance = d;
    best = { edge: e.id, forward: true };
  }
  return best;
}
