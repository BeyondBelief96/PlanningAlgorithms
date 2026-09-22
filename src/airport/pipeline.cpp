// pipeline.cpp -- the given orchestration: the twelve exercises in order.
//
// This file is *given*, and it is compiled into both the exercise build and the
// reference build, so it always calls whichever set of implementations you are
// testing.  Read it once you have Exercise 03 working: it is the map of the
// whole capstone, and it is deliberately short, because every interesting
// decision lives in one of the twelve functions it calls.
#include <algorithm>
#include <cmath>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {
namespace {

// Trying every candidate would be correct and slow.  They arrive cheapest
// first, so a bounded prefix is what a real planner would budget for.
constexpr int kMaxCandidatesTried = 48;

PlanResult refuse(PlanStatus status, std::string detail) {
  PlanResult result;
  result.status = status;
  result.detail = std::move(detail);
  return result;
}

// The two commonest reasons an edge was struck out, for the refusal message.
std::string describe(const EdgeFilter& filter) {
  std::vector<std::string> seen;
  for (const std::string& reason : filter.reason) {
    if (reason.empty()) continue;
    if (std::find(seen.begin(), seen.end(), reason) != seen.end()) continue;
    seen.push_back(reason);
    if (seen.size() == 2) break;
  }
  std::string out;
  for (const std::string& reason : seen) out += (out.empty() ? "" : "; ") + reason;
  return out.empty() ? "nothing was filtered out" : out;
}

std::string describe(const SweepResult& sweep) {
  if (sweep.violations.empty()) return "unknown";
  return std::string(toString(sweep.violations.front().kind)) + ": " +
         sweep.violations.front().what;
}

}  // namespace

PlanResult planTaxi(const ZoneLayer& layer, const TaxiGraph& rawGraph,
                    const AircraftModel& aircraft, const Pose& start, const Clearance& clearance) {
  // Step 2.  In a real system this is done once at load time, not per plan.
  const TaxiGraph gated = buildGatedGraph(rawGraph, layer);

  // Step 3.
  const Localization localization = localize(layer, gated, aircraft, start);
  if (localization.mode == StartMode::Fault)
    return refuse(PlanStatus::LocalizationInconsistent, localization.detail);
  if (localization.mode == StartMode::Stand && std::fabs(localization.headingError) > 0.5 * kPi)
    return refuse(PlanStatus::PushbackRequired,
                  "parked nose-in: the lead-out line runs the other way");

  // Step 4.
  PermissionSet permissions = buildPermissions(gated, layer, clearance);
  if (permissions.goal == kNoVertex) return refuse(PlanStatus::NotCleared, permissions.detail);

  // Being on a runway is not a violation when the landing clearance put you
  // there.  Add the runway underneath the aircraft to the enterable set so that
  // Step 9 and Step 11 do not flag the ground it is already standing on.
  if (localization.zone == ZoneClass::Runway || localization.zone == ZoneClass::RunwayProtected) {
    const ZoneQuery here = zoneAt(layer, start.p);
    if (here.polygonId >= 0)
      for (const std::string& ident : layer.polygon(here.polygonId).idents)
        permissions.enterableRunways.insert(ident);
  }

  // Steps 5 and 6.
  const EdgeFilter filter = filterGraph(gated, aircraft, permissions);
  const CostToGo costToGo = computeCostToGo(gated, permissions, filter, aircraft);

  // Step 7.
  const std::vector<MergeCandidate> candidates =
      generateMergeCandidates(gated, layer, aircraft, localization, permissions, filter, costToGo);
  if (candidates.empty()) {
    if (localization.mode == StartMode::Runway)
      return refuse(PlanStatus::NoForwardExit, "no runway exit ahead that the clearance allows");
    return refuse(PlanStatus::NoRoute, "no guidance line in this zone leads to " +
                                           permissions.detail + " (" + describe(filter) + ")");
  }

  // Step 8, then Step 9, for each candidate in cost order.
  const MergeParams params = paramsFor(localization.mode, aircraft);
  ZoneLayer cspace;
  bool cspaceReady = false;
  std::string lastProblem = "no candidate survived the sweep check";

  const int tried = std::min(static_cast<int>(candidates.size()), kMaxCandidatesTried);
  for (int i = 0; i < tried; ++i) {
    const MergeCandidate& candidate = candidates[static_cast<std::size_t>(i)];

    MergePath merge = planMerge(start, candidate, params);
    if (!merge.found && params.allowHybridAStar) {
      if (!cspaceReady) {
        cspace = configurationSpace(layer, aircraft);
        cspaceReady = true;
      }
      std::vector<ZoneClass> allowed{localization.zone};
      if (localization.mode == StartMode::Stand) allowed.push_back(ZoneClass::Apron);
      HybridAStarParams hybrid;
      hybrid.radius = std::max(aircraft.minTurnRadius, params.preferredRadius);
      merge = planHybridAStar(cspace, start, candidate, allowed, hybrid);
    }
    if (!merge.found) continue;

    // Step 9 on the off-graph part.
    const SweepResult offGraph =
        validateSweep(layer, aircraft, merge.path, localization.zone, permissions, true);
    if (!offGraph.ok) {
      lastProblem = "merge rejected, " + describe(offGraph);
      continue;
    }

    const std::vector<DirectedEdge> graphRoute =
        extractGraphRoute(costToGo, candidate.edge, candidate.routeIndex);
    if (graphRoute.empty()) continue;

    // Step 10.
    Route route =
        assembleRoute(gated, layer, aircraft, merge, graphRoute, permissions, SpeedLimits{});
    if (route.path.empty()) continue;

    // Step 9 again, on the whole thing.  The graph should already be safe, but
    // map error and this particular wingspan make it worth checking.
    const SweepResult onGraph =
        validateSweep(layer, aircraft, route.path, localization.zone, permissions, false);
    if (!onGraph.ok) {
      lastProblem = "route rejected, " + describe(onGraph);
      continue;
    }

    PlanResult result;
    result.status = PlanStatus::Success;
    result.route = std::move(route);
    result.detail = std::string(toString(localization.mode)) + " start, merged by " +
                    toString(merge.method) + ", " + permissions.detail;
    return result;
  }

  return refuse(PlanStatus::BlockedByObstacle, lastProblem);
}

}  // namespace planning::airport
