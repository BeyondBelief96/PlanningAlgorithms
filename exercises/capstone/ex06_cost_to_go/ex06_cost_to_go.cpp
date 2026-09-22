// Exercise 06 -- cost-to-go by reverse Dijkstra (Step 6).
//
// Read exercises/capstone/ex06_cost_to_go/README.md first.
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

double zoneCostRate(ZoneClass zone) {
  // TODO(you): seconds per metre, from the zone speed limit.  This is what
  // makes the search prefer a long fast taxiway to a short slow apron.
  (void)zone;
  return kInf;
}

double edgeCost(const TaxiGraph& graph, const DirectedEdge& d, const AircraftModel& aircraft) {
  // TODO(you): the whole edge, i.e. partialEdgeCost() entered at s = 0.
  (void)graph;
  (void)d;
  (void)aircraft;
  return kInf;
}

double partialEdgeCost(const TaxiGraph& graph, const DirectedEdge& d, double s,
                       const AircraftModel& aircraft) {
  // TODO(you): the remaining length at the zone rate, plus kHotspotPenalty if
  // the edge is a hotspot and kSoftGatePenalty if its *head* is a soft gate.
  // Fixed penalties are earned whether you join the edge at the tail or
  // halfway along it, which is why they do not scale with the remainder.
  (void)graph;
  (void)d;
  (void)s;
  (void)aircraft;
  return kInf;
}

int advanceRouteIndex(const Edge& edge, int k, const std::vector<std::string>& labels) {
  // TODO(you): the route constraint as a state machine.  See the header for
  // the rules.  Crossing a runway is transparent -- the clearance names the
  // crossing separately -- and before the route starts or after it ends you
  // are on the ramp, which the clearance never spells out.
  (void)edge;
  (void)k;
  (void)labels;
  return -1;
}

double CostToGo::at(const DirectedEdge& d, int k) const {
  // TODO(you): a bounds-checked read of value[pack(d, k)].
  (void)d;
  (void)k;
  return kInf;
}

bool CostToGo::reachable(const DirectedEdge& d, int k) const {
  // TODO(you): finite cost-to-go means a route exists from here.
  (void)d;
  (void)k;
  return false;
}

CostToGo computeCostToGo(const TaxiGraph& gated, const PermissionSet& permissions,
                         const EdgeFilter& filter, const AircraftModel& aircraft) {
  // TODO(you): Dijkstra, run backwards, over states (directed edge, route index).
  //
  // A state means "standing at the head of this directed edge, with k labels of
  // the cleared route consumed".  The terminal states are the allowed edges
  // whose head is permissions.goal, with the whole route consumed, at cost 0.
  //
  // To relax a state, look at every allowed edge *arriving* at its tail; the
  // turn onto this edge must be feasible, and advanceRouteIndex() must carry
  // the predecessor's route index to exactly this one.  Record CostToGo::next
  // so that extractGraphRoute() can walk the answer out.
  (void)gated;
  (void)permissions;
  (void)filter;
  (void)aircraft;
  return CostToGo{};
}

std::vector<DirectedEdge> extractGraphRoute(const CostToGo& costToGo, const DirectedEdge& start,
                                            int k) {
  // TODO(you): follow CostToGo::next from pack(start, k) to the goal.  Bound
  // the loop: a mistake in computeCostToGo() otherwise hangs the test run.
  (void)costToGo;
  (void)start;
  (void)k;
  return {};
}

}  // namespace planning::airport
