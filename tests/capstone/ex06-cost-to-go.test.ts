import { describe, expect, it } from 'vitest';
import {
  a320,
  buildKiloAirport,
  type DirectedEdge,
  type Airport,
  INF,
  kiloAirport,
  makeRectangle,
  parseClearance,
  type TaxiGraph,
  type ZoneClass,
  type Edge,
} from '../../src/airport/index.js';
import { HOTSPOT_PENALTY, SOFT_GATE_PENALTY } from '../../src/capstone/types.js';
import { edgeNearOn, Fixture } from './fixture.js';
import { impl, implName } from './impl.js';

const { advanceRouteIndex, costToGoAt, costToGoReachable, edgeCost, extractGraphRoute } = impl;

function labelled(taxiway: string, zone: ZoneClass = 'taxiway'): Edge {
  return {
    id: 0,
    from: 0,
    to: 1,
    taxiway,
    zone,
    hotspot: false,
    closed: false,
    oneWay: false,
    maxWingspan: 80,
    maxWeightTonnes: 600,
  };
}

/** The labels the route visits, with runs of the same label collapsed. */
function labelsOf(graph: TaxiGraph, route: readonly DirectedEdge[]): string[] {
  const out: string[] = [];
  for (const d of route) {
    const label = graph.edge(d.edge).taxiway;
    if (out.length === 0 || out[out.length - 1] !== label) out.push(label);
  }
  return out;
}

describe(`ex06 cost-to-go (${implName})`, () => {
  it('makes the cost rate the reciprocal of the speed limit', () => {
    expect(impl.zoneCostRate('taxiway')).toBeCloseTo(0.1, 9);
    expect(impl.zoneCostRate('apron')).toBeCloseTo(0.2, 9);
    expect(impl.zoneCostRate('stand')).toBeCloseTo(0.4, 9);
    expect(impl.zoneCostRate('runway')).toBeCloseTo(1 / 15, 9);
    // Nothing may drive here, so no amount of time buys you a metre of it.
    expect(impl.zoneCostRate('forbidden')).toBe(INF);
  });

  it('costs an edge its length in seconds plus its penalties', () => {
    const f = new Fixture();
    const jet = a320();
    // Taxiway A from the apron gate to the de-icing junction: 180 m at 10 m/s.
    const a = f.edgeNear('A', 590, 200);
    expect(f.gated.length(a.edge)).toBeCloseTo(180, 9);
    expect(edgeCost(f.gated, a, jet)).toBeCloseTo(18, 9);
    // Entering halfway along costs half as much.
    expect(impl.partialEdgeCost(f.gated, a, 90, jet)).toBeCloseTo(9, 9);
  });

  it('charges a soft gate and a hotspot as fixed costs', () => {
    const f = new Fixture();
    const jet = a320();
    // The apron taxilane edge that ends at the apron/taxiway gate.
    const toGate = f.edgeNear('APRON', 455, 200);
    expect(edgeCost(f.gated, toGate, jet)).toBeCloseTo(90 * 0.2 + SOFT_GATE_PENALTY, 9);
    // ...and the penalty does not shrink when you join the edge late.
    expect(impl.partialEdgeCost(f.gated, toGate, 90, jet)).toBeCloseTo(SOFT_GATE_PENALTY, 9);
    expect(HOTSPOT_PENALTY).toBe(60);
  });

  it('advances the route index only on the next cleared taxiway', () => {
    const route = ['A', 'D', 'B', 'E'];
    expect(advanceRouteIndex(labelled('A'), 0, route)).toBe(1);
    expect(advanceRouteIndex(labelled('A'), 1, route)).toBe(1); // still on A
    expect(advanceRouteIndex(labelled('D'), 1, route)).toBe(2);
    expect(advanceRouteIndex(labelled('B'), 1, route)).toBe(-1); // D comes first
    expect(advanceRouteIndex(labelled('F'), 1, route)).toBe(-1); // not on the clearance
  });

  it('makes runways transparent and the ramp free at either end', () => {
    const route = ['A', 'D', 'B', 'E'];
    // Crossing runway 36 happens on edges labelled B but lying in the runway;
    // the clearance names the crossing separately, so the index must not move.
    expect(advanceRouteIndex(labelled('B', 'runway'), 3, route)).toBe(3);
    expect(advanceRouteIndex(labelled('RWY 18/36', 'runway'), 3, route)).toBe(3);
    // Before the route starts and after it ends you are on the ramp.
    expect(advanceRouteIndex(labelled('APRON', 'apron'), 0, route)).toBe(0);
    expect(advanceRouteIndex(labelled('STAND 2', 'stand'), 4, route)).toBe(4);
    expect(advanceRouteIndex(labelled('APRON', 'apron'), 2, route)).toBe(-1);
    // No route constraint at all leaves the index alone.
    expect(advanceRouteIndex(labelled('ANYTHING'), 0, [])).toBe(0);
  });

  it('is zero where the mission ends', () => {
    const f = new Fixture();
    const onto = f.edgeNear('E', 2300, 412);
    expect(f.gated.head(onto)).toBe(f.permissions.goal);
    expect(costToGoAt(f.costToGo, onto, 4)).toBeCloseTo(0, 9);
  });

  it('decreases along the cleared route', () => {
    const f = new Fixture();
    const early = f.edgeNear('A', 1200, 200);
    const late = f.edgeNear('B', 2000, 400);
    expect(costToGoReachable(f.costToGo, early, 1)).toBe(true);
    expect(costToGoReachable(f.costToGo, late, 3)).toBe(true);
    expect(costToGoAt(f.costToGo, early, 1)).toBeGreaterThan(costToGoAt(f.costToGo, late, 3));
  });

  it('never puts an edge the clearance forbids on the route', () => {
    const f = new Fixture();
    // Taxiway F is open and drivable, but "via A D B E" does not mention it, so
    // there is no route index at which an aircraft may join it.
    const f1 = f.edgeNear('F', 1000, 300);
    for (let k = 0; k < f.costToGo.routeStates; ++k)
      expect(advanceRouteIndex(f.gated.edge(f1.edge), k, f.permissions.routeLabels)).toBeLessThan(0);

    // Note that computeCostToGo() may still put a finite number on (F, k): the
    // cost *from* a state is well defined even for a state you could never be
    // in.  Forward reachability is enforced where it belongs, in Exercise 07.
    const route = extractGraphRoute(f.costToGo, f.edgeNear('A', 590, 200), 1);
    for (const d of route) expect(f.gated.edge(d.edge).taxiway).not.toBe('F');
  });

  it('extracts a route that follows the clearance', () => {
    const f = new Fixture();
    const route = extractGraphRoute(f.costToGo, f.edgeNear('A', 590, 200), 1);
    expect(route.length).toBeGreaterThan(0);
    expect(f.gated.head(route[route.length - 1]!)).toBe(f.permissions.goal);
    expect(labelsOf(f.gated, route)).toEqual(['A', 'D', 'B', 'E']);
  });

  it('lets the hotspot penalty decide between two equal routes', () => {
    // With no "via" the search may pick either connector between taxiway A and
    // taxiway B.  On this map the two are exactly the same length, so the
    // hotspot is the only thing that separates them -- which makes it easy to
    // see that the penalty is really being applied.
    const open = 'TAXI TO RUNWAY 27 CROSS RUNWAY 36 HOLD SHORT RUNWAY 27';

    const connectorUsed = (airport: Airport): string => {
      const jet = a320();
      const gated = impl.buildGatedGraph(airport.graph, airport.zones);
      const permissions = impl.buildPermissions(gated, airport.zones, parseClearance(open));
      const filter = impl.filterGraph(gated, jet, permissions);
      const costToGo = impl.computeCostToGo(gated, permissions, filter, jet);

      const start = edgeNearOn(gated, 'A', { x: 590, y: 200 });
      let used = '';
      for (const d of extractGraphRoute(costToGo, start, 0)) {
        const label = gated.edge(d.edge).taxiway;
        if (label === 'D' || label === 'F') used = label;
      }
      return used;
    };

    // As built, the hotspot sits on the F/B junction, so the search avoids F.
    expect(connectorUsed(kiloAirport())).toBe('D');

    // Move it onto connector D and the answer flips -- same distance, different
    // cost, different route.
    const moved = buildKiloAirport();
    const hotspot = moved.zones.findPolygon('HOTSPOT 1');
    expect(hotspot).toBeGreaterThanOrEqual(0);
    moved.zones.polygon(hotspot).outline = makeRectangle(1380, 250, 1420, 350);
    moved.zones.build();
    expect(connectorUsed(moved)).toBe('F');
  });
});
