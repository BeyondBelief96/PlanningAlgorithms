// Reference solution -- Exercise 07: merge candidates (Step 7).
//
// This is where the invariant is enforced for the off-graph half of the plan.
// Every filter below exists to make one thing impossible: producing a candidate
// that the aircraft could only reach by driving out of the zone it is in.

import {
  Aabb,
  add,
  type AircraftModel,
  alongTrack,
  angleOf,
  type DirectedEdge,
  directedIndex,
  distance,
  norm,
  type PermissionSet,
  scale,
  segmentsIntersect,
  sub,
  type TaxiGraph,
  type Vec2,
  wrapAngle,
  type ZoneClass,
  type ZoneLayer,
} from '../../airport/index.js';
import {
  allowsEdge,
  CANDIDATE_RADIUS,
  CANDIDATE_SPACING,
  type CostToGo,
  type EdgeFilter,
  JUNCTION_EXCLUSION,
  type Localization,
  MAX_CANDIDATE_BEARING,
  type MergeCandidate,
  MIN_LEAD_IN,
} from '../types.js';
import { zoneAt } from './ex01-zone-layer.js';
import {
  advanceRouteIndex,
  costToGoAt,
  costToGoReachable,
  partialEdgeCost,
  zoneCostRate,
} from './ex06-cost-to-go.js';

function candidateZoneAllowed(edgeZone: ZoneClass, loc: Localization): boolean {
  if (edgeZone === loc.zone) return true;
  // Stand to apron is the one free-space transition a pilot makes without a
  // word from anybody, so a stand start may also aim at apron taxilanes.
  if (loc.mode === 'stand' && edgeZone === 'apron') return true;
  return false;
}

/**
 * The straight line from the aircraft to the candidate must stay in the start
 * zone.  This is the invariant itself, stated as a test: if the aircraft cannot
 * reach the merge point without leaving its zone, the merge point is not a
 * candidate, however cheap it looks.
 */
function straightStaysInZone(
  layer: ZoneLayer,
  from: Vec2,
  to: Vec2,
  loc: Localization,
): boolean {
  const length = distance(from, to);
  const n = Math.max(1, Math.ceil(length / 2.0));
  for (let i = 0; i <= n; ++i) {
    const p = add(from, scale(sub(to, from), i / n));
    if (!candidateZoneAllowed(zoneAt(layer, p).zone, loc)) return false;
  }
  return true;
}

/**
 * Does the straight line from the aircraft to the candidate point cross a
 * painted holding position?  A cheap pre-filter; Exercise 10 does it properly
 * against the swept outline.
 */
function crossesHoldShort(layer: ZoneLayer, from: Vec2, to: Vec2): boolean {
  for (const id of layer.holdShortCandidates(Aabb.of(from, to).grown(1.0)))
    if (segmentsIntersect({ a: from, b: to }, layer.holdShortLine(id).segment)) return true;
  return false;
}

/**
 * Metres of straight guidance line from the merge point onward, following
 * collinear continuations across junctions.  A merge that lands two metres
 * before a corner is no use to the controller.
 */
function straightLeadIn(
  graph: TaxiGraph,
  filter: EdgeFilter,
  start: DirectedEdge,
  s: number,
): number {
  let d = start;
  let total = graph.length(d.edge) - s;
  const heading = graph.heading(d);
  for (let guard = 0; guard < 8; ++guard) {
    let next: DirectedEdge | undefined;
    let found = 0;
    for (const candidate of graph.leaving(graph.head(d))) {
      if (!allowsEdge(filter, candidate)) continue;
      if (Math.abs(wrapAngle(graph.heading(candidate) - heading)) > 1e-3) continue;
      next = candidate;
      ++found;
    }
    if (found !== 1 || !next) break;
    total += graph.length(next.edge);
    d = next;
  }
  return total;
}

export function generateMergeCandidates(
  gated: TaxiGraph,
  layer: ZoneLayer,
  aircraft: AircraftModel,
  localization: Localization,
  permissions: PermissionSet,
  filter: EdgeFilter,
  costToGo: CostToGo,
): MergeCandidate[] {
  const candidates: MergeCandidate[] = [];
  if (localization.mode === 'fault') return candidates;
  const start = localization.pose;

  for (const e of gated.edges) {
    if (!candidateZoneAllowed(e.zone, localization)) continue;
    // Never invent a candidate on a runway unless we are already on one.
    if ((e.zone === 'runway' || e.zone === 'runwayProtected') && localization.mode !== 'runway')
      continue;

    for (const forward of [true, false]) {
      const d: DirectedEdge = { edge: e.id, forward };
      if (!allowsEdge(filter, d)) continue;
      const k = advanceRouteIndex(e, 0, permissions.routeLabels);
      if (k < 0 || !costToGoReachable(costToGo, d, k)) continue;

      const length = gated.length(e.id);
      for (let s = JUNCTION_EXCLUSION; s <= length - JUNCTION_EXCLUSION + 1e-9; s += CANDIDATE_SPACING) {
        const target = gated.poseAlong(d, s);
        const offset = sub(target.p, start.p);
        const range = norm(offset);
        if (range > CANDIDATE_RADIUS) continue;

        // Do not turn round to reach a merge point, and on a runway do not even
        // consider one that is not straight ahead.
        if (range > 1e-6) {
          const bearing = Math.abs(wrapAngle(angleOf(offset) - start.heading));
          if (bearing > MAX_CANDIDATE_BEARING) continue;
        }
        // ...and never merge onto a line that points back the way we came.
        if (Math.abs(wrapAngle(target.heading - start.heading)) > MAX_CANDIDATE_BEARING) continue;
        if (localization.mode === 'runway' && alongTrack(start, target.p) <= 0) continue;

        if (crossesHoldShort(layer, start.p, target.p)) continue;
        if (!straightStaysInZone(layer, start.p, target.p, localization)) continue;

        const leadIn = straightLeadIn(gated, filter, d, s);
        if (leadIn < MIN_LEAD_IN) continue;

        candidates.push({
          edge: d,
          s,
          target,
          routeIndex: k,
          leadIn,
          costToGo: partialEdgeCost(gated, d, s, aircraft) + costToGoAt(costToGo, d, k),
        });
      }
    }
  }

  // Cheapest first, counting the drive to the merge point at the local zone
  // rate so that a distant merge does not look free.
  const rate = zoneCostRate(localization.zone);
  const score = (c: MergeCandidate): number =>
    c.costToGo + distance(start.p, c.target.p) * rate;
  candidates.sort((a, b) => {
    const ca = score(a);
    const cb = score(b);
    if (ca !== cb) return ca - cb;
    return directedIndex(a.edge) - directedIndex(b.edge);
  });
  return candidates;
}
