// Reference solution -- Exercise 11: assembling the route (Step 10).
//
// The merge path and the graph route become one curve, with a fillet at every
// corner so that the result is drivable rather than merely correct.  Then the
// curve is annotated: where the radio calls happen, where the aircraft must
// stop, and how fast it may go at every point along the way.
//
// The stop points are the part worth getting right.  The *nose* has to stop
// short of the holding position and the reference point is the main gear
// centre, so the path is truncated by the stop margin **plus** the distance
// from the main gear to the nose.

import {
  type AircraftModel,
  allowsGate,
  alongTrack,
  arcPath,
  concatenatePaths,
  DEFAULT_STEP,
  type DirectedEdge,
  emptyRoute,
  noseTip,
  type Path,
  type PathSample,
  pathAt,
  pathEndPose,
  pathIsEmpty,
  pathLength,
  type PermissionSet,
  type Pose,
  type Route,
  type RouteEvent,
  straightPath,
  type TaxiGraph,
  type Vertex,
  type VertexId,
  wrapAngle,
  type ZoneClass,
  type ZoneLayer,
} from '../../airport/index.js';
import {
  defaultSpeedLimits,
  type MergePath,
  mergeMethodName,
  type SpeedLimits,
} from '../types.js';
import { zoneAt } from './ex01-zone-layer.js';

interface Corner {
  vertex: VertexId;
  /** Arclength where this leg began. */
  entryS: number;
  /** Arclength of the junction itself. */
  s: number;
}

function speedLimitFor(zone: ZoneClass, limits: SpeedLimits): number {
  switch (zone) {
    case 'stand':
      return limits.stand;
    case 'apron':
    case 'deicing':
      return limits.apron;
    case 'runway':
      return limits.runway;
    case 'runwayProtected':
      return limits.runwayProtected;
    default:
      return limits.taxiway;
  }
}

function softGateMessage(v: Vertex): string {
  if (v.innerZone === 'stand' || v.outerZone === 'stand')
    return `stand boundary at ${v.name}: confirm the lead-in line is clear`;
  if (v.innerZone === 'deicing' || v.outerZone === 'deicing')
    return `de-icing pad boundary at ${v.name}`;
  return `ramp to ground handoff at ${v.name}: confirm the clearance before leaving the non-movement area`;
}

export function assembleRoute(
  gated: TaxiGraph,
  layer: ZoneLayer,
  aircraft: AircraftModel,
  merge: MergePath,
  graphRoute: readonly DirectedEdge[],
  permissions: PermissionSet,
  limits: SpeedLimits = defaultSpeedLimits(),
): Route {
  const route = emptyRoute();
  route.graphRoute = [...graphRoute];
  const haveMerge = merge.found && !pathIsEmpty(merge.path);
  if (graphRoute.length === 0 && !haveMerge) return route;

  // --- the curve ---------------------------------------------------------
  const parts: Path[] = [];
  if (haveMerge) parts.push(merge.path);

  let cursor: Pose = haveMerge
    ? pathEndPose(merge.path)
    : gated.poseAlong(graphRoute[0]!, 0);

  const corners: Corner[] = [];
  let travelled = haveMerge ? pathLength(merge.path) : 0;
  route.mergeLength = travelled;

  for (let i = 0; i < graphRoute.length; ++i) {
    const d = graphRoute[i]!;
    const heading = gated.heading(d);
    const entryS = travelled;
    const remaining = Math.max(0, alongTrack({ p: cursor.p, heading }, gated.headPoint(d)));

    // How much of this leg is eaten by the fillet into the next one?
    let fillet = 0;
    let radius = 0;
    let sweep = 0;
    const next = graphRoute[i + 1];
    if (next) {
      sweep = wrapAngle(gated.heading(next) - heading);
      if (Math.abs(sweep) > 1e-6) {
        const halfTan = Math.tan(0.5 * Math.abs(sweep));
        const room = Math.min(remaining, gated.length(next.edge));
        // The minimum radius, not the preferred one.  A fillet of radius r cuts
        // the corner by 0.41 r on a right-angle turn, and a 30 m taxiway simply
        // has no room for a gentle arc -- which is why a taxiing aeroplane
        // turns a junction as tightly as it can and the gear tracks stay on.
        radius = aircraft.minTurnRadius;
        fillet = radius * halfTan;
        if (fillet > room) fillet = 0; // no room for an arc: take the corner sharp
      }
    }

    const straight = Math.max(0, remaining - fillet);
    if (straight > 1e-9) {
      const leg = straightPath({ p: cursor.p, heading }, straight, DEFAULT_STEP);
      parts.push(leg);
      cursor = pathEndPose(leg);
      travelled += straight;
    } else {
      cursor = { p: cursor.p, heading };
    }

    corners.push({ vertex: gated.head(d), entryS, s: travelled + fillet });

    if (fillet > 1e-9) {
      const arc = arcPath(cursor, sweep > 0 ? radius : -radius, sweep, DEFAULT_STEP);
      parts.push(arc);
      cursor = pathEndPose(arc);
      travelled += pathLength(arc);
    } else if (next) {
      cursor = { p: cursor.p, heading: gated.heading(next) };
    }
  }
  route.path = concatenatePaths(parts);

  // --- events ------------------------------------------------------------
  const events: RouteEvent[] = [{ kind: 'departure', s: 0, message: 'start' }];
  if (haveMerge)
    events.push({
      kind: 'mergeComplete',
      s: route.mergeLength,
      message: `on the guidance line, via ${mergeMethodName(merge.method)}`,
    });

  let truncateAt = pathLength(route.path);
  let truncated = false;
  for (let i = 0; i < corners.length; ++i) {
    const corner = corners[i]!;
    const v = gated.vertex(corner.vertex);
    if (v.gate === 'none') continue;

    if (v.gate === 'soft') {
      events.push({ kind: 'softGate', s: corner.s, message: softGateMessage(v) });
      continue;
    }

    // A hard gate.  Which way through it?  The zone of the edge we arrived on
    // says it all: arriving on the inner side means we are about to go in.
    const inbound = gated.edge(graphRoute[i]!.edge).zone === v.innerZone;
    if (!inbound) {
      events.push({ kind: 'runwayCrossingEnd', s: corner.s, message: `clear of ${v.name}` });
      continue;
    }
    if (allowsGate(permissions, v.id)) {
      events.push({ kind: 'runwayCrossingStart', s: corner.s, message: `crossing at ${v.name}` });
      continue;
    }

    // Unauthorized, and pointed at it.  This is where the aircraft stops -- and
    // it is the *nose* that has to stop short, not the reference point.  Near a
    // junction the path is curving, so walking back a fixed arclength is not
    // good enough; bisect for the arclength that puts the nose exactly where it
    // belongs.
    const line: Pose = { p: v.p, heading: gated.heading(graphRoute[i]!) };
    const noseAlong = (s: number): number => {
      const sample = pathAt(route.path, s);
      return alongTrack(line, noseTip(aircraft, { p: sample.p, heading: sample.heading }));
    };
    let stopAt = 0;
    if (noseAlong(0) <= -limits.stopMargin) {
      let lo = 0;
      let hi = corner.s;
      for (let step = 0; step < 60; ++step) {
        const mid = 0.5 * (lo + hi);
        if (noseAlong(mid) <= -limits.stopMargin) lo = mid;
        else hi = mid;
      }
      stopAt = lo;
    }
    events.push({ kind: 'holdShort', s: stopAt, message: `hold short at ${v.name}` });
    route.stops.push({ s: stopAt, reason: `holding position ${v.name} is not authorized` });
    truncateAt = stopAt;
    truncated = true;
    break;
  }

  // Hotspots, from the edges the route actually uses.
  {
    let inside = false;
    for (let i = 0; i < graphRoute.length; ++i) {
      if (gated.edge(graphRoute[i]!.edge).hotspot === inside) continue;
      inside = !inside;
      events.push({
        kind: inside ? 'hotspotEnter' : 'hotspotExit',
        s: corners[i]!.entryS,
        message: inside ? 'entering a hotspot: slow down and look' : 'clear of the hotspot',
      });
    }
  }

  // --- truncate at the first stop ----------------------------------------
  let finalEvents = events;
  if (truncated) {
    const clipped: PathSample[] = [];
    for (const sample of route.path.samples) {
      if (sample.s > truncateAt) break;
      clipped.push(sample);
    }
    const last = clipped[clipped.length - 1];
    if (!last || last.s < truncateAt - 1e-9) clipped.push(pathAt(route.path, truncateAt));
    route.path = { samples: clipped };
    finalEvents = finalEvents.filter((e) => e.s <= truncateAt + 1e-9);
  }
  finalEvents.push({
    kind: 'arrival',
    s: pathLength(route.path),
    message: truncated ? 'stopped short' : 'at the goal',
  });
  // Stable, so two events at the same arclength stay in the order they were
  // discovered -- which is the order the crew will hear them.
  route.events = [...finalEvents].sort((a, b) => a.s - b.s);

  // --- speed profile -----------------------------------------------------
  //
  // Zone limit, hotspot factor, turn comfort -- then a pass for the
  // deceleration into every stop.
  const routeLength = pathLength(route.path);
  for (let s = 0; s <= routeLength + 1e-9; s += 2.0) {
    const sample = pathAt(route.path, s);
    const q = zoneAt(layer, sample.p);
    let v = speedLimitFor(q.zone, limits);
    if (q.hotspot) v *= limits.hotspotFactor;
    if (Math.abs(sample.curvature) > 1e-6) {
      // v <= sqrt(a_lat * r) is what keeps a turn comfortable for the cabin.
      const radius = 1 / Math.abs(sample.curvature);
      v = Math.min(v, Math.sqrt(aircraft.maxLateralAccel * radius));
    }
    route.speed.push({ s, v });
  }
  for (const stop of route.stops)
    for (const point of route.speed)
      point.v =
        point.s >= stop.s
          ? 0
          : Math.min(point.v, Math.sqrt(2 * aircraft.maxDecel * (stop.s - point.s)));
  const lastSpeed = route.speed[route.speed.length - 1];
  if (lastSpeed) lastSpeed.v = 0;

  route.cost = pathLength(route.path);
  return route;
}
