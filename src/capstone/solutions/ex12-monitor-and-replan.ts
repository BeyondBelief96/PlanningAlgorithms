// Reference solution -- Exercise 12: the geofence monitor and replanning
// (Steps 11 and 12).
//
// The monitor is the only piece of the capstone that is deliberately stupid.
// It does not know about the graph, the route, the clearance route labels, the
// cost function or the merge ladder.  It knows the zone layer, the permission
// set, where the aircraft is and where it is pointed -- and that is the whole
// point.  A safety net you can read in one sitting is worth more than a clever
// one you cannot.

import {
  add,
  advance,
  type AircraftModel,
  boundsOf,
  distance,
  type DubinsSegment,
  emptyRoute,
  footprintOf,
  forwardOf,
  type PathSample,
  pathAt,
  pathLength,
  type PermissionSet,
  polygonsOverlap,
  type Pose,
  type Route,
  scale,
  segmentIntersectsPolygon,
  type ZoneLayer,
} from '../../airport/index.js';
import {
  monitorClear,
  type MonitorReport,
  type ReplanDecision,
  type ReplanTriggers,
  type VehicleState,
} from '../types.js';

function authorized(idents: readonly string[], enterable: ReadonlySet<string>): boolean {
  return idents.some((id) => enterable.has(id));
}

/** Constant speed, constant steering: the dead-reckoning a monitor is allowed. */
function project(pose: Pose, along: number, curvature: number): Pose {
  if (Math.abs(curvature) < 1e-6)
    return { p: add(pose.p, scale(forwardOf(pose), along)), heading: pose.heading };
  const radius = 1 / curvature;
  const arc: DubinsSegment = {
    isArc: true,
    signedRadius: radius,
    sweep: along * curvature,
    length: Math.abs(along),
  };
  return advance(pose, arc);
}

export function geofenceMonitor(
  layer: ZoneLayer,
  aircraft: AircraftModel,
  state: VehicleState,
  permissions: PermissionSet,
  horizonSeconds = 6.0,
  stepSeconds = 0.25,
): MonitorReport {
  const step = Math.max(stepSeconds, 0.05);

  for (let t = 0; t <= horizonSeconds + 1e-9; t += step) {
    const pose = project(state.pose, state.speed * t, state.curvature);
    const outline = footprintOf(aircraft, pose);
    const box = boundsOf(outline);

    const trip = (reason: string): MonitorReport => ({
      verdict: 'stop',
      reason,
      timeToViolation: t,
      where: pose.p,
    });

    for (const id of layer.candidates(box)) {
      const poly = layer.polygon(id);
      if (poly.overlay) continue;
      const runway = poly.zone === 'runway' || poly.zone === 'runwayProtected';
      if (!runway && poly.zone !== 'forbidden') continue;
      if (runway && authorized(poly.idents, permissions.enterableRunways)) continue;
      if (!polygonsOverlap(outline, poly.outline)) continue;
      return trip(
        `${runway ? 'projected into ' : 'projected into forbidden area '}${poly.name}`,
      );
    }

    for (const id of layer.holdShortCandidates(box)) {
      const line = layer.holdShortLine(id);
      if (authorized(line.protects, permissions.enterableRunways)) continue;
      if (!segmentIntersectsPolygon(outline, line.segment)) continue;
      return trip(`projected across ${line.name}`);
    }
  }
  return monitorClear();
}

export function shouldReplan(
  triggers: ReplanTriggers,
  speed: number,
  crossTrackLimit = 3.0,
  periodSeconds = 5.0,
  commitSeconds = 3.0,
): ReplanDecision {
  // Replanning from the current pose while keeping the committed prefix is what
  // stops the path jumping under the controller.  A monitor intervention is the
  // exception: it has already commanded a stop, so nothing is committed.
  const decision: ReplanDecision = {
    replan: false,
    trigger: '',
    commitDistance: Math.max(0, speed * commitSeconds),
  };

  if (triggers.monitorIntervened === true) {
    decision.replan = true;
    decision.trigger = 'monitor intervention';
    decision.commitDistance = 0;
  } else if (triggers.newClearance === true) {
    decision.replan = true;
    decision.trigger = 'new clearance';
  } else if (triggers.newObstacle === true) {
    decision.replan = true;
    decision.trigger = 'new obstacle';
  } else if (Math.abs(triggers.crossTrackError ?? 0) > crossTrackLimit) {
    decision.replan = true;
    decision.trigger = 'cross-track error';
  } else if ((triggers.secondsSinceLastPlan ?? 0) >= periodSeconds) {
    decision.replan = true;
    decision.trigger = 'periodic';
  }
  return decision;
}

export function spliceRoute(committed: Route, commitS: number, fresh: Route): Route {
  const out = emptyRoute();
  const cut = Math.min(Math.max(commitS, 0), pathLength(committed.path));

  const samples: PathSample[] = [];
  for (const sample of committed.path.samples) {
    if (sample.s > cut) break;
    samples.push(sample);
  }
  const last = samples[samples.length - 1];
  if (cut > 0 && (!last || last.s < cut - 1e-9)) samples.push(pathAt(committed.path, cut));

  const base = samples[samples.length - 1]?.s ?? 0;
  for (const sample of fresh.path.samples) {
    const shifted: PathSample = { ...sample, s: sample.s + base };
    const tail = samples[samples.length - 1];
    if (tail && distance(tail.p, shifted.p) < 1e-6 && sample.s === 0) continue;
    samples.push(shifted);
  }
  out.path = { samples };

  const keep = <T extends { s: number }>(into: T[], from: readonly T[], offset: number, limit: number): void => {
    for (const item of from) {
      if (item.s > limit + 1e-9) continue;
      into.push({ ...item, s: item.s + offset });
    }
  };
  keep(out.events, committed.events, 0, cut);
  keep(out.stops, committed.stops, 0, cut);
  keep(out.speed, committed.speed, 0, cut);
  keep(out.events, fresh.events, base, pathLength(fresh.path));
  keep(out.stops, fresh.stops, base, pathLength(fresh.path));
  keep(out.speed, fresh.speed, base, pathLength(fresh.path));

  out.graphRoute = [...fresh.graphRoute];
  out.mergeLength = base + fresh.mergeLength;
  out.cost = pathLength(out.path);
  return out;
}
