// Exercise 08 -- the merge ladder, simplest first (Step 8).
//
// Read exercises/capstone/ex08_merge_ladder/README.md first.
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

const char* toString(MergeMethod method) {
  // TODO(you): one short phrase per method, for the demo.
  (void)method;
  return "?";
}

MergeParams paramsFor(StartMode mode, const AircraftModel& aircraft) {
  // TODO(you): the same ladder, tuned per mode.  Apron and stand: tighter
  // radii, a narrower capture window, and hybrid A* available.  Taxiway
  // capture: no free-space search at all -- you are on a taxiway, so you
  // rejoin the line or you stop.  Runway: a large radius, and graph following
  // only.
  (void)mode;
  (void)aircraft;
  return MergeParams{};
}

MergePath planCaptureWindow(const Pose& start, const MergeCandidate& candidate,
                            const MergeParams& params) {
  // TODO(you): if the cross-track and heading errors are both inside the
  // window, there is nothing to plan.  Return the guidance line itself, from
  // where the aircraft projects onto it to the merge point.  Fail when the
  // merge point is behind us.
  (void)start;
  (void)candidate;
  (void)params;
  return MergePath{};
}

MergePath planStraightThenTurn(const Pose& start, const MergeCandidate& candidate,
                               const MergeParams& params) {
  // TODO(you): one straight of length `run`, then one arc of signed radius R
  // through `sweep`.  An arc through sweep displaces the aircraft by
  //
  //     R * (sin psi1 - sin psi0,  cos psi0 - cos psi1)
  //
  // so  delta = run * u0 + R * w  is two linear equations in two unknowns and
  // Cramer's rule solves it.  Reject a negative run, a radius that turns the
  // wrong way, and a radius below the minimum.
  (void)start;
  (void)candidate;
  (void)params;
  return MergePath{};
}

MergePath planSCurve(const Pose& start, const MergeCandidate& candidate,
                     const MergeParams& params) {
  // TODO(you): two opposite arcs of equal radius, then a straight.  Only for
  // roughly parallel headings: reject when the heading error exceeds
  // params.sCurveHeadingTolerance.
  //
  // Working in the line frame, with e the cross-track offset and phi the
  // heading error, the heading alpha at the end of the first arc satisfies
  //
  //     cos(alpha) = (e / R1 + cos(phi) + 1) / 2
  //
  // where R1 is the first signed radius -- turn *toward* the line first.  The
  // trailing straight closes whatever is left along the line.
  (void)start;
  (void)candidate;
  (void)params;
  return MergePath{};
}

MergePath planIntercept(const Pose& start, const MergeCandidate& candidate,
                        const MergeParams& params) {
  // TODO(you): four pieces.  Turn to a 30-45 degree intercept on the side the
  // line is; run straight until the closing arc can take up exactly what is
  // left of the offset; roll out onto the line; track it to the merge point.
  //
  // The one piece of arithmetic worth writing down: rolling out of a turn of
  // alpha at radius r moves you r * (1 - cos alpha) toward the line all by
  // itself, so the straight only has to close the rest.
  (void)start;
  (void)candidate;
  (void)params;
  return MergePath{};
}

MergePath planDubinsMerge(const Pose& start, const MergeCandidate& candidate,
                          const MergeParams& params) {
  // TODO(you): dubinsShortestPath() is given (see geometry.hpp).  Try the
  // preferred radius, then the minimum.  Apply the loop-rejection filter: a
  // Dubins solution may wind round twice, and a taxi manoeuvre may not.
  (void)start;
  (void)candidate;
  (void)params;
  return MergePath{};
}

MergePath planMerge(const Pose& start, const MergeCandidate& candidate, const MergeParams& params) {
  // TODO(you): the five above, in order, first one that succeeds.  The order
  // is the design: a planner that reaches for Dubins first produces paths that
  // are valid and look nothing like taxiing.
  (void)start;
  (void)candidate;
  (void)params;
  return MergePath{};
}

}  // namespace planning::airport
