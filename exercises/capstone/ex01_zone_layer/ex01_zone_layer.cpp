// Exercise 01 -- the zone layer (Step 1).
//
// Read exercises/capstone/ex01_zone_layer/README.md first.
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

ZoneQuery zoneAt(const ZoneLayer& layer, const Vec2& p) {
  // TODO(you): resolve every polygon covering p into one answer.
  //
  //   layer.candidates(p)      the broadphase: ids whose bbox contains p
  //   polygonContains(...)     the exact test
  //   zonePriority(zone)       higher wins; "most restrictive first"
  //
  // Overlay polygons (poly.overlay) never decide the zone class -- they only
  // contribute the hotspot and closed flags.  A hotspot painted over a taxiway
  // leaves it a taxiway.
  (void)layer;
  (void)p;
  return ZoneQuery{};
}

FootprintZones classifyFootprint(const ZoneLayer& layer, const AircraftModel& aircraft,
                                 const Pose& pose) {
  // TODO(you): zoneAt() for the reference point, the three tyres and the two
  // wingtips, then the three summary flags:
  //
  //   allGearLoadBearing  every tyre on pavement with policyFor(z).loadBearing
  //   gearConsistent      all three tyres in the same zone class
  //   wingtipViolation    a wingtip is somewhere policyFor(z).wingtipForbidden
  //
  // Testing only pose.p is the single most common way to write a planner that
  // taxis a wingtip through a jet bridge.
  (void)layer;
  (void)aircraft;
  (void)pose;
  return FootprintZones{};
}

ZoneLayer configurationSpace(const ZoneLayer& layer, const AircraftModel& aircraft) {
  // TODO(you): shrink what the gear may stand on, grow what the aircraft must
  // stay out of, so that a *point* test on the result is a *footprint* test on
  // the original.  offsetConvex(outline, delta) does the geometry: delta > 0
  // grows, delta < 0 shrinks, and it returns an empty polygon when a shrink
  // collapses the shape -- which means this aircraft does not fit there.
  //
  //   load-bearing zones    -aircraft.gearInflation()
  //   structures            +0.5 * wingspan + wingtipMargin
  //   shoulders             +aircraft.gearInflation()
  //   overlays              unchanged: they are flags, not geometry
  //
  // Remember to copy the holding positions across and to call build().
  (void)layer;
  (void)aircraft;
  return ZoneLayer{};
}

}  // namespace planning::airport
