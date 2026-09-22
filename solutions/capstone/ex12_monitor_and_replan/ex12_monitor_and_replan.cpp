// Reference solution -- Exercise 12: the geofence monitor and replanning
// (Steps 11 and 12).
//
// The monitor is the only piece of the capstone that is deliberately stupid.
// It does not know about the graph, the route, the clearance route labels, the
// cost function or the merge ladder.  It knows the zone layer, the permission
// set, where the aircraft is and where it is pointed -- and that is the whole
// point.  A safety net you can read in one sitting is worth more than a clever
// one you cannot.
#include <algorithm>
#include <cmath>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {
namespace {

bool authorized(const std::vector<std::string>& idents, const std::set<std::string>& enterable) {
  for (const std::string& id : idents)
    if (enterable.count(id) != 0) return true;
  return false;
}

// Constant speed, constant steering: the dead-reckoning a monitor is allowed.
Pose project(const Pose& pose, double distance, double curvature) {
  if (std::fabs(curvature) < 1e-6) return Pose{pose.p + pose.forward() * distance, pose.heading};
  const double radius = 1.0 / curvature;
  DubinsSegment arc;
  arc.isArc = true;
  arc.signedRadius = radius;
  arc.sweep = distance * curvature;
  arc.length = std::fabs(distance);
  return advance(pose, arc);
}

}  // namespace

MonitorReport geofenceMonitor(const ZoneLayer& layer, const AircraftModel& aircraft,
                              const VehicleState& state, const PermissionSet& permissions,
                              double horizonSeconds, double stepSeconds) {
  MonitorReport report;
  const double step = std::max(stepSeconds, 0.05);

  for (double t = 0.0; t <= horizonSeconds + 1e-9; t += step) {
    const Pose pose = project(state.pose, state.speed * t, state.curvature);
    const Polygon outline = aircraft.footprint(pose);
    const Aabb box = boundsOf(outline);

    const auto trip = [&](std::string reason) {
      report.verdict = MonitorVerdict::Stop;
      report.reason = std::move(reason);
      report.timeToViolation = t;
      report.where = pose.p;
    };

    for (int id : layer.candidates(box)) {
      const ZonePolygon& poly = layer.polygon(id);
      if (poly.overlay) continue;
      const bool runway = poly.zone == ZoneClass::Runway || poly.zone == ZoneClass::RunwayProtected;
      if (!runway && poly.zone != ZoneClass::Forbidden) continue;
      if (runway && authorized(poly.idents, permissions.enterableRunways)) continue;
      if (!polygonsOverlap(outline, poly.outline)) continue;
      trip(std::string(runway ? "projected into " : "projected into forbidden area ") + poly.name);
      return report;
    }

    for (int id : layer.holdShortCandidates(box)) {
      const HoldShortLine& line = layer.holdShortLine(id);
      if (authorized(line.protects, permissions.enterableRunways)) continue;
      if (!segmentIntersectsPolygon(outline, line.segment)) continue;
      trip("projected across " + line.name);
      return report;
    }
  }
  return report;
}

ReplanDecision shouldReplan(const ReplanTriggers& triggers, double speed, double crossTrackLimit,
                            double periodSeconds, double commitSeconds) {
  ReplanDecision decision;
  // Replanning from the current pose while keeping the committed prefix is what
  // stops the path jumping under the controller.  A monitor intervention is the
  // exception: it has already commanded a stop, so nothing is committed.
  decision.commitDistance = std::max(0.0, speed * commitSeconds);

  if (triggers.monitorIntervened) {
    decision.replan = true;
    decision.trigger = "monitor intervention";
    decision.commitDistance = 0.0;
  } else if (triggers.newClearance) {
    decision.replan = true;
    decision.trigger = "new clearance";
  } else if (triggers.newObstacle) {
    decision.replan = true;
    decision.trigger = "new obstacle";
  } else if (std::fabs(triggers.crossTrackError) > crossTrackLimit) {
    decision.replan = true;
    decision.trigger = "cross-track error";
  } else if (triggers.secondsSinceLastPlan >= periodSeconds) {
    decision.replan = true;
    decision.trigger = "periodic";
  }
  return decision;
}

Route spliceRoute(const Route& committed, double commitS, const Route& fresh) {
  Route out;
  const double cut = std::clamp(commitS, 0.0, committed.path.length());

  for (const PathSample& sample : committed.path.samples) {
    if (sample.s > cut) break;
    out.path.samples.push_back(sample);
  }
  if (cut > 0.0 && (out.path.samples.empty() || out.path.samples.back().s < cut - 1e-9))
    out.path.samples.push_back(committed.path.at(cut));

  const double base = out.path.length();
  for (const PathSample& sample : fresh.path.samples) {
    PathSample shifted = sample;
    shifted.s += base;
    if (!out.path.samples.empty() && distance(out.path.samples.back().p, shifted.p) < 1e-6 &&
        sample.s == 0.0)
      continue;
    out.path.samples.push_back(shifted);
  }

  const auto keep = [&](auto& into, const auto& from, double offset, double limit) {
    for (const auto& item : from) {
      if (item.s > limit + 1e-9) continue;
      auto copy = item;
      copy.s += offset;
      into.push_back(copy);
    }
  };
  keep(out.events, committed.events, 0.0, cut);
  keep(out.stops, committed.stops, 0.0, cut);
  keep(out.speed, committed.speed, 0.0, cut);
  keep(out.events, fresh.events, base, fresh.path.length());
  keep(out.stops, fresh.stops, base, fresh.path.length());
  keep(out.speed, fresh.speed, base, fresh.path.length());

  out.graphRoute = fresh.graphRoute;
  out.mergeLength = base + fresh.mergeLength;
  out.cost = out.path.length();
  return out;
}

}  // namespace planning::airport
