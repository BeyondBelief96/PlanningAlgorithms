#include <algorithm>

#include "capstone/capstone_fixture.hpp"
#include "test_harness.hpp"

using namespace planning::airport;
using capstone::Fixture;

namespace {

constexpr double kDeg = kPi / 180.0;
const char* kDeparture = "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27";

// Runs the pipeline as far as Exercise 11 and returns the assembled route.
Route routeFor(const Fixture& f, MergePath* mergeOut = nullptr) {
  const std::vector<MergeCandidate> candidates = generateMergeCandidates(
      f.gated, f.zones(), f.aircraft, f.localization, f.permissions, f.filter, f.costToGo);
  const MergeParams params = paramsFor(f.localization.mode, f.aircraft);
  for (const MergeCandidate& c : candidates) {
    const MergePath merge = planMerge(f.localization.pose, c, params);
    if (!merge.found) continue;
    const std::vector<DirectedEdge> graphRoute =
        extractGraphRoute(f.costToGo, c.edge, c.routeIndex);
    if (graphRoute.empty()) continue;
    if (mergeOut != nullptr) *mergeOut = merge;
    return assembleRoute(f.gated, f.zones(), f.aircraft, merge, graphRoute, f.permissions,
                         SpeedLimits{});
  }
  return Route{};
}

int countEvents(const Route& route, EventKind kind) {
  int n = 0;
  for (const RouteEvent& e : route.events)
    if (e.kind == kind) ++n;
  return n;
}

}  // namespace

TEST(the_route_is_one_curve_from_the_start_to_the_stop) {
  const Fixture f(kDeparture, Pose{{290, 95}, 90 * kDeg});
  MergePath merge;
  const Route route = routeFor(f, &merge);

  CHECK(!route.path.empty());
  CHECK(route.path.length() > 2000.0);
  CHECK_NEAR(route.mergeLength, merge.path.length());
  CHECK_MSG(distance(route.path.startPose().p, merge.path.startPose().p) < 1e-6,
            "the assembled route must begin where the merge begins");
}

TEST(the_corners_are_filleted_and_respect_the_minimum_radius) {
  const Fixture f(kDeparture, Pose{{290, 95}, 90 * kDeg});
  const Route route = routeFor(f);
  const AircraftModel jet = a320();
  CHECK(route.path.maxAbsCurvature() > 0.0);
  CHECK_MSG(route.path.maxAbsCurvature() <= 1.0 / jet.minTurnRadius + 1e-6,
            "a corner taken tighter than the minimum radius is not a corner you can take");
}

TEST(the_soft_gates_become_events) {
  const Fixture f(kDeparture, Pose{{290, 95}, 90 * kDeg});
  const Route route = routeFor(f);
  // Leaving the stand, and leaving the apron for the movement area.
  CHECK(countEvents(route, EventKind::SoftGate) >= 1);
  bool handoff = false;
  for (const RouteEvent& e : route.events)
    if (e.kind == EventKind::SoftGate && e.message.find("ramp") != std::string::npos)
      handoff = true;
  CHECK_MSG(handoff, "the apron/taxiway boundary is a radio call, not just a line");
}

TEST(an_authorized_crossing_is_announced_at_both_ends) {
  const Fixture f(kDeparture, Pose{{290, 95}, 90 * kDeg});
  const Route route = routeFor(f);
  CHECK(countEvents(route, EventKind::RunwayCrossingStart) >= 1);
  CHECK(countEvents(route, EventKind::RunwayCrossingEnd) >= 1);
}

TEST(the_unauthorized_holding_position_becomes_the_one_stop) {
  const Fixture f(kDeparture, Pose{{290, 95}, 90 * kDeg});
  const Route route = routeFor(f);
  CHECK_EQ(route.stops.size(), std::size_t{1});
  CHECK(countEvents(route, EventKind::HoldShort) == 1);
  CHECK_MSG(AT(route.stops, 0).reason.find("HS 27 E") != std::string::npos,
            "name the holding position in the reason");
}

TEST(the_nose_stops_short_of_the_line_not_the_reference_point) {
  const Fixture f(kDeparture, Pose{{290, 95}, 90 * kDeg});
  const AircraftModel jet = a320();
  const SpeedLimits limits;
  const Route route = routeFor(f);

  const Pose end = route.path.endPose();
  const double nose = jet.noseTip(end).y;
  CHECK_MSG(nose <= 425.0, "the nose is past the holding position");
  // Within a few centimetres: the path is sampled at one metre, so the stop
  // arclength can only be as exact as the samples it is interpolated from.
  CHECK_MSG(std::fabs(nose - (425.0 - limits.stopMargin)) < 0.05,
            "nose stopped at y = " + std::to_string(nose) + ", wanted " +
                std::to_string(425.0 - limits.stopMargin));
}

TEST(the_route_stops_where_the_path_stops) {
  const Fixture f(kDeparture, Pose{{290, 95}, 90 * kDeg});
  const Route route = routeFor(f);
  CHECK_NEAR(AT(route.stops, 0).s, route.path.length());
  CHECK_NEAR(route.speedAt(route.path.length()), 0.0);
}

TEST(the_speed_profile_respects_the_zone_limits) {
  const Fixture f(kDeparture, Pose{{290, 95}, 90 * kDeg});
  const Route route = routeFor(f);
  CHECK(!route.speed.empty());
  for (const SpeedPoint& p : route.speed) {
    const ZoneQuery q = zoneAt(f.zones(), route.path.at(p.s).p);
    const double limit = policyFor(q.zone).speedLimit;
    CHECK_MSG(p.v <= limit + 1e-6,
              std::string("v = ") + std::to_string(p.v) + " on " + toString(q.zone));
  }
}

TEST(the_speed_profile_slows_for_the_turns) {
  const Fixture f(kDeparture, Pose{{290, 95}, 90 * kDeg});
  const AircraftModel jet = a320();
  const Route route = routeFor(f);
  for (const SpeedPoint& p : route.speed) {
    const double curvature = std::fabs(route.path.at(p.s).curvature);
    if (curvature < 1e-6) continue;
    const double comfortable = std::sqrt(jet.maxLateralAccel / curvature);
    CHECK_MSG(p.v <= comfortable + 1e-6, "v <= sqrt(a_lat * r) is what makes a turn bearable");
  }
}

TEST(the_speed_profile_brakes_into_the_stop) {
  const Fixture f(kDeparture, Pose{{290, 95}, 90 * kDeg});
  const AircraftModel jet = a320();
  const Route route = routeFor(f);
  const double stop = AT(route.stops, 0).s;
  for (const SpeedPoint& p : route.speed) {
    if (p.s >= stop) continue;
    CHECK_MSG(p.v <= std::sqrt(2.0 * jet.maxDecel * (stop - p.s)) + 1e-6,
              "v^2 = 2 a d, or you are not going to stop in time");
  }
}

TEST(arriving_at_a_stand_needs_no_stop_point) {
  const Fixture f("TAXI TO STAND 2 VIA C B D A CROSS RUNWAY 36", Pose{{1150, 500}, 0.0});
  const Route route = routeFor(f);
  CHECK(!route.path.empty());
  CHECK(route.stops.empty());
  CHECK(countEvents(route, EventKind::Arrival) == 1);
  CHECK_NEAR(route.speedAt(route.path.length()), 0.0);
}
