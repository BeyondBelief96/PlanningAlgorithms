import { describe, expect, it } from 'vitest';
import {
  distance,
  type GateKind,
  kiloAirport,
  NO_VERTEX,
  type TaxiGraph,
  type ZoneClass,
} from '../../src/airport/index.js';
import { impl, implName } from './impl.js';

function gated(): TaxiGraph {
  const airport = kiloAirport();
  return impl.buildGatedGraph(airport.graph, airport.zones);
}

function gateNear(graph: TaxiGraph, x: number, y: number): number {
  for (const v of graph.vertices)
    if (v.gate !== 'none' && distance(v.p, { x, y }) < 0.5) return v.id;
  return NO_VERTEX;
}

function countGates(graph: TaxiGraph, kind: GateKind): number {
  return graph.vertices.filter((v) => v.gate === kind).length;
}

describe(`ex02 the gated graph (${implName})`, () => {
  it('turns every zone crossing into a vertex', () => {
    const airport = kiloAirport();
    const g = gated();
    // The raw chart has 24 vertices and 25 edges.  Twelve of those edges cross
    // a zone boundary somewhere in the middle, which adds twelve vertices and
    // twelve edges.
    expect(airport.graph.numVertices).toBe(24);
    expect(airport.graph.numEdges).toBe(25);
    expect(g.numVertices).toBe(36);
    expect(g.numEdges).toBe(37);
  });

  it('finds five soft gates and eight hard ones on Kilo Field', () => {
    const g = gated();
    expect(countGates(g, 'soft')).toBe(5);
    expect(countGates(g, 'hard')).toBe(8);
  });

  it('lands the splits on the boundary', () => {
    const g = gated();
    // Taxiway B crosses runway 18/36: taxiway to protected at x = 1525,
    // protected to runway at 1575, out again at 1625 and 1675.
    expect(gateNear(g, 1525, 400)).not.toBe(NO_VERTEX);
    expect(gateNear(g, 1575, 400)).not.toBe(NO_VERTEX);
    expect(gateNear(g, 1625, 400)).not.toBe(NO_VERTEX);
    expect(gateNear(g, 1675, 400)).not.toBe(NO_VERTEX);
    // Taxiway E onto runway 09/27: the holding position at y = 425, the runway
    // edge at 475.
    expect(gateNear(g, 2300, 425)).not.toBe(NO_VERTEX);
    expect(gateNear(g, 2300, 475)).not.toBe(NO_VERTEX);
  });

  it('knows which side of a gate is which', () => {
    const g = gated();
    const hs = g.vertex(gateNear(g, 1525, 400));
    expect(hs.gate).toBe('hard');
    expect(hs.innerZone).toBe('taxiway');
    expect(hs.outerZone).toBe('runwayProtected');

    const edge = g.vertex(gateNear(g, 1575, 400));
    expect(edge.innerZone).toBe('runwayProtected');
    expect(edge.outerZone).toBe('runway');
  });

  it('takes a gate name from the painted holding position', () => {
    const g = gated();
    const painted = g.vertex(gateNear(g, 1525, 400));
    expect(painted.holdShortId).toBeGreaterThanOrEqual(0);
    expect(painted.name).toBe('HS 36 W');

    // The runway *edge* is a hard gate too, but nobody painted a line there.
    const unpainted = g.vertex(gateNear(g, 1575, 400));
    expect(unpainted.gate).toBe('hard');
    expect(unpainted.holdShortId).toBe(-1);
  });

  it('knows which runway is behind a hard gate', () => {
    const g = gated();
    expect(g.vertex(gateNear(g, 1525, 400)).protects).toContain('36');

    const twentySeven = g.vertex(gateNear(g, 2300, 425)).protects;
    expect(twentySeven).toContain('27');
    expect(twentySeven).not.toContain('36');
  });

  it('makes the apron and stand boundaries soft', () => {
    const g = gated();
    const apronExit = gateNear(g, 500, 200);
    expect(apronExit).not.toBe(NO_VERTEX);
    expect(g.vertex(apronExit).gate).toBe('soft');

    const standGate = gateNear(g, 290, 130);
    expect(standGate).not.toBe(NO_VERTEX);
    expect(g.vertex(standGate).gate).toBe('soft');
    expect(g.vertex(standGate).outerZone).toBe('stand');

    // The de-icing pad boundary too: allowed, but only if the mission asks.
    expect(gateNear(g, 680, 235)).not.toBe(NO_VERTEX);
  });

  it('does not make a gate of a junction between two taxiways', () => {
    const g = gated();
    expect(gateNear(g, 1400, 400)).toBe(NO_VERTEX); // D meets B
    expect(gateNear(g, 1000, 200)).toBe(NO_VERTEX); // A meets F
    expect(gateNear(g, 1600, 400)).toBe(NO_VERTEX); // B meets 36 -- all runway
  });

  it('gives every edge the zone of its own midpoint', () => {
    const g = gated();
    const seen = new Set<ZoneClass>();
    for (const e of g.edges) {
      expect(e.zone).not.toBe('unknown');
      seen.add(e.zone);
    }
    for (const zone of ['stand', 'apron', 'taxiway', 'runwayProtected', 'runway', 'deicing'])
      expect(seen.has(zone as ZoneClass)).toBe(true);
  });

  it('takes flags from the whole edge and not just its midpoint', () => {
    const g = gated();
    // The hotspot sits on the F/B junction.  Taxiway F runs from y = 200 to
    // y = 400 and only its last fifty metres are inside, so a midpoint test
    // would miss it.
    const hotspots = g.edges.filter((e) => e.hotspot).length;
    const closed = g.edges.filter((e) => e.closed).length;
    expect(hotspots, 'expected the F and B edges at the junction to be flagged').toBeGreaterThanOrEqual(2);
    expect(closed, 'the closed west end of the apron should block exactly one edge').toBe(1);
  });

  it('lets split edges inherit the limits of their parent', () => {
    const g = gated();
    for (const e of g.edges) {
      if (e.taxiway === 'F') expect(e.oneWay).toBe(true);
      if (e.taxiway === 'E') expect(e.maxWingspan).toBeCloseTo(52.0, 9);
      if (e.taxiway === 'RWY 09/27') expect(e.maxWingspan).toBeCloseTo(80.0, 9);
    }
  });
});
