// Exercise 10 -- validating the swept footprint (Step 9).
//
// Read exercises/capstone/ex10_swept_footprint/README.md first.
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

const char* toString(SweepViolation::Kind kind) {
  // TODO(you): one phrase per kind, for the refusal messages.
  (void)kind;
  return "?";
}

SweepResult validateSweep(const ZoneLayer& layer, const AircraftModel& aircraft, const Path& path,
                          ZoneClass startZone, const PermissionSet& permissions, bool offGraph) {
  // TODO(you): step along the path in kSweepStep metres and, at every pose,
  // apply the four checks of Step 9.
  //
  // 1. Gear tracks.  All three tyres on load-bearing pavement.  Shoulders do
  //    not count -- report them separately, because "you clipped the shoulder"
  //    and "you drove into the grass" are different bugs.
  //
  // 2. Wingtip envelope.  Clear of structures by the ICAO separation for this
  //    aircraft, with the larger margin on aprons.
  //
  // 3. Holding positions and runways, tested against the *swept outline*, not
  //    the centreline.  aircraft.footprint(pose) gives the outline;
  //    segmentIntersectsPolygon() and polygonsOverlap() do the tests.  A
  //    runway carries two identifiers for one strip, so naming either one in
  //    permissions.enterableRunways opens it.
  //
  // 4. When offGraph is true, the whole sweep must stay in startZone.  Stand
  //    to apron is the one permitted exception: the stand exists to be left.
  //
  // An empty path -- what a capture-window merge produces -- is a pass, not a
  // failure.  And one report per distinct problem is enough: a long stretch
  // off the pavement should not produce four hundred identical violations.
  (void)layer;
  (void)aircraft;
  (void)path;
  (void)startZone;
  (void)permissions;
  (void)offGraph;
  return SweepResult{};
}

}  // namespace planning::airport
