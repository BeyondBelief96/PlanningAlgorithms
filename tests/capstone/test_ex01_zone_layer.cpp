#include "planning/airport/airport_map.hpp"
#include "planning/airport/taxi_planner.hpp"
#include "test_harness.hpp"

using namespace planning::airport;

namespace {

const ZoneLayer& kilo() { return maps::kilo().zones; }

}  // namespace

TEST(zone_at_reports_the_obvious_places) {
  CHECK(zoneAt(kilo(), Vec2{290, 95}).zone == ZoneClass::Stand);
  CHECK(zoneAt(kilo(), Vec2{300, 200}).zone == ZoneClass::Apron);
  CHECK(zoneAt(kilo(), Vec2{800, 200}).zone == ZoneClass::Taxiway);
  CHECK(zoneAt(kilo(), Vec2{1200, 500}).zone == ZoneClass::Runway);
  CHECK(zoneAt(kilo(), Vec2{680, 280}).zone == ZoneClass::DeIcing);
  CHECK(zoneAt(kilo(), Vec2{300, 20}).zone == ZoneClass::Forbidden);
  CHECK(zoneAt(kilo(), Vec2{800, 220}).zone == ZoneClass::Shoulder);
  CHECK(zoneAt(kilo(), Vec2{5000, 5000}).zone == ZoneClass::Unknown);
}

TEST(the_most_restrictive_polygon_wins) {
  // Taxiway B runs straight across runway 18/36.  Where they overlap it is a
  // runway, and the protected strip either side is a protected area -- not a
  // taxiway that happens to have a runway drawn on it.
  CHECK(zoneAt(kilo(), Vec2{1450, 400}).zone == ZoneClass::Taxiway);
  CHECK(zoneAt(kilo(), Vec2{1550, 400}).zone == ZoneClass::RunwayProtected);
  CHECK(zoneAt(kilo(), Vec2{1600, 400}).zone == ZoneClass::Runway);
  CHECK(zoneAt(kilo(), Vec2{1650, 400}).zone == ZoneClass::RunwayProtected);
  CHECK(zoneAt(kilo(), Vec2{1700, 400}).zone == ZoneClass::Taxiway);

  // The service road is painted over nothing, but a taxiway shoulder that runs
  // under taxiway C is still taxiway where C is.
  CHECK(zoneAt(kilo(), Vec2{1800, 420}).zone == ZoneClass::Taxiway);
}

TEST(overlays_contribute_flags_and_never_the_zone) {
  const ZoneQuery hotspot = zoneAt(kilo(), Vec2{1000, 400});
  CHECK(hotspot.zone == ZoneClass::Taxiway);
  CHECK(hotspot.hotspot);
  CHECK(!hotspot.closed);

  const ZoneQuery closed = zoneAt(kilo(), Vec2{120, 200});
  CHECK(closed.zone == ZoneClass::Apron);
  CHECK(closed.closed);

  const ZoneQuery plain = zoneAt(kilo(), Vec2{300, 200});
  CHECK(!plain.hotspot);
  CHECK(!plain.closed);
}

TEST(zone_at_names_the_polygon_it_used) {
  const ZoneQuery q = zoneAt(kilo(), Vec2{290, 95});
  CHECK(q.polygonId >= 0);
  CHECK_EQ(kilo().polygon(q.polygonId).name, std::string("STAND 2"));
}

TEST(a_parked_aircraft_is_consistently_in_its_stand) {
  const AircraftModel jet = a320();
  const FootprintZones f = classifyFootprint(kilo(), jet, Pose{{290, 95}, 0.5 * kPi});

  CHECK(f.gearConsistent);
  CHECK(f.allGearLoadBearing);
  CHECK(f.gearZone == ZoneClass::Stand);
  CHECK(!f.wingtipViolation);
  CHECK(f.reference.zone == ZoneClass::Stand);
}

TEST(the_footprint_test_catches_what_the_reference_point_misses) {
  // Main gear centre two metres north of the taxiway edge.  The reference
  // point alone says "shoulder", which sounds survivable; the footprint says
  // one tyre is on the taxiway and one is not, which is the real problem.
  const AircraftModel jet = a320();
  const FootprintZones f = classifyFootprint(kilo(), jet, Pose{{800, 218}, 0.0});

  CHECK(f.reference.zone == ZoneClass::Shoulder);
  CHECK(!f.gearConsistent);
  CHECK(!f.allGearLoadBearing);
  CHECK(f.gearZone == ZoneClass::Unknown);
}

TEST(a_wing_may_overhang_a_shoulder) {
  // Eight metres of wing over the shoulder is normal taxiing; shoulders are
  // built for exactly that.  Only structures make a wingtip a violation.
  const AircraftModel jet = a320();
  const FootprintZones f = classifyFootprint(kilo(), jet, Pose{{800, 206}, 8.0 * kPi / 180.0});

  CHECK(f.gearConsistent);
  CHECK(f.allGearLoadBearing);
  CHECK(f.gearZone == ZoneClass::Taxiway);
  CHECK(f.leftWingtip.zone == ZoneClass::Shoulder);
  CHECK(!f.wingtipViolation);
}

TEST(configuration_space_shrinks_what_you_stand_on) {
  const AircraftModel jet = a320();
  const ZoneLayer cspace = configurationSpace(kilo(), jet);

  // Stand 2 is x in [260, 320]; the error budget is 4 m, so the C-space stand
  // is x in [264, 316].  A point two metres inside the real stand is outside
  // the configuration-space one.
  CHECK(zoneAt(kilo(), Vec2{262, 95}).zone == ZoneClass::Stand);
  CHECK(zoneAt(cspace, Vec2{262, 95}).zone != ZoneClass::Stand);
  CHECK(zoneAt(cspace, Vec2{290, 95}).zone == ZoneClass::Stand);
}

TEST(configuration_space_grows_what_you_must_stay_out_of) {
  const AircraftModel jet = a320();
  const ZoneLayer cspace = configurationSpace(kilo(), jet);

  // The terminal ends at y = 40.  Grown by half a wingspan plus the code C
  // separation it reaches y = 62.4, which swallows the south end of stand 2 --
  // correctly, because a reference point there puts a wingtip in the building.
  CHECK(zoneAt(kilo(), Vec2{300, 55}).zone == ZoneClass::Stand);
  CHECK(zoneAt(cspace, Vec2{300, 55}).zone == ZoneClass::Forbidden);
  CHECK(zoneAt(cspace, Vec2{300, 100}).zone == ZoneClass::Stand);
}

TEST(configuration_space_keeps_the_holding_positions_where_they_are) {
  const AircraftModel jet = a320();
  const ZoneLayer cspace = configurationSpace(kilo(), jet);
  CHECK_EQ(cspace.holdShortLines().size(), kilo().holdShortLines().size());
  CHECK_NEAR(AT(cspace.holdShortLines(), 0).segment.a.x,
             AT(kilo().holdShortLines(), 0).segment.a.x);
}

TEST(a_wingspan_the_taxiway_cannot_hold_collapses_it) {
  // Taxiway A is 30 m wide.  A 777 needs so much margin that the shrunken
  // polygon inverts, and offsetConvex() hands back nothing rather than
  // nonsense -- which is how "this aircraft does not fit here" is spelled.
  AircraftModel huge = b777();
  huge.gearMargin = 20.0;
  const ZoneLayer cspace = configurationSpace(kilo(), huge);
  CHECK(zoneAt(cspace, Vec2{800, 200}).zone != ZoneClass::Taxiway);
}
