// Reference solution -- Exercise 08: the merge ladder (Step 8).
//
// Five ways to get from a pose onto a line, ordered the way a pilot would
// reach for them.  The first four are closed form; only the last is a search.
// The ordering is the point: a planner that reaches for Dubins first produces
// paths that are valid and look nothing like taxiing.
#include <algorithm>
#include <cmath>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {
namespace {

MergePath fail() { return MergePath{}; }

MergePath succeed(MergeMethod method, Path path, const MergeParams& params, std::string detail) {
  MergePath out;
  if (path.samples.empty() && method != MergeMethod::CaptureWindow) return out;
  if (path.totalTurning() > params.maxTotalTurning) return out;  // a loop, not a merge
  out.found = true;
  out.method = method;
  out.path = std::move(path);
  out.cost = out.path.length() + 20.0 * out.path.totalTurning();
  out.detail = std::move(detail);
  return out;
}

}  // namespace

const char* toString(MergeMethod method) {
  switch (method) {
    case MergeMethod::None:
      return "none";
    case MergeMethod::CaptureWindow:
      return "capture window";
    case MergeMethod::StraightThenTurn:
      return "straight then turn";
    case MergeMethod::SCurve:
      return "S-curve";
    case MergeMethod::Intercept:
      return "intercept";
    case MergeMethod::Dubins:
      return "Dubins";
    case MergeMethod::HybridAStar:
      return "hybrid A*";
  }
  return "none";
}

MergeParams paramsFor(StartMode mode, const AircraftModel& aircraft) {
  MergeParams p;
  p.minRadius = aircraft.minTurnRadius;
  p.preferredRadius = aircraft.preferredRadius;
  switch (mode) {
    case StartMode::Stand:
    case StartMode::Apron:
      // Tight quarters and slow speeds: smaller radii, and the free-space
      // search is available because the apron is where off-graph motion lives.
      p.preferredRadius = std::max(aircraft.minTurnRadius * 1.2, 25.0);
      p.captureCrossTrack = 1.5;
      p.allowHybridAStar = true;
      break;
    case StartMode::TaxiwayCapture:
      // On a taxiway you rejoin the line or you stop.  No free-space search.
      p.allowHybridAStar = false;
      break;
    case StartMode::Runway:
      p.preferredRadius = std::max(aircraft.preferredRadius, 60.0);
      p.captureCrossTrack = 3.0;
      p.allowHybridAStar = false;
      break;
    case StartMode::Fault:
      break;
  }
  return p;
}

MergePath planCaptureWindow(const Pose& start, const MergeCandidate& candidate,
                            const MergeParams& params) {
  const Pose line = candidate.target;
  if (std::fabs(crossTrack(line, start.p)) > params.captureCrossTrack) return fail();
  if (std::fabs(wrapAngle(start.heading - line.heading)) > params.captureHeading) return fail();

  // Already tracking the line: there is nothing to plan.  Hand the controller
  // the line itself, starting from where the aircraft projects onto it.
  const double along = alongTrack(line, start.p);
  if (along > 0.0) return fail();  // the merge point is behind us
  const Pose entry{line.p + line.forward() * along, line.heading};
  return succeed(MergeMethod::CaptureWindow, straightPath(entry, -along, params.step), params,
                 "already inside the capture window");
}

MergePath planStraightThenTurn(const Pose& start, const MergeCandidate& candidate,
                               const MergeParams& params) {
  const Pose target = candidate.target;
  const Vec2 delta = target.p - start.p;
  const double sweep = wrapAngle(target.heading - start.heading);
  const Vec2 u0 = start.forward();

  if (std::fabs(sweep) < 1e-6) {
    // No turn at all: the target must lie straight ahead.
    if (std::fabs(cross(u0, delta)) > 0.05) return fail();
    const double run = dot(u0, delta);
    if (run < 0.0) return fail();
    return succeed(MergeMethod::StraightThenTurn, straightPath(start, run, params.step), params,
                   "straight run, no turn needed");
  }

  // An arc of signed radius R through `sweep` displaces the aircraft by
  //     R * (sin psi1 - sin psi0,  cos psi0 - cos psi1)
  // so  delta = run * u0 + R * w  is two equations in the two unknowns.
  const Vec2 w{std::sin(target.heading) - std::sin(start.heading),
               std::cos(start.heading) - std::cos(target.heading)};
  const double den = cross(u0, w);
  if (std::fabs(den) < 1e-9) return fail();
  const double run = cross(delta, w) / den;
  const double radius = cross(u0, delta) / den;

  if (run < -1e-6) return fail();                      // the straight goes backwards
  if ((radius > 0.0) != (sweep > 0.0)) return fail();  // turning the wrong way
  if (std::fabs(radius) < params.minRadius - 1e-6) return fail();

  const Pose corner{start.p + u0 * std::max(run, 0.0), start.heading};
  Path path = concatenatePaths({straightPath(start, std::max(run, 0.0), params.step),
                                arcPath(corner, radius, sweep, params.step)});
  return succeed(MergeMethod::StraightThenTurn, std::move(path), params,
                 "straight then one arc of radius " + std::to_string(std::fabs(radius)));
}

MergePath planSCurve(const Pose& start, const MergeCandidate& candidate,
                     const MergeParams& params) {
  const Pose line = candidate.target;
  const double phi = wrapAngle(start.heading - line.heading);
  if (std::fabs(phi) > params.sCurveHeadingTolerance) return fail();

  const double e = crossTrack(line, start.p);     // offset from the line, left positive
  const double run = -alongTrack(line, start.p);  // distance still to cover along the line
  if (run <= 0.0) return fail();
  if (std::fabs(e) < 1e-9) return fail();  // nothing to correct: that is a capture

  // Turn toward the line first, then back.  Working in the line frame, the
  // heading after the first arc satisfies
  //     cos(alpha) = (e / R1 + cos phi + 1) / 2
  // and the trailing straight closes whatever is left along the line.
  const double r = std::max(params.preferredRadius, params.minRadius);
  const double first = (e > 0.0 ? -r : r);
  const double c = (e / first + std::cos(phi) + 1.0) * 0.5;
  if (c < -1.0 || c > 1.0) return fail();
  const double alpha = (first > 0.0 ? 1.0 : -1.0) * std::acos(c);
  const double sweep1 = alpha - phi;
  const double sweep2 = -alpha;
  if ((sweep1 > 0.0) != (first > 0.0)) return fail();
  if (std::fabs(sweep1) < 1e-9 || std::fabs(sweep2) < 1e-9) return fail();

  const double tail = run - 2.0 * first * std::sin(alpha) + first * std::sin(phi);
  if (tail < -1e-6) return fail();

  Path a1 = arcPath(start, first, sweep1, params.step);
  if (a1.empty()) return fail();
  Path a2 = arcPath(a1.endPose(), -first, sweep2, params.step);
  if (a2.empty()) return fail();
  Path straight = straightPath(a2.endPose(), std::max(tail, 0.0), params.step);
  return succeed(MergeMethod::SCurve, concatenatePaths({a1, a2, straight}), params,
                 "two opposite arcs closing " + std::to_string(std::fabs(e)) + " m of offset");
}

MergePath planIntercept(const Pose& start, const MergeCandidate& candidate,
                        const MergeParams& params) {
  const Pose line = candidate.target;
  const double offset = crossTrack(line, start.p);
  if (std::fabs(offset) < 1e-6) return fail();

  const double r = std::max(params.preferredRadius, params.minRadius);
  const double alpha = params.interceptAngle;
  const double toward = (offset > 0.0 ? -1.0 : 1.0);

  // 1. Turn to a 30-45 degree intercept, on the side the line is.
  const double sweep1 = wrapAngle(line.heading + toward * alpha - start.heading);
  Path turnIn;
  Pose q = start;
  if (std::fabs(sweep1) > 1e-9) {
    turnIn = arcPath(start, sweep1 > 0.0 ? r : -r, sweep1, params.step);
    if (turnIn.empty()) return fail();
    q = turnIn.endPose();
  }

  // 2. Run straight until the closing arc can take up exactly what is left.
  //    Rolling out of a turn of alpha at radius r moves you r (1 - cos alpha)
  //    toward the line all by itself, so that much is already spoken for.
  const double here = crossTrack(line, q.p);
  if ((here > 0.0) != (offset > 0.0)) return fail();  // the first turn overshot
  const double remaining = std::fabs(here) - r * (1.0 - std::cos(alpha));
  if (remaining < -1e-6) return fail();  // too close to intercept at all
  const Path run = straightPath(q, std::max(0.0, remaining) / std::sin(alpha), params.step);
  const Pose beforeRollout = run.empty() ? q : run.endPose();

  // 3. Roll out onto the line...
  const double sweep2 = wrapAngle(line.heading - beforeRollout.heading);
  const Path rollout = arcPath(beforeRollout, sweep2 > 0.0 ? r : -r, sweep2, params.step);
  if (rollout.empty()) return fail();
  const Pose onLine = rollout.endPose();
  if (std::fabs(crossTrack(line, onLine.p)) > 0.05) return fail();

  // 4. ...and track it to the merge point.
  const double tail = -alongTrack(line, onLine.p);
  if (tail < -1e-6) return fail();
  const Path finish = straightPath(onLine, std::max(0.0, tail), params.step);

  return succeed(MergeMethod::Intercept, concatenatePaths({turnIn, run, rollout, finish}), params,
                 "intercept at " + std::to_string(alpha * 180.0 / kPi) + " degrees");
}

MergePath planDubinsMerge(const Pose& start, const MergeCandidate& candidate,
                          const MergeParams& params) {
  for (const double radius :
       {std::max(params.preferredRadius, params.minRadius), params.minRadius}) {
    const DubinsPath dubins = dubinsShortestPath(start, candidate.target, radius);
    if (!dubins.found) continue;
    Path path = renderDubins(start, dubins, params.step);
    if (path.empty()) continue;
    // Loop rejection.  A Dubins solution is allowed to wind round twice; a taxi
    // manoeuvre is not.
    if (path.totalTurning() > params.maxTotalTurning) continue;
    MergePath out = succeed(MergeMethod::Dubins, std::move(path), params,
                            std::string("Dubins word ") + toString(dubins.word));
    if (out.found) return out;
  }
  return fail();
}

MergePath planMerge(const Pose& start, const MergeCandidate& candidate, const MergeParams& params) {
  using Planner = MergePath (*)(const Pose&, const MergeCandidate&, const MergeParams&);
  // Simplest first.  The order is the design.
  static const Planner ladder[] = {planCaptureWindow, planStraightThenTurn, planSCurve,
                                   planIntercept, planDubinsMerge};
  for (Planner plan : ladder) {
    const MergePath result = plan(start, candidate, params);
    if (result.found) return result;
  }
  return fail();
}

}  // namespace planning::airport
