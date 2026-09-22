// Reference solution -- Exercise 07: merge candidates (Step 7).
//
// This is where the invariant is enforced for the off-graph half of the plan.
// Every filter below exists to make one thing impossible: producing a candidate
// that the aircraft could only reach by driving out of the zone it is in.
#include <algorithm>
#include <cmath>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {
namespace {

bool candidateZoneAllowed(ZoneClass edgeZone, const Localization& loc) {
  if (edgeZone == loc.zone) return true;
  // Stand to apron is the one free-space transition a pilot makes without a
  // word from anybody, so a stand start may also aim at apron taxilanes.
  if (loc.mode == StartMode::Stand && edgeZone == ZoneClass::Apron) return true;
  return false;
}

// The straight line from the aircraft to the candidate must stay in the start
// zone.  This is the invariant itself, stated as a test: if the aircraft cannot
// reach the merge point without leaving its zone, the merge point is not a
// candidate, however cheap it looks.
bool straightStaysInZone(const ZoneLayer& layer, const Vec2& from, const Vec2& to,
                         const Localization& loc) {
  const double length = distance(from, to);
  const int n = std::max(1, static_cast<int>(std::ceil(length / 2.0)));
  for (int i = 0; i <= n; ++i) {
    const Vec2 p = from + (to - from) * (static_cast<double>(i) / static_cast<double>(n));
    if (!candidateZoneAllowed(zoneAt(layer, p).zone, loc)) return false;
  }
  return true;
}

// Does the straight line from the aircraft to the candidate point cross a
// painted holding position?  A cheap pre-filter; Exercise 10 does it properly
// against the swept outline.
bool crossesHoldShort(const ZoneLayer& layer, const Vec2& from, const Vec2& to) {
  Aabb box;
  box.extend(from);
  box.extend(to);
  for (int id : layer.holdShortCandidates(box.grown(1.0)))
    if (segmentsIntersect(Segment{from, to}, layer.holdShortLine(id).segment)) return true;
  return false;
}

// Metres of straight guidance line from the merge point onward, following
// collinear continuations across junctions.  A merge that lands two metres
// before a corner is no use to the controller.
double straightLeadIn(const TaxiGraph& graph, const EdgeFilter& filter, DirectedEdge d, double s) {
  double total = graph.length(d.edge) - s;
  const double heading = graph.heading(d);
  for (int guard = 0; guard < 8; ++guard) {
    DirectedEdge next;
    int found = 0;
    for (const DirectedEdge& candidate : graph.leaving(graph.head(d))) {
      if (!filter.allows(candidate)) continue;
      if (std::fabs(wrapAngle(graph.heading(candidate) - heading)) > 1e-3) continue;
      next = candidate;
      ++found;
    }
    if (found != 1) break;
    total += graph.length(next.edge);
    d = next;
  }
  return total;
}

}  // namespace

std::vector<MergeCandidate> generateMergeCandidates(const TaxiGraph& gated, const ZoneLayer& layer,
                                                    const AircraftModel& aircraft,
                                                    const Localization& localization,
                                                    const PermissionSet& permissions,
                                                    const EdgeFilter& filter,
                                                    const CostToGo& costToGo) {
  std::vector<MergeCandidate> candidates;
  if (localization.mode == StartMode::Fault) return candidates;
  const Pose& start = localization.pose;

  for (const Edge& e : gated.edges()) {
    if (!candidateZoneAllowed(e.zone, localization)) continue;
    // Never invent a candidate on a runway unless we are already on one.
    if ((e.zone == ZoneClass::Runway || e.zone == ZoneClass::RunwayProtected) &&
        localization.mode != StartMode::Runway)
      continue;

    for (const bool forward : {true, false}) {
      const DirectedEdge d{e.id, forward};
      if (!filter.allows(d)) continue;
      const int k = advanceRouteIndex(e, 0, permissions.routeLabels);
      if (k < 0 || !costToGo.reachable(d, k)) continue;

      const double length = gated.length(e.id);
      for (double s = kJunctionExclusion; s <= length - kJunctionExclusion + 1e-9;
           s += kCandidateSpacing) {
        const Pose target = gated.poseAlong(d, s);
        const Vec2 offset = target.p - start.p;
        const double range = norm(offset);
        if (range > kCandidateRadius) continue;

        // Do not turn round to reach a merge point, and on a runway do not even
        // consider one that is not straight ahead.
        if (range > 1e-6) {
          const double bearing = std::fabs(wrapAngle(angleOf(offset) - start.heading));
          if (bearing > kMaxCandidateBearing) continue;
        }
        // ...and never merge onto a line that points back the way we came.
        if (std::fabs(wrapAngle(target.heading - start.heading)) > kMaxCandidateBearing) continue;
        if (localization.mode == StartMode::Runway && alongTrack(start, target.p) <= 0.0) continue;

        if (crossesHoldShort(layer, start.p, target.p)) continue;
        if (!straightStaysInZone(layer, start.p, target.p, localization)) continue;

        const double leadIn = straightLeadIn(gated, filter, d, s);
        if (leadIn < kMinLeadIn) continue;

        MergeCandidate c;
        c.edge = d;
        c.s = s;
        c.target = target;
        c.routeIndex = k;
        c.leadIn = leadIn;
        c.costToGo = partialEdgeCost(gated, d, s, aircraft) + costToGo.at(d, k);
        candidates.push_back(c);
      }
    }
  }

  // Cheapest first, counting the drive to the merge point at the local zone
  // rate so that a distant merge does not look free.
  const double rate = zoneCostRate(localization.zone);
  std::sort(candidates.begin(), candidates.end(),
            [&](const MergeCandidate& a, const MergeCandidate& b) {
              const double ca = a.costToGo + distance(start.p, a.target.p) * rate;
              const double cb = b.costToGo + distance(start.p, b.target.p) * rate;
              if (ca != cb) return ca < cb;
              return a.edge.index() < b.edge.index();
            });
  return candidates;
}

}  // namespace planning::airport
