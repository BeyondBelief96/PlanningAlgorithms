#include <algorithm>

#include "capstone/capstone_fixture.hpp"
#include "test_harness.hpp"

using namespace planning::airport;
using capstone::Fixture;

namespace {

constexpr double kDeg = kPi / 180.0;
const char* kHoldShort = "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27";
const char* kLineUp = "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 LINE UP AND WAIT";

PermissionSet permissionsFor(const std::string& text) {
  const maps::Airport& airport = maps::kilo();
  static const TaxiGraph gated = buildGatedGraph(airport.graph, airport.zones);
  return buildPermissions(gated, airport.zones, parseClearance(text));
}

MonitorReport watch(const Pose& pose, double speed, double curvature, const char* clearance) {
  const VehicleState state{pose, speed, curvature};
  return geofenceMonitor(maps::kilo().zones, a320(), state, permissionsFor(clearance));
}

Route straightRoute(double length, int stops) {
  Route r;
  r.path = straightPath(Pose{{0, 0}, 0.0}, length);
  r.events.push_back({EventKind::Departure, 0.0, "start"});
  r.events.push_back({EventKind::Arrival, length, "end"});
  for (int i = 0; i < stops; ++i) r.stops.push_back({length, "stop"});
  r.speed.push_back({0.0, 5.0});
  r.speed.push_back({length, 0.0});
  return r;
}

}  // namespace

TEST(a_stationary_aircraft_in_the_middle_of_a_taxiway_is_clear) {
  const MonitorReport report = watch(Pose{{800, 200}, 0.0}, 0.0, 0.0, kHoldShort);
  CHECK(report.verdict == MonitorVerdict::Clear);
  CHECK(!report.stop());
}

TEST(rolling_at_an_unauthorized_holding_position_commands_a_stop) {
  // Forty metres short of the runway 27 holding position on taxiway E, at
  // taxi speed.  In six seconds the nose is over the line.
  const MonitorReport report = watch(Pose{{2300, 385}, 90 * kDeg}, 8.0, 0.0, kHoldShort);
  CHECK(report.stop());
  CHECK(report.timeToViolation < 6.0);
  CHECK_MSG(report.reason.find("27") != std::string::npos, "name what it was about to hit");
}

TEST(a_clearance_to_enter_makes_the_same_projection_legal) {
  const MonitorReport report = watch(Pose{{2300, 385}, 90 * kDeg}, 8.0, 0.0, kLineUp);
  CHECK(!report.stop());
}

TEST(the_horizon_is_what_makes_it_a_warning_and_not_a_collision_report) {
  // Same place, stopped.  Nothing is projected anywhere, so nothing fires.
  CHECK(!watch(Pose{{2300, 385}, 90 * kDeg}, 0.0, 0.0, kHoldShort).stop());
  // Same place, crawling: the line is still outside the six-second horizon.
  CHECK(!watch(Pose{{2300, 385}, 90 * kDeg}, 0.5, 0.0, kHoldShort).stop());
}

TEST(steering_is_part_of_the_projection) {
  // On taxiway A, rolling east, but with the nose wheel over: in a few seconds
  // this is off the pavement and across the service road.  A monitor that
  // projected a straight line would miss it entirely.
  const MonitorReport turning = watch(Pose{{880, 200}, 0.0}, 12.0, 1.0 / 30.0, kHoldShort);
  CHECK_MSG(turning.stop(), "a curved projection is the whole point of carrying the steering");
  CHECK_MSG(!watch(Pose{{880, 200}, 0.0}, 12.0, 0.0, kHoldShort).stop(),
            "the same speed, straight ahead, is perfectly ordinary taxiing");
}

TEST(a_forbidden_zone_stops_you_just_as_a_runway_does) {
  // Straight at the terminal building.
  const MonitorReport report = watch(Pose{{300, 110}, -90 * kDeg}, 12.0, 0.0, kHoldShort);
  CHECK(report.stop());
  CHECK_MSG(report.reason.find("TERMINAL") != std::string::npos, "name the zone");
}

TEST(an_authorized_crossing_does_not_fire_the_monitor) {
  // Rolling east on taxiway B toward runway 36, which the clearance authorizes.
  CHECK(!watch(Pose{{1480, 400}, 0.0}, 8.0, 0.0, kHoldShort).stop());
  // ...and without that authorization it does.
  CHECK(watch(Pose{{1480, 400}, 0.0}, 8.0, 0.0, "TAXI TO RUNWAY 27 VIA B E HOLD SHORT RUNWAY 27")
            .stop());
}

TEST(every_trigger_replans_and_says_which_one_it_was) {
  ReplanTriggers triggers;
  CHECK(!shouldReplan(triggers, 5.0).replan);

  triggers = ReplanTriggers{};
  triggers.secondsSinceLastPlan = 6.0;
  CHECK(shouldReplan(triggers, 5.0).replan);
  CHECK_EQ(shouldReplan(triggers, 5.0).trigger, std::string("periodic"));

  triggers = ReplanTriggers{};
  triggers.crossTrackError = -4.0;
  CHECK(shouldReplan(triggers, 5.0).replan);
  CHECK_EQ(shouldReplan(triggers, 5.0).trigger, std::string("cross-track error"));

  triggers = ReplanTriggers{};
  triggers.newClearance = true;
  CHECK_EQ(shouldReplan(triggers, 5.0).trigger, std::string("new clearance"));

  triggers = ReplanTriggers{};
  triggers.newObstacle = true;
  CHECK_EQ(shouldReplan(triggers, 5.0).trigger, std::string("new obstacle"));
}

TEST(the_committed_prefix_is_what_stops_the_path_jumping) {
  ReplanTriggers triggers;
  triggers.secondsSinceLastPlan = 6.0;
  const ReplanDecision rolling = shouldReplan(triggers, 10.0);
  CHECK(rolling.replan);
  CHECK_NEAR(rolling.commitDistance, 30.0);

  const ReplanDecision stopped = shouldReplan(triggers, 0.0);
  CHECK_NEAR(stopped.commitDistance, 0.0);
}

TEST(a_monitor_intervention_commits_nothing) {
  ReplanTriggers triggers;
  triggers.monitorIntervened = true;
  triggers.newClearance = true;
  const ReplanDecision decision = shouldReplan(triggers, 10.0);
  CHECK(decision.replan);
  CHECK_EQ(decision.trigger, std::string("monitor intervention"));
  CHECK_MSG(decision.commitDistance == 0.0,
            "the monitor has already commanded a stop; there is nothing to commit to");
}

TEST(splicing_keeps_the_prefix_and_continues_with_the_new_plan) {
  const Route committed = straightRoute(100.0, 1);
  const Route fresh = straightRoute(60.0, 1);
  const Route spliced = spliceRoute(committed, 40.0, fresh);

  CHECK_NEAR(spliced.path.length(), 100.0);
  CHECK_MSG(spliced.stops.size() == 1,
            "the committed stop was beyond the cut and must not survive");
  CHECK_NEAR(AT(spliced.stops, 0).s, 100.0);
}

TEST(splicing_nothing_is_just_the_new_plan) {
  const Route committed = straightRoute(100.0, 1);
  const Route fresh = straightRoute(60.0, 0);
  const Route spliced = spliceRoute(committed, 0.0, fresh);
  CHECK_NEAR(spliced.path.length(), 60.0);
  CHECK(spliced.stops.empty());
}
