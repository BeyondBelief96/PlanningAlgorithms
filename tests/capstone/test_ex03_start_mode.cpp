#include "capstone/capstone_fixture.hpp"
#include "test_harness.hpp"

using namespace planning::airport;

namespace {

Localization at(const Pose& pose, const AircraftModel& model = a320(),
                const Localization* previous = nullptr) {
  static const maps::Airport& airport = maps::kilo();
  static const TaxiGraph gated = buildGatedGraph(airport.graph, airport.zones);
  return localize(airport.zones, gated, model, pose, previous);
}

constexpr double kDeg = kPi / 180.0;

}  // namespace

TEST(each_zone_maps_to_its_own_start_mode) {
  CHECK(at(Pose{{290, 95}, 90 * kDeg}).mode == StartMode::Stand);
  CHECK(at(Pose{{350, 240}, 45 * kDeg}).mode == StartMode::Apron);
  CHECK(at(Pose{{800, 206}, 8 * kDeg}).mode == StartMode::TaxiwayCapture);
  CHECK(at(Pose{{1150, 500}, 0.0}).mode == StartMode::Runway);
}

TEST(a_protected_area_is_treated_as_runway) {
  // No free-space planning between the holding position and the runway edge.
  const Localization loc = at(Pose{{1550, 400}, 0.0});
  CHECK(loc.zone == ZoneClass::RunwayProtected);
  CHECK(loc.mode == StartMode::Runway);
}

TEST(a_footprint_off_the_pavement_is_a_fault_and_says_why) {
  const Localization loc = at(Pose{{800, 228}, 0.0});
  CHECK(loc.mode == StartMode::Fault);
  CHECK_MSG(!loc.detail.empty(), "a refusal nobody can read is not much of a refusal");
}

TEST(a_footprint_straddling_two_zones_is_a_fault) {
  // Half on taxiway A, half on the shoulder: the tyres disagree.
  const Localization loc = at(Pose{{800, 218}, 0.0});
  CHECK(loc.mode == StartMode::Fault);
  CHECK(!loc.footprint.gearConsistent);
}

TEST(cross_track_and_heading_error_are_signed_from_the_line) {
  // Six metres north of the centreline of taxiway A, pointed eight degrees
  // left of it.  North is left when you are heading east, so both are positive.
  const Localization loc = at(Pose{{800, 206}, 8 * kDeg});
  CHECK_NEAR(loc.crossTrack, 6.0);
  CHECK(std::fabs(loc.headingError - 8 * kDeg) < 1e-6);
  CHECK(!loc.onGuidanceLine);
  CHECK(loc.nearestEdge.valid());
}

TEST(sitting_on_the_line_is_inside_the_capture_window) {
  const Localization loc = at(Pose{{1150, 500}, 0.0});
  CHECK_NEAR(loc.crossTrack, 0.0);
  CHECK_NEAR(loc.headingError, 0.0);
  CHECK(loc.onGuidanceLine);
}

TEST(a_nose_in_stand_shows_up_as_a_heading_error_of_180_degrees) {
  // The lead-out line runs north, out of the stand.  Parked facing the
  // terminal, the aircraft is pointed exactly the wrong way -- and that, not a
  // separate flag, is how the pipeline knows to ask for a pushback.
  const Localization pushed = at(Pose{{290, 95}, 90 * kDeg});
  CHECK(pushed.mode == StartMode::Stand);
  CHECK(std::fabs(pushed.headingError) < 1e-6);

  const Localization noseIn = at(Pose{{410, 95}, -90 * kDeg});
  CHECK(noseIn.mode == StartMode::Stand);
  CHECK_MSG(std::fabs(noseIn.headingError) > 0.5 * kPi,
            "the stand lead-out direction must not depend on which way the aircraft faces");
}

TEST(hysteresis_holds_the_mode_across_a_boundary) {
  // One metre onto the taxiway, having been on the apron a moment ago.  With
  // no history this is a taxiway; with history it is still the apron, because
  // a metre of position noise must not flip the planner into capture mode.
  const Pose justInside{{502, 200}, 0.0};
  CHECK(at(justInside).mode == StartMode::TaxiwayCapture);

  const Localization previous = at(Pose{{470, 200}, 0.0});
  CHECK(previous.mode == StartMode::Apron);
  CHECK(at(justInside, a320(), &previous).mode == StartMode::Apron);
}

TEST(hysteresis_gives_way_once_the_aircraft_is_properly_across) {
  const Localization previous = at(Pose{{470, 200}, 0.0});
  CHECK(previous.mode == StartMode::Apron);
  // Well inside taxiway A now: the mode must follow.
  CHECK(at(Pose{{600, 200}, 0.0}, a320(), &previous).mode == StartMode::TaxiwayCapture);
}

TEST(toString_names_every_mode) {
  for (const StartMode mode : {StartMode::Stand, StartMode::Apron, StartMode::TaxiwayCapture,
                               StartMode::Runway, StartMode::Fault})
    CHECK_MSG(std::string(toString(mode)).size() > 1, "every mode needs a printable name");
}
