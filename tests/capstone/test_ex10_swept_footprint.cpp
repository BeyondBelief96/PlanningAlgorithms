#include <algorithm>

#include "capstone/capstone_fixture.hpp"
#include "test_harness.hpp"

using namespace planning::airport;
using capstone::Fixture;

namespace {

PermissionSet permissionsFor(const std::string& text) {
  const maps::Airport& airport = maps::kilo();
  static const TaxiGraph gated = buildGatedGraph(airport.graph, airport.zones);
  return buildPermissions(gated, airport.zones, parseClearance(text));
}

bool has(const SweepResult& result, SweepViolation::Kind kind) {
  for (const SweepViolation& v : result.violations)
    if (v.kind == kind) return true;
  return false;
}

const char* kDeparture = "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27";

}  // namespace

TEST(an_empty_path_passes) {
  // A capture-window merge plans no motion, and there is nothing to sweep.
  const SweepResult result = validateSweep(maps::kilo().zones, a320(), Path{}, ZoneClass::Taxiway,
                                           permissionsFor(kDeparture), true);
  CHECK(result.ok);
  CHECK(result.violations.empty());
}

TEST(taxiing_down_the_centreline_is_clean) {
  const Path path = straightPath(Pose{{600, 200}, 0.0}, 300.0);
  const SweepResult result = validateSweep(maps::kilo().zones, a320(), path, ZoneClass::Taxiway,
                                           permissionsFor(kDeparture), false);
  CHECK_MSG(result.ok, result.violations.empty() ? "" : result.violations.front().what);
}

TEST(a_tyre_on_the_shoulder_is_reported_as_such) {
  // Thirteen metres left of the centreline: the wing was always over the
  // shoulder, but the left main gear is now on it too, and a shoulder does not
  // carry weight.
  const Path path = straightPath(Pose{{600, 213}, 0.0}, 200.0);
  const SweepResult result = validateSweep(maps::kilo().zones, a320(), path, ZoneClass::Taxiway,
                                           permissionsFor(kDeparture), false);
  CHECK(!result.ok);
  CHECK(has(result, SweepViolation::Kind::GearOnShoulder));
}

TEST(a_tyre_off_the_pavement_altogether_is_a_different_report) {
  const Path path = straightPath(Pose{{600, 235}, 0.0}, 200.0);
  const SweepResult result = validateSweep(maps::kilo().zones, a320(), path, ZoneClass::Taxiway,
                                           permissionsFor(kDeparture), false);
  CHECK(!result.ok);
  CHECK(has(result, SweepViolation::Kind::GearOffPavement));
}

TEST(the_outline_crossing_a_holding_position_is_a_hard_reject) {
  // Up taxiway E toward runway 27, which this clearance says to hold short of.
  const Path path = straightPath(Pose{{2300, 390}, 0.5 * kPi}, 60.0);
  const SweepResult result = validateSweep(maps::kilo().zones, a320(), path, ZoneClass::Taxiway,
                                           permissionsFor(kDeparture), false);
  CHECK(!result.ok);
  CHECK(has(result, SweepViolation::Kind::HoldShortCrossed));
}

TEST(the_centreline_can_be_clear_while_the_outline_is_not) {
  // The path stops ten metres short of the line.  The reference point never
  // reaches it -- but the nose is 12.6 m ahead of the reference point, and the
  // nose is what matters.
  const Path path = straightPath(Pose{{2300, 395}, 0.5 * kPi}, 20.0);
  CHECK(path.endPose().p.y < 425.0);
  const SweepResult result = validateSweep(maps::kilo().zones, a320(), path, ZoneClass::Taxiway,
                                           permissionsFor(kDeparture), false);
  CHECK_MSG(!result.ok, "testing the centreline instead of the outline misses this");
  CHECK(has(result, SweepViolation::Kind::HoldShortCrossed));
}

TEST(a_clearance_to_cross_opens_exactly_that_runway) {
  // Straight across runway 36 on taxiway B.  With the crossing cleared this is
  // fine; without it, it is the worst thing the planner could produce.
  const Path path = straightPath(Pose{{1450, 400}, 0.0}, 300.0);

  const SweepResult cleared = validateSweep(maps::kilo().zones, a320(), path, ZoneClass::Taxiway,
                                            permissionsFor(kDeparture), false);
  CHECK_MSG(cleared.ok, cleared.violations.empty() ? "" : cleared.violations.front().what);

  const SweepResult uncleared =
      validateSweep(maps::kilo().zones, a320(), path, ZoneClass::Taxiway,
                    permissionsFor("TAXI TO RUNWAY 27 VIA B E HOLD SHORT RUNWAY 27"), false);
  CHECK(!uncleared.ok);
  CHECK(has(uncleared, SweepViolation::Kind::HoldShortCrossed) ||
        has(uncleared, SweepViolation::Kind::RunwayEntered));
}

TEST(off_graph_motion_may_not_change_zone) {
  // Out of the apron and onto taxiway A.  As an on-graph route that is
  // ordinary; as free-space motion it is the thing the whole design forbids.
  const Path path = straightPath(Pose{{420, 200}, 0.0}, 200.0);

  const SweepResult onGraph = validateSweep(maps::kilo().zones, a320(), path, ZoneClass::Apron,
                                            permissionsFor(kDeparture), false);
  CHECK(onGraph.ok);

  const SweepResult offGraph = validateSweep(maps::kilo().zones, a320(), path, ZoneClass::Apron,
                                             permissionsFor(kDeparture), true);
  CHECK(!offGraph.ok);
  CHECK(has(offGraph, SweepViolation::Kind::LeftStartZone));
}

TEST(stand_to_apron_is_the_one_permitted_free_space_transition) {
  const Path path = straightPath(Pose{{290, 95}, 0.5 * kPi}, 80.0);
  const SweepResult result = validateSweep(maps::kilo().zones, a320(), path, ZoneClass::Stand,
                                           permissionsFor(kDeparture), true);
  CHECK_MSG(result.ok, result.violations.empty() ? "" : result.violations.front().what);
}

TEST(a_wingtip_too_close_to_a_structure_is_a_violation) {
  // Taxiing along the front of the terminal at the south edge of stand 2.  The
  // gear is on pavement the whole way; the wing is not.
  const Path path = straightPath(Pose{{200, 47}, 0.0}, 200.0);
  const SweepResult result = validateSweep(maps::kilo().zones, a320(), path, ZoneClass::Stand,
                                           permissionsFor(kDeparture), true);
  CHECK(!result.ok);
  CHECK(has(result, SweepViolation::Kind::WingtipConflict));
}

TEST(one_report_per_problem_not_one_per_sample) {
  const Path path = straightPath(Pose{{600, 235}, 0.0}, 400.0);
  const SweepResult result = validateSweep(maps::kilo().zones, a320(), path, ZoneClass::Taxiway,
                                           permissionsFor(kDeparture), false);
  CHECK(!result.ok);
  CHECK_MSG(result.violations.size() < 10,
            "four hundred identical violations are not four hundred pieces of information");
}

TEST(toString_names_every_violation) {
  for (const SweepViolation::Kind kind :
       {SweepViolation::Kind::GearOffPavement, SweepViolation::Kind::GearOnShoulder,
        SweepViolation::Kind::LeftStartZone, SweepViolation::Kind::WingtipConflict,
        SweepViolation::Kind::HoldShortCrossed, SweepViolation::Kind::RunwayEntered})
    CHECK(std::string(toString(kind)).size() > 1);
}
