// Exercise 10 -- validating the swept footprint (Step 9).
// Brief: docs/capstone/ex10-swept-footprint.md

import {
  type AircraftModel,
  boundsOf,
  distanceOutsidePolygon,
  footprintOf,
  gearPoints,
  leftWingtip,
  type Path,
  pathAt,
  type PermissionSet,
  policyFor,
  polygonsOverlap,
  rightWingtip,
  segmentIntersectsPolygon,
  type ZoneClass,
  type ZoneLayer,
} from '../../airport/index.js';
import { SWEEP_STEP, type SweepResult } from '../types.js';
import { zoneAt } from './ex01-zone-layer.js';

export function validateSweep(
  layer: ZoneLayer,
  aircraft: AircraftModel,
  path: Path,
  startZone: ZoneClass,
  permissions: PermissionSet,
  offGraph: boolean,
): SweepResult {
  // TODO(you): up to here the planner has reasoned about a CURVE.  This is the
  // first and only place it reasons about the AEROPLANE.
  //
  // Sample the path every SWEEP_STEP metres and, at each pose, run four checks:
  //
  //   1  the three tyres are on load-bearing pavement.  A shoulder gets its own
  //      violation kind, because "rolled onto the shoulder" and "left the
  //      pavement entirely" are different phone calls.  When offGraph is true
  //      they must also still be in startZone -- stand to apron is the one
  //      permitted exception, because a stand exists to be left.
  //   2  neither wingtip is within the ICAO separation of a structure.  Use
  //      apronWingtipMargin on apron and stand, wingtipMargin elsewhere.
  //   3  the swept OUTLINE crosses no holding position the clearance has not
  //      named.  Not the centreline: the nose is 12.6 m ahead of the reference
  //      point, and it is the nose that crosses the line first.
  //   4  the swept outline enters no runway or protected area the clearance has
  //      not named.  A runway has two identifiers for one strip; naming either
  //      opens it.
  //
  // Finally, collapse the report.  The same violation repeats at every sample
  // of a long stretch, and four hundred identical violations are not four
  // hundred pieces of information.
  //
  // An empty path is a pass: a capture-window merge plans no motion at all, and
  // there is nothing to sweep.
  void layer;
  void aircraft;
  void path;
  void startZone;
  void permissions;
  void offGraph;
  void SWEEP_STEP;
  void zoneAt;
  void boundsOf;
  void distanceOutsidePolygon;
  void footprintOf;
  void gearPoints;
  void leftWingtip;
  void rightWingtip;
  void pathAt;
  void policyFor;
  void polygonsOverlap;
  void segmentIntersectsPolygon;
  return { ok: false, violations: [] };
}
