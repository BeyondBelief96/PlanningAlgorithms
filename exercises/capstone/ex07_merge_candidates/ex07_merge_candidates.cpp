// Exercise 07 -- merge candidates, and only in the start zone (Step 7).
//
// Read exercises/capstone/ex07_merge_candidates/README.md first.
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

std::vector<MergeCandidate> generateMergeCandidates(const TaxiGraph& gated, const ZoneLayer& layer,
                                                    const AircraftModel& aircraft,
                                                    const Localization& localization,
                                                    const PermissionSet& permissions,
                                                    const EdgeFilter& filter,
                                                    const CostToGo& costToGo) {
  // TODO(you): sample points along the guidance lines near the aircraft and
  // keep only the ones it could legally drive to.  Every filter below exists
  // to make one thing impossible -- a candidate the aircraft could only reach
  // by leaving the zone it is in.
  //
  //   * the edge zone matches the start zone (stand may also use the apron)
  //   * never a runway edge unless we are already in Runway mode
  //   * the edge is allowed by the filter, and reachable: the route index
  //     after joining is advanceRouteIndex(edge, 0, routeLabels), and
  //     costToGo.reachable() must hold for it
  //   * keep kJunctionExclusion clear of both ends, and require kMinLeadIn
  //     metres of straight guidance line after the merge point (following
  //     collinear continuations across junctions)
  //   * within kCandidateRadius, and within kMaxCandidateBearing of the nose,
  //     both in *where* it is and in *which way the line points*
  //   * in Runway mode, strictly ahead: you cannot pick an exit behind you
  //   * the straight line from the aircraft to the candidate crosses no
  //     holding position, and stays inside the start zone the whole way
  //
  // Sort cheapest first: costToGo plus the drive to the merge point, charged
  // at the local zone rate so that a distant merge does not look free.
  (void)gated;
  (void)layer;
  (void)aircraft;
  (void)localization;
  (void)permissions;
  (void)filter;
  (void)costToGo;
  return {};
}

}  // namespace planning::airport
