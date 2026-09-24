// Exercise 07 -- merge candidates, and only in the start zone (Step 7).
// Brief: docs/capstone/ex07-merge-candidates.md

import {
  type AircraftModel,
  alongTrack,
  angleOf,
  type PermissionSet,
  segmentsIntersect,
  type TaxiGraph,
  wrapAngle,
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
import { advanceRouteIndex } from './ex06-cost-to-go.js';

export function generateMergeCandidates(
  gated: TaxiGraph,
  layer: ZoneLayer,
  aircraft: AircraftModel,
  localization: Localization,
  permissions: PermissionSet,
  filter: EdgeFilter,
  costToGo: CostToGo,
): MergeCandidate[] {
  // TODO(you): where could the aeroplane join the guidance-line network?
  //
  // Walk every allowed directed edge whose zone the start zone permits, and
  // sample it every CANDIDATE_SPACING metres, staying JUNCTION_EXCLUSION clear
  // of both ends.  Keep a sample only if ALL of these hold:
  //
  //   within CANDIDATE_RADIUS of the aircraft
  //   the bearing to it is inside MAX_CANDIDATE_BEARING -- do not turn round
  //   the line's own heading is inside MAX_CANDIDATE_BEARING of ours
  //   on a runway, strictly ahead (alongTrack > 0): you cannot pick an exit
  //     behind you
  //   the straight line to it crosses no painted holding position
  //   the straight line to it never leaves the start zone   <-- the invariant
  //   at least MIN_LEAD_IN metres of straight line follow the merge point,
  //     following collinear edges across junctions
  //   advanceRouteIndex(edge, 0, routeLabels) >= 0, and the cost-to-go from
  //     (edge, that index) is finite
  //
  // Then sort cheapest first: costToGo at the merge point, plus the drive to it
  // charged at the start zone's own rate, so a distant merge does not look free.
  //
  // Every one of those filters exists to make one thing impossible: producing a
  // candidate the aircraft could only reach by driving out of the zone it is in.
  void gated;
  void layer;
  void aircraft;
  void localization;
  void permissions;
  void filter;
  void costToGo;
  void allowsEdge;
  void advanceRouteIndex;
  void zoneAt;
  void alongTrack;
  void angleOf;
  void wrapAngle;
  void segmentsIntersect;
  void CANDIDATE_RADIUS;
  void CANDIDATE_SPACING;
  void JUNCTION_EXCLUSION;
  void MAX_CANDIDATE_BEARING;
  void MIN_LEAD_IN;
  return [];
}
