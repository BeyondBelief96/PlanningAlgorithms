// Reference solution -- Exercise 03: localization and start mode (Step 3).
//
// The reference point of a Pose is the main gear centre, but the zone the
// aircraft is *in* is decided by all three tyres.  Testing only the reference
// point is the single most common way to write a planner that taxis a wingtip
// through a jet bridge.

import {
  type AircraftModel,
  centroidOf,
  crossTrack,
  deg,
  distance,
  distanceToBoundary,
  gearPoints,
  INF,
  type Pose,
  reversed,
  type TaxiGraph,
  wrapAngle,
  type ZoneClass,
  type ZoneLayer,
  zoneName,
} from '../../airport/index.js';
import {
  emptyLocalization,
  type Localization,
  MODE_HYSTERESIS,
  type StartMode,
} from '../types.js';
import { classifyFootprint, zoneAt } from './ex01-zone-layer.js';

function modeForZone(zone: ZoneClass): StartMode {
  switch (zone) {
    case 'stand':
      return 'stand';
    case 'apron':
    case 'deicing':
      return 'apron';
    case 'taxiway':
      return 'taxiwayCapture';
    // A protected area is treated as runway: no free-space planning at all.
    case 'runway':
    case 'runwayProtected':
      return 'runway';
    default:
      return 'fault';
  }
}

function zoneMatches(edgeZone: ZoneClass, startZone: ZoneClass, mode: StartMode): boolean {
  if (edgeZone === startZone) return true;
  // A stand is reached from the apron, and the stand lead-out line runs into
  // it, so a stand start may also look at apron taxilanes.
  if (mode === 'stand' && edgeZone === 'apron') return true;
  if (mode === 'runway' && (edgeZone === 'runway' || edgeZone === 'runwayProtected')) return true;
  return false;
}

/**
 * How far inside its own zone polygon the whole footprint sits.  Zero when any
 * key point is outside.  This is what the hysteresis test is made of.
 */
function depthInZone(
  layer: ZoneLayer,
  aircraft: AircraftModel,
  pose: Pose,
  zone: ZoneClass,
): number {
  let depth = INF;
  for (const g of gearPoints(aircraft, pose)) {
    const q = zoneAt(layer, g);
    if (q.zone !== zone || q.polygonId < 0) return 0;
    depth = Math.min(depth, distanceToBoundary(layer.polygon(q.polygonId).outline, g));
  }
  return depth;
}

export function localize(
  layer: ZoneLayer,
  gated: TaxiGraph,
  aircraft: AircraftModel,
  pose: Pose,
  previous?: Localization,
): Localization {
  const loc = emptyLocalization(pose);
  loc.footprint = classifyFootprint(layer, aircraft, pose);
  const f = loc.footprint;

  if (f.wingtipViolation) {
    loc.detail = 'a wingtip is inside a structure';
    return loc; // fault
  }
  if (!f.allGearLoadBearing) {
    loc.detail = 'gear is off load-bearing pavement';
    return loc;
  }
  if (!f.gearConsistent) {
    const other = f.leftMainGear.zone !== f.noseGear.zone ? f.leftMainGear.zone : f.rightMainGear.zone;
    loc.detail = `gear straddles ${zoneName(f.noseGear.zone)} and ${zoneName(other)}`;
    return loc;
  }

  loc.zone = f.gearZone;
  loc.polygonId = f.noseGear.polygonId;
  loc.mode = modeForZone(loc.zone);
  if (loc.mode === 'fault') {
    loc.detail = `zone ${zoneName(loc.zone)} is not a place to start from`;
    return loc;
  }

  // Hysteresis.  A boundary crossing only takes effect once the footprint is
  // properly inside the new zone, otherwise a metre of position noise makes the
  // mode flip between apron and taxiway on successive replans.
  if (
    previous !== undefined &&
    previous.mode !== 'fault' &&
    previous.mode !== loc.mode &&
    depthInZone(layer, aircraft, pose, loc.zone) < MODE_HYSTERESIS
  ) {
    loc.mode = previous.mode;
    loc.zone = previous.zone;
    loc.detail = 'holding the previous mode (within the hysteresis band)';
  }

  // The nearest guidance line that belongs to this zone.
  let best = INF;
  for (const e of gated.edges) {
    if (!zoneMatches(e.zone, loc.zone, loc.mode)) continue;
    const forward = { edge: e.id, forward: true };
    const s = gated.projectOnto(forward, pose.p);
    const d = distance(gated.poseAlong(forward, s).p, pose.p);
    if (d >= best) continue;
    best = d;
    loc.nearestEdge = forward;
    loc.nearestS = s;
  }

  if (loc.nearestEdge.edge >= 0) {
    // Which way along it?  In stand mode, always the way that leads *out* of
    // the stand -- that is what makes a nose-in parking position detectable.
    const back = reversed(loc.nearestEdge);
    if (loc.mode === 'stand') {
      const here = zoneAt(layer, pose.p);
      const centre =
        here.polygonId >= 0 ? centroidOf(layer.polygon(here.polygonId).outline) : pose.p;
      if (
        distance(gated.headPoint(loc.nearestEdge), centre) <
        distance(gated.tailPoint(loc.nearestEdge), centre)
      ) {
        loc.nearestEdge = back;
        loc.nearestS = gated.length(loc.nearestEdge.edge) - loc.nearestS;
      }
    } else if (
      Math.abs(wrapAngle(gated.heading(back) - pose.heading)) <
      Math.abs(wrapAngle(gated.heading(loc.nearestEdge) - pose.heading))
    ) {
      loc.nearestEdge = back;
      loc.nearestS = gated.length(loc.nearestEdge.edge) - loc.nearestS;
    }

    const line = gated.poseAlong(loc.nearestEdge, loc.nearestS);
    loc.crossTrack = crossTrack(line, pose.p);
    loc.headingError = wrapAngle(pose.heading - line.heading);
    loc.onGuidanceLine = Math.abs(loc.crossTrack) <= 2.0 && Math.abs(loc.headingError) <= deg(10);
  }

  if (loc.detail === '')
    loc.detail = `in ${zoneName(loc.zone)}${
      loc.onGuidanceLine ? ', on the guidance line' : ', off the guidance line'
    }`;
  return loc;
}
