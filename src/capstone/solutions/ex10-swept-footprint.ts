// Reference solution -- Exercise 10: validating the swept footprint (Step 9).
//
// Up to here the planner has reasoned about a *curve*.  This is the first and
// only place it reasons about the *aeroplane*.  Four checks, in the order they
// matter: the tyres are on pavement that carries weight, the wings are clear of
// structures, no part of the outline crosses a holding position it has no
// clearance to cross, and the off-graph part never left the zone it started in.

import {
  type AircraftModel,
  boundsOf,
  distanceOutsidePolygon,
  footprintOf,
  gearPoints,
  leftWingtip,
  type Path,
  pathAt,
  pathIsEmpty,
  pathLength,
  type PermissionSet,
  policyFor,
  polygonsOverlap,
  type Pose,
  rightWingtip,
  segmentIntersectsPolygon,
  type ZoneClass,
  type ZoneLayer,
  zoneName,
} from '../../airport/index.js';
import {
  SWEEP_STEP,
  type SweepResult,
  type SweepViolation,
  type SweepViolationKind,
} from '../types.js';
import { zoneAt } from './ex01-zone-layer.js';

function authorizedRunway(idents: readonly string[], enterable: ReadonlySet<string>): boolean {
  // A runway has two identifiers for one strip: naming either one opens it.
  return idents.some((id) => enterable.has(id));
}

function sameZoneFamily(zone: ZoneClass, startZone: ZoneClass): boolean {
  if (zone === startZone) return true;
  // Rolling out of a stand onto the apron is the one permitted free-space zone
  // change, because the stand exists to be left.
  if (startZone === 'stand' && zone === 'apron') return true;
  return false;
}

export function validateSweep(
  layer: ZoneLayer,
  aircraft: AircraftModel,
  path: Path,
  startZone: ZoneClass,
  permissions: PermissionSet,
  offGraph: boolean,
): SweepResult {
  if (pathIsEmpty(path)) {
    // A capture-window merge plans no motion at all, and there is nothing to
    // sweep.  That is a pass, not a failure.
    return { ok: true, violations: [] };
  }

  const wingMargin =
    startZone === 'apron' || startZone === 'stand'
      ? aircraft.apronWingtipMargin
      : aircraft.wingtipMargin;

  let violations: SweepViolation[] = [];
  const add = (kind: SweepViolationKind, s: number, what: string): void => {
    violations.push({ kind, s, what });
  };

  const length = pathLength(path);
  for (let s = 0; s <= length + 1e-9; s += SWEEP_STEP) {
    const sample = pathAt(path, s);
    const pose: Pose = { p: sample.p, heading: sample.heading };

    // 1. Gear tracks stay on load-bearing pavement of the right zone.
    for (const tyre of gearPoints(aircraft, pose)) {
      const q = zoneAt(layer, tyre);
      if (q.zone === 'shoulder') {
        add('gearOnShoulder', s, 'a tyre rolled onto a taxiway shoulder');
      } else if (!policyFor(q.zone).loadBearing) {
        add('gearOffPavement', s, `a tyre is on ${zoneName(q.zone)}`);
      } else if (offGraph && !sameZoneFamily(q.zone, startZone)) {
        add('leftStartZone', s, `off-graph motion reached ${zoneName(q.zone)}`);
      }
    }

    // 2. Wingtip envelope clear of structures, by ICAO separation.
    for (const tip of [leftWingtip(aircraft, pose), rightWingtip(aircraft, pose)]) {
      for (const id of layer.candidates(boundsOf([tip]).grown(wingMargin))) {
        const poly = layer.polygon(id);
        if (poly.overlay || !policyFor(poly.zone).wingtipForbidden) continue;
        if (distanceOutsidePolygon(poly.outline, tip) < wingMargin)
          add(
            'wingtipConflict',
            s,
            `wingtip within ${Math.trunc(wingMargin)} m of ${poly.name}`,
          );
      }
    }

    // 3. No part of the outline crosses a holding position, or enters a runway
    //    or protected area, without a clearance that names it.  Tested against
    //    the swept outline, not the centreline.
    const outline = footprintOf(aircraft, pose);
    const box = boundsOf(outline);
    for (const id of layer.holdShortCandidates(box)) {
      const line = layer.holdShortLine(id);
      if (authorizedRunway(line.protects, permissions.enterableRunways)) continue;
      if (segmentIntersectsPolygon(outline, line.segment))
        add('holdShortCrossed', s, `the outline crosses ${line.name}`);
    }
    for (const id of layer.candidates(box)) {
      const poly = layer.polygon(id);
      if (poly.overlay) continue;
      if (poly.zone !== 'runway' && poly.zone !== 'runwayProtected') continue;
      if (authorizedRunway(poly.idents, permissions.enterableRunways)) continue;
      if (polygonsOverlap(outline, poly.outline))
        add('runwayEntered', s, `the outline entered ${poly.name}`);
    }
  }

  // The same violation repeats at every sample of a long stretch; one report
  // per kind and message is enough to act on.
  violations.sort((a, b) => (a.what !== b.what ? (a.what < b.what ? -1 : 1) : a.s - b.s));
  const seen = new Set<string>();
  violations = violations.filter((v) => {
    if (seen.has(v.what)) return false;
    seen.add(v.what);
    return true;
  });
  violations.sort((a, b) => a.s - b.s);

  return { ok: violations.length === 0, violations };
}
