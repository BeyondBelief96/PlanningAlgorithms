// Exercise 11 -- assembling the route (Step 10).
//
// Read exercises/capstone/ex11_route_assembly/README.md first.
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

Route assembleRoute(const TaxiGraph& gated, const ZoneLayer& layer, const AircraftModel& aircraft,
                    const MergePath& merge, const std::vector<DirectedEdge>& graphRoute,
                    const PermissionSet& permissions, const SpeedLimits& limits) {
  // TODO(you): one curve, then the annotations.
  //
  // The curve: the merge path, then each graph edge in turn, with a circular
  // fillet at every corner.  Use the *minimum* turn radius, not the preferred
  // one -- a fillet of radius r cuts a right-angle corner by 0.41 r, and a
  // 30 m taxiway has no room for a gentle arc.  Record the arclength of every
  // junction as you go; the events hang off those.
  //
  // The events:
  //   SoftGate              at every soft gate: the ramp-to-ground handoff,
  //                         the stand boundary, the de-icing pad boundary
  //   RunwayCrossingStart   at an authorized hard gate entered from the inside
  //   RunwayCrossingEnd     at a hard gate left from the outside -- leaving a
  //                         runway needs no clearance
  //   HoldShort + StopPoint at an unauthorized hard gate entered from the
  //                         inside.  Truncate the path here.
  //   HotspotEnter/Exit     from the hotspot flags on the edges
  //
  // The stop: the *nose* stops limits.stopMargin short of the line.  The
  // reference point is the main gear centre, twelve metres behind the nose, and
  // near a junction the path is curving -- so walking back a fixed arclength is
  // not good enough.  Bisect for the arclength that puts the nose exactly where
  // it belongs.
  //
  // The speed profile: the zone limit, times the hotspot factor, capped by
  // v <= sqrt(a_lat * r) in the turns, then a pass for the deceleration into
  // every stop: v^2 = 2 a d.
  (void)gated;
  (void)layer;
  (void)aircraft;
  (void)merge;
  (void)graphRoute;
  (void)permissions;
  (void)limits;
  return Route{};
}

}  // namespace planning::airport
