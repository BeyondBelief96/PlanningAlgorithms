// Exercise 11 -- assembling the route: events, stops, speed (Step 10).
// Brief: docs/capstone/ex11-route-assembly.md

import {
  type AircraftModel,
  allowsGate,
  alongTrack,
  arcPath,
  concatenatePaths,
  type DirectedEdge,
  emptyRoute,
  noseTip,
  pathAt,
  type PermissionSet,
  type Route,
  straightPath,
  type TaxiGraph,
  wrapAngle,
  type ZoneLayer,
} from '../../airport/index.js';
import { defaultSpeedLimits, type MergePath, type SpeedLimits } from '../types.js';
import { zoneAt } from './ex01-zone-layer.js';

export function assembleRoute(
  gated: TaxiGraph,
  layer: ZoneLayer,
  aircraft: AircraftModel,
  merge: MergePath,
  graphRoute: readonly DirectedEdge[],
  permissions: PermissionSet,
  limits: SpeedLimits = defaultSpeedLimits(),
): Route {
  // TODO(you): the merge path and the graph route become one curve, and then
  // that curve gets annotated.  Four parts:
  //
  //   1  THE CURVE.  Concatenate the merge path, then one straight per graph
  //      edge, with an arc filleting every corner.  Use the MINIMUM turn
  //      radius, not the preferred one: a 30 m taxiway has no room for a gentle
  //      arc, which is why a taxiing aeroplane takes a junction as tightly as
  //      it can.  When there is no room for even that, take the corner sharp.
  //
  //   2  EVENTS.  Departure, merge complete, arrival, plus one per gate the
  //      route passes.  A soft gate is a radio call.  A hard gate is a runway
  //      crossing -- announced at both ends -- when the clearance opens it, and
  //      a STOP when it does not.  Which way through the gate you are going is
  //      told by the zone of the edge you arrived on.
  //
  //   3  STOPS.  This is the part worth getting right.  The NOSE has to stop
  //      limits.stopMargin short of the holding position, and the reference
  //      point is the main gear centre 12.6 m behind it.  Near a junction the
  //      path is curving, so walking back a fixed arclength is not good enough:
  //      bisect for the arclength that puts the nose exactly where it belongs.
  //      Then truncate the path there, and drop the events beyond it.
  //
  //   4  SPEED.  Zone limit, halved in a hotspot, capped by turn comfort
  //      (v <= sqrt(a_lat * r)), then a final pass braking into every stop
  //      (v <= sqrt(2 * a_decel * distance)).  The route ends at zero.
  void gated;
  void layer;
  void aircraft;
  void merge;
  void graphRoute;
  void permissions;
  void limits;
  void allowsGate;
  void alongTrack;
  void arcPath;
  void concatenatePaths;
  void noseTip;
  void pathAt;
  void straightPath;
  void wrapAngle;
  void zoneAt;
  return emptyRoute();
}
