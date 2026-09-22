// Exercise 08 needs no map: it is pure geometry between two poses.  Every test
// here builds its own candidate, so this file passes as soon as Exercise 08
// does, whatever state the rest of the pipeline is in.
#include <cmath>

#include "planning/airport/taxi_planner.hpp"
#include "test_harness.hpp"

using namespace planning::airport;

namespace {

constexpr double kDeg = kPi / 180.0;

MergeCandidate at(double x, double y, double headingDegrees) {
  MergeCandidate c;
  c.target = Pose{{x, y}, headingDegrees * kDeg};
  c.leadIn = 200.0;
  return c;
}

MergeParams taxiwayParams() {
  MergeParams p = paramsFor(StartMode::TaxiwayCapture, a320());
  p.step = 1.0;
  return p;
}

// Every merge must land exactly on the pose the candidate asked for -- the
// route is concatenated at that point, and a metre of gap there is a metre the
// controller has to invent.
void checkLandsOn(const MergePath& merge, const MergeCandidate& candidate) {
  CHECK(merge.found);
  CHECK(!merge.path.empty());
  const Pose end = merge.path.endPose();
  CHECK_MSG(distance(end.p, candidate.target.p) < 1e-3,
            "ends " + std::to_string(distance(end.p, candidate.target.p)) + " m from the target");
  CHECK_MSG(std::fabs(wrapAngle(end.heading - candidate.target.heading)) < 1e-3,
            "ends " + std::to_string(wrapAngle(end.heading - candidate.target.heading) / kDeg) +
                " degrees off the target heading");
}

}  // namespace

TEST(the_parameters_change_with_the_mode) {
  const AircraftModel jet = a320();
  CHECK(paramsFor(StartMode::Apron, jet).allowHybridAStar);
  CHECK(paramsFor(StartMode::Stand, jet).allowHybridAStar);
  CHECK_MSG(!paramsFor(StartMode::TaxiwayCapture, jet).allowHybridAStar,
            "on a taxiway you rejoin the line or you stop; there is no free-space search");
  CHECK_MSG(!paramsFor(StartMode::Runway, jet).allowHybridAStar,
            "on a runway there is no free-space search either");
  CHECK(paramsFor(StartMode::Apron, jet).preferredRadius <
        paramsFor(StartMode::Runway, jet).preferredRadius);
  CHECK(paramsFor(StartMode::Apron, jet).minRadius >= jet.minTurnRadius - 1e-9);
}

TEST(sitting_on_the_line_needs_no_plan_at_all) {
  const MergeCandidate candidate = at(200, 0, 0);
  const MergePath merge = planMerge(Pose{{0, 0}, 0.0}, candidate, taxiwayParams());
  CHECK(merge.found);
  CHECK(merge.method == MergeMethod::CaptureWindow);
  CHECK_NEAR(merge.path.length(), 200.0);
  checkLandsOn(merge, candidate);
}

TEST(the_capture_window_has_edges) {
  const MergeParams params = taxiwayParams();
  // Just outside the cross-track limit.
  CHECK(!planCaptureWindow(Pose{{0, params.captureCrossTrack + 0.5}, 0.0}, at(200, 0, 0), params)
             .found);
  // Just outside the heading limit.
  CHECK(
      !planCaptureWindow(Pose{{0, 0}, params.captureHeading + 0.01}, at(200, 0, 0), params).found);
  // And a merge point behind us is not a capture, it is a mistake.
  CHECK(!planCaptureWindow(Pose{{300, 0}, 0.0}, at(200, 0, 0), params).found);
}

TEST(straight_then_turn_recovers_the_geometry_it_was_built_from) {
  // Drive 100 m straight, then turn left 45 degrees at a radius of 50.  The
  // solver is given only the two end poses and must find that run and radius.
  const Pose start{{0, 0}, 0.0};
  const Pose corner{{100, 0}, 0.0};
  const Path arc = arcPath(corner, 50.0, 45 * kDeg, 1.0);
  const Pose target = arc.endPose();

  MergeCandidate candidate;
  candidate.target = target;
  const MergePath merge = planStraightThenTurn(start, candidate, taxiwayParams());
  CHECK(merge.found);
  CHECK(merge.method == MergeMethod::StraightThenTurn);
  CHECK_NEAR(merge.path.length(), 100.0 + 50.0 * 45 * kDeg);
  checkLandsOn(merge, candidate);
}

TEST(straight_then_turn_refuses_to_drive_backwards) {
  // The same turn, but the target is behind the aircraft: the closed form has
  // a solution with a negative straight, and it is not one you can fly.
  const MergeCandidate candidate = at(-100, 20, 30);
  CHECK(!planStraightThenTurn(Pose{{0, 0}, 0.0}, candidate, taxiwayParams()).found);
}

TEST(straight_then_turn_refuses_a_radius_below_the_minimum) {
  MergeParams params = taxiwayParams();
  params.minRadius = 200.0;
  const Pose corner{{100, 0}, 0.0};
  MergeCandidate candidate;
  candidate.target = arcPath(corner, 50.0, 45 * kDeg, 1.0).endPose();
  CHECK(!planStraightThenTurn(Pose{{0, 0}, 0.0}, candidate, params).found);
}

TEST(an_s_curve_closes_a_parallel_offset) {
  // Six metres left of the line and eight degrees off it -- the taxiway
  // capture case, and exactly what an S-curve is for.  A single arc cannot do
  // it without driving backwards first.
  const Pose start{{0, 6}, 8 * kDeg};
  const MergeCandidate candidate = at(200, 0, 0);
  const MergeParams params = taxiwayParams();

  CHECK(!planStraightThenTurn(start, candidate, params).found);
  const MergePath merge = planSCurve(start, candidate, params);
  CHECK(merge.found);
  CHECK(merge.method == MergeMethod::SCurve);
  checkLandsOn(merge, candidate);
  CHECK_MSG(merge.path.maxAbsCurvature() <= 1.0 / params.minRadius + 1e-9,
            "the arcs must respect the minimum radius");
  CHECK_MSG(planMerge(start, candidate, params).method == MergeMethod::SCurve,
            "the ladder should stop here rather than reach for Dubins");
}

TEST(an_s_curve_is_only_for_roughly_parallel_lines) {
  const MergeParams params = taxiwayParams();
  const MergeCandidate candidate = at(200, 0, 0);
  CHECK(!planSCurve(Pose{{0, 6}, 40 * kDeg}, candidate, params).found);
  // And it needs somewhere to go: a target behind the aircraft is not an
  // S-curve either.
  CHECK(!planSCurve(Pose{{300, 6}, 0.0}, candidate, params).found);
}

TEST(a_diverging_heading_wants_an_intercept) {
  // Forty metres off the line and pointed away from it.  There is no straight
  // then arc, and no S-curve; turning to an intercept angle and running in is
  // what a pilot does.
  const Pose start{{0, 40}, 40 * kDeg};
  const MergeCandidate candidate = at(400, 0, 0);
  const MergeParams params = taxiwayParams();

  CHECK(!planStraightThenTurn(start, candidate, params).found);
  CHECK(!planSCurve(start, candidate, params).found);
  const MergePath merge = planIntercept(start, candidate, params);
  CHECK(merge.found);
  CHECK(merge.method == MergeMethod::Intercept);
  checkLandsOn(merge, candidate);
}

TEST(dubins_is_the_last_resort_and_it_still_lands_exactly) {
  const Pose start{{0, 0}, 0.0};
  const MergeCandidate candidate = at(60, 60, 180);
  const MergeParams params = taxiwayParams();
  const MergePath merge = planDubinsMerge(start, candidate, params);
  CHECK(merge.found);
  CHECK(merge.method == MergeMethod::Dubins);
  checkLandsOn(merge, candidate);
}

TEST(a_loop_is_not_a_merge) {
  // The merge point is five metres *behind* the aircraft on the same line.
  // Dubins will happily answer with a full circle; a taxiing aeroplane will
  // not, and the loop-rejection filter is what says so.
  const Pose start{{0, 0}, 0.0};
  const MergeCandidate candidate = at(-5, 0, 0);
  const MergeParams params = taxiwayParams();
  const MergePath merge = planMerge(start, candidate, params);
  CHECK_MSG(!merge.found, "the ladder should refuse rather than plan a loop");
}

TEST(the_ladder_prefers_the_simplest_rung_that_works) {
  const MergeParams params = taxiwayParams();
  // On the line.
  CHECK(planMerge(Pose{{0, 0}, 0.0}, at(200, 0, 0), params).method == MergeMethod::CaptureWindow);
  // One turn away.
  MergeCandidate oneTurn;
  oneTurn.target = arcPath(Pose{{100, 0}, 0.0}, 60.0, 30 * kDeg, 1.0).endPose();
  CHECK(planMerge(Pose{{0, 0}, 0.0}, oneTurn, params).method == MergeMethod::StraightThenTurn);
  // Parallel but offset.
  CHECK(planMerge(Pose{{0, 5}, 0.0}, at(300, 0, 0), params).method == MergeMethod::SCurve);
}

TEST(toString_names_every_method) {
  for (const MergeMethod method :
       {MergeMethod::None, MergeMethod::CaptureWindow, MergeMethod::StraightThenTurn,
        MergeMethod::SCurve, MergeMethod::Intercept, MergeMethod::Dubins, MergeMethod::HybridAStar})
    CHECK(std::string(toString(method)).size() > 1);
}
