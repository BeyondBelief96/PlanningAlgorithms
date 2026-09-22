// Reference solution -- Exercise 11: assembling the route (Step 10).
//
// The merge path and the graph route become one curve, with a fillet at every
// corner so that the result is drivable rather than merely correct.  Then the
// curve is annotated: where the radio calls happen, where the aircraft must
// stop, and how fast it may go at every point along the way.
//
// The stop points are the part worth getting right.  The *nose* has to stop
// short of the holding position and the reference point is the main gear
// centre, so the path is truncated by the stop margin **plus** the distance
// from the main gear to the nose.
#include <algorithm>
#include <cmath>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {
namespace {

struct Corner {
  VertexId vertex = kNoVertex;
  double entryS = 0.0;  // arclength where this leg began
  double s = 0.0;       // arclength of the junction itself
};

double speedLimitFor(ZoneClass zone, const SpeedLimits& limits) {
  switch (zone) {
    case ZoneClass::Stand:
      return limits.stand;
    case ZoneClass::Apron:
    case ZoneClass::DeIcing:
      return limits.apron;
    case ZoneClass::Runway:
      return limits.runway;
    case ZoneClass::RunwayProtected:
      return limits.runwayProtected;
    default:
      return limits.taxiway;
  }
}

std::string softGateMessage(const Vertex& v) {
  if (v.innerZone == ZoneClass::Stand || v.outerZone == ZoneClass::Stand)
    return "stand boundary at " + v.name + ": confirm the lead-in line is clear";
  if (v.innerZone == ZoneClass::DeIcing || v.outerZone == ZoneClass::DeIcing)
    return "de-icing pad boundary at " + v.name;
  return "ramp to ground handoff at " + v.name +
         ": confirm the clearance before leaving the non-movement area";
}

}  // namespace

Route assembleRoute(const TaxiGraph& gated, const ZoneLayer& layer, const AircraftModel& aircraft,
                    const MergePath& merge, const std::vector<DirectedEdge>& graphRoute,
                    const PermissionSet& permissions, const SpeedLimits& limits) {
  Route route;
  route.graphRoute = graphRoute;
  const bool haveMerge = merge.found && !merge.path.empty();
  if (graphRoute.empty() && !haveMerge) return route;

  // --- the curve ---------------------------------------------------------
  std::vector<Path> parts;
  if (haveMerge) parts.push_back(merge.path);

  Pose cursor;
  if (haveMerge)
    cursor = merge.path.endPose();
  else
    cursor = gated.poseAlong(graphRoute.front(), 0.0);

  std::vector<Corner> corners;
  double travelled = haveMerge ? merge.path.length() : 0.0;
  route.mergeLength = travelled;

  for (std::size_t i = 0; i < graphRoute.size(); ++i) {
    const DirectedEdge& d = graphRoute[i];
    const double heading = gated.heading(d);
    const double entryS = travelled;
    double remaining = std::max(0.0, alongTrack(Pose{cursor.p, heading}, gated.headPoint(d)));

    // How much of this leg is eaten by the fillet into the next one?
    double fillet = 0.0;
    double radius = 0.0;
    double sweep = 0.0;
    if (i + 1 < graphRoute.size()) {
      sweep = wrapAngle(gated.heading(graphRoute[i + 1]) - heading);
      if (std::fabs(sweep) > 1e-6) {
        const double halfTan = std::tan(0.5 * std::fabs(sweep));
        const double room = std::min(remaining, gated.length(graphRoute[i + 1].edge));
        // The minimum radius, not the preferred one.  A fillet of radius r cuts
        // the corner by 0.41 r on a right-angle turn, and a 30 m taxiway simply
        // has no room for a gentle arc -- which is why a taxiing aeroplane
        // turns a junction as tightly as it can and the gear tracks stay on.
        radius = aircraft.minTurnRadius;
        fillet = radius * halfTan;
        if (fillet > room) fillet = 0.0;  // no room for an arc: take the corner sharp
      }
    }

    const double straight = std::max(0.0, remaining - fillet);
    if (straight > 1e-9) {
      parts.push_back(straightPath(Pose{cursor.p, heading}, straight, kDefaultStep));
      cursor = parts.back().endPose();
      travelled += straight;
    } else {
      cursor = Pose{cursor.p, heading};
    }

    corners.push_back(Corner{gated.head(d), entryS, travelled + fillet});

    if (fillet > 1e-9) {
      parts.push_back(arcPath(cursor, sweep > 0.0 ? radius : -radius, sweep, kDefaultStep));
      cursor = parts.back().endPose();
      travelled += parts.back().length();
    } else if (i + 1 < graphRoute.size()) {
      cursor = Pose{cursor.p, gated.heading(graphRoute[i + 1])};
    }
  }
  route.path = concatenatePaths(parts);

  // --- events ------------------------------------------------------------
  route.events.push_back({EventKind::Departure, 0.0, "start"});
  if (haveMerge)
    route.events.push_back({EventKind::MergeComplete, route.mergeLength,
                            std::string("on the guidance line, via ") + toString(merge.method)});

  double truncateAt = route.path.length();
  bool truncated = false;
  for (std::size_t i = 0; i < corners.size(); ++i) {
    const Corner& corner = corners[i];
    const Vertex& v = gated.vertex(corner.vertex);
    if (v.gate == GateKind::None) continue;

    if (v.gate == GateKind::Soft) {
      route.events.push_back({EventKind::SoftGate, corner.s, softGateMessage(v)});
      continue;
    }

    // A hard gate.  Which way through it?  The zone of the edge we arrived on
    // says it all: arriving on the inner side means we are about to go in.
    const bool inbound = gated.edge(graphRoute[i].edge).zone == v.innerZone;
    if (!inbound) {
      route.events.push_back({EventKind::RunwayCrossingEnd, corner.s, "clear of " + v.name});
      continue;
    }
    if (permissions.allowsGate(v.id)) {
      route.events.push_back({EventKind::RunwayCrossingStart, corner.s, "crossing at " + v.name});
      continue;
    }

    // Unauthorized, and pointed at it.  This is where the aircraft stops -- and
    // it is the *nose* that has to stop short, not the reference point.  Near a
    // junction the path is curving, so walking back a fixed arclength is not
    // good enough; bisect for the arclength that puts the nose exactly where it
    // belongs.
    const Pose line{v.p, gated.heading(graphRoute[i])};
    const auto noseAlong = [&](double s) {
      const PathSample sample = route.path.at(s);
      return alongTrack(line, aircraft.noseTip(Pose{sample.p, sample.heading}));
    };
    double stopAt = 0.0;
    if (noseAlong(0.0) <= -limits.stopMargin) {
      double lo = 0.0, hi = corner.s;
      for (int step = 0; step < 60; ++step) {
        const double mid = 0.5 * (lo + hi);
        (noseAlong(mid) <= -limits.stopMargin ? lo : hi) = mid;
      }
      stopAt = lo;
    }
    route.events.push_back({EventKind::HoldShort, stopAt, "hold short at " + v.name});
    route.stops.push_back({stopAt, "holding position " + v.name + " is not authorized"});
    truncateAt = stopAt;
    truncated = true;
    break;
  }

  // Hotspots, from the edges the route actually uses.
  {
    bool inside = false;
    for (std::size_t i = 0; i < graphRoute.size(); ++i) {
      if (gated.edge(graphRoute[i].edge).hotspot == inside) continue;
      inside = !inside;
      route.events.push_back(
          {inside ? EventKind::HotspotEnter : EventKind::HotspotExit, corners[i].entryS,
           inside ? "entering a hotspot: slow down and look" : "clear of the hotspot"});
    }
  }

  // --- truncate at the first stop ----------------------------------------
  if (truncated) {
    Path clipped;
    for (const PathSample& sample : route.path.samples) {
      if (sample.s > truncateAt) break;
      clipped.samples.push_back(sample);
    }
    if (clipped.samples.empty() || clipped.samples.back().s < truncateAt - 1e-9)
      clipped.samples.push_back(route.path.at(truncateAt));
    route.path = std::move(clipped);
    route.events.erase(std::remove_if(route.events.begin(), route.events.end(),
                                      [&](const RouteEvent& e) { return e.s > truncateAt + 1e-9; }),
                       route.events.end());
  }
  route.events.push_back(
      {EventKind::Arrival, route.path.length(), truncated ? "stopped short" : "at the goal"});
  std::stable_sort(route.events.begin(), route.events.end(),
                   [](const RouteEvent& a, const RouteEvent& b) { return a.s < b.s; });

  // --- speed profile -----------------------------------------------------
  //
  // Zone limit, hotspot factor, turn comfort -- then a pass for the
  // deceleration into every stop.
  for (double s = 0.0; s <= route.path.length() + 1e-9; s += 2.0) {
    const PathSample sample = route.path.at(s);
    const ZoneQuery q = zoneAt(layer, sample.p);
    double v = speedLimitFor(q.zone, limits);
    if (q.hotspot) v *= limits.hotspotFactor;
    if (std::fabs(sample.curvature) > 1e-6) {
      // v <= sqrt(a_lat * r) is what keeps a turn comfortable for the cabin.
      const double radius = 1.0 / std::fabs(sample.curvature);
      v = std::min(v, std::sqrt(aircraft.maxLateralAccel * radius));
    }
    route.speed.push_back({s, v});
  }
  for (const StopPoint& stop : route.stops)
    for (SpeedPoint& point : route.speed)
      point.v = point.s >= stop.s
                    ? 0.0
                    : std::min(point.v, std::sqrt(2.0 * aircraft.maxDecel * (stop.s - point.s)));
  if (!route.speed.empty()) route.speed.back().v = 0.0;

  route.cost = route.path.length();
  return route;
}

}  // namespace planning::airport
