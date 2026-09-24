// Reference solution -- Exercise 02: gated boundaries in the graph (Step 2).
//
// This is the exercise that makes the invariant enforceable.  After it runs,
// there is exactly one way for a route to change zone: through a vertex that is
// marked as a gate.  Everything downstream -- the permission set, the edge
// filter, the events, the stop points -- keys off those vertices.

import {
  Aabb,
  add,
  distance,
  distancePointSegment,
  EPS,
  policyFor,
  scale,
  sub,
  TaxiGraph,
  type Vec2,
  type ZoneClass,
  type ZoneLayer,
  zonePriority,
} from '../../airport/index.js';
import { ZONE_SCAN_STEP, ZONE_SPLIT_TOLERANCE } from '../types.js';
import { zoneAt } from './ex01-zone-layer.js';

/** Where along [0, len] the zone class changes, to ZONE_SPLIT_TOLERANCE. */
function findZoneBreaks(layer: ZoneLayer, a: Vec2, b: Vec2): number[] {
  const breaks: number[] = [];
  const len = distance(a, b);
  if (len < 2 * ZONE_SPLIT_TOLERANCE) return breaks;
  const u = scale(sub(b, a), 1 / len);
  const zoneAtS = (s: number): ZoneClass => zoneAt(layer, add(a, scale(u, s))).zone;

  const n = Math.max(1, Math.ceil(len / ZONE_SCAN_STEP));
  let previousS = (0.5 * len) / n;
  let previous = zoneAtS(previousS);
  for (let i = 1; i < n; ++i) {
    const s = ((i + 0.5) * len) / n;
    const here = zoneAtS(s);
    if (here !== previous) {
      // Bisect for the boundary.  Every polygon is convex and the edge is a
      // straight line, so there is exactly one crossing in the bracket.
      let lo = previousS;
      let hi = s;
      while (hi - lo > ZONE_SPLIT_TOLERANCE) {
        const mid = 0.5 * (lo + hi);
        if (zoneAtS(mid) === previous) lo = mid;
        else hi = mid;
      }
      breaks.push(0.5 * (lo + hi));
      previous = here;
    }
    previousS = s;
  }
  return breaks;
}

/** Hotspot and closed flags for the sub-edge [s0, s1]: any sample counts. */
function scanFlags(
  layer: ZoneLayer,
  a: Vec2,
  u: Vec2,
  s0: number,
  s1: number,
): { hotspot: boolean; closed: boolean } {
  let hotspot = false;
  let closed = false;
  const n = Math.max(1, Math.ceil((s1 - s0) / ZONE_SCAN_STEP));
  for (let i = 0; i <= n; ++i) {
    const s = s0 + ((s1 - s0) * i) / n;
    const q = zoneAt(layer, add(a, scale(u, s)));
    if (q.hotspot) hotspot = true;
    if (q.closed) closed = true;
  }
  return { hotspot, closed };
}

export function buildGatedGraph(raw: TaxiGraph, layer: ZoneLayer): TaxiGraph {
  const out = new TaxiGraph();
  for (const v of raw.vertices) out.addVertex(v.p, v.name);

  let splitCount = 0;
  for (const e of raw.edges) {
    const a = raw.vertex(e.from).p;
    const b = raw.vertex(e.to).p;
    const len = distance(a, b);
    if (len < EPS) continue;
    const u = scale(sub(b, a), 1 / len);

    const cuts = findZoneBreaks(layer, a, b);
    const chain = [e.from];
    for (const s of cuts) chain.push(out.addVertex(add(a, scale(u, s)), `X${++splitCount}`));
    chain.push(e.to);

    const stations = [0, ...cuts, len];

    for (let i = 0; i + 1 < chain.length; ++i) {
      const id = out.addEdge(chain[i]!, chain[i + 1]!, e.taxiway);
      const made = out.edge(id);
      made.oneWay = e.oneWay;
      made.maxWingspan = e.maxWingspan;
      made.maxWeightTonnes = e.maxWeightTonnes;
      made.zone = zoneAt(layer, add(a, scale(u, 0.5 * (stations[i]! + stations[i + 1]!)))).zone;
      const flags = scanFlags(layer, a, u, stations[i]!, stations[i + 1]!);
      made.hotspot = flags.hotspot;
      made.closed = flags.closed;
    }
  }
  out.build();

  // A vertex whose incident edges do not all agree on the zone is a boundary,
  // and a boundary on the graph is a gate.
  for (let vid = 0; vid < out.numVertices; ++vid) {
    const v = out.vertex(vid);
    const zones = new Set<ZoneClass>();
    for (const id of out.incident(v.id)) zones.add(out.edge(id).zone);
    if (zones.size < 2) continue;

    let inner = [...zones][0]!;
    let outer = inner;
    for (const z of zones) {
      if (zonePriority(z) < zonePriority(inner)) inner = z;
      if (zonePriority(z) > zonePriority(outer)) outer = z;
    }
    v.innerZone = inner;
    v.outerZone = outer;
    v.gate = policyFor(outer).requiresClearance ? 'hard' : 'soft';

    // Which runway is on the far side?  Ask the zone layer at the midpoint of
    // an incident edge that lies in the outer zone, and read its identifiers.
    // While we are there, give the split vertex a name worth printing.
    for (const id of out.incident(v.id)) {
      if (out.edge(id).zone !== outer) continue;
      const g = out.geometry(id);
      const q = zoneAt(layer, scale(add(g.a, g.b), 0.5));
      if (v.name === '' || v.name[0] === 'X') {
        v.name =
          policyFor(outer).requiresClearance && q.polygonId >= 0
            ? `EDGE ${layer.polygon(q.polygonId).name}`
            : `${out.edge(id).taxiway} gate`;
      }
      if (q.polygonId >= 0) v.protects = [...layer.polygon(q.polygonId).idents];
      if (v.protects.length > 0) break;
    }

    // Is there a painted holding position here?  That is what turns a zone
    // boundary into the thing a clearance can name.
    for (const id of layer.holdShortCandidates(Aabb.of(v.p).grown(1.0))) {
      const line = layer.holdShortLine(id);
      if (distancePointSegment(v.p, line.segment) > 0.5) continue;
      v.holdShortId = id;
      v.name = line.name;
      if (line.protects.length > 0) v.protects = [...line.protects];
      break;
    }
  }
  return out;
}
