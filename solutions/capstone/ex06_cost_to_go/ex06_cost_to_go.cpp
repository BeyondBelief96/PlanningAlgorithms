// Reference solution -- Exercise 06: cost-to-go by reverse Dijkstra (Step 6).
//
// Chapter 2, Section 2.2.3, with two twists.  The state is a *directed* edge,
// so heading is part of the state and a turn can be checked against the minimum
// radius.  And the state carries how much of the cleared route has been
// consumed, which turns "must use A then D then B then E" into an ordinary
// shortest-path problem on a product graph rather than a filter applied
// afterwards.
#include <algorithm>
#include <cmath>
#include <queue>
#include <utility>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {
namespace {

bool transparentZone(ZoneClass zone) {
  // Crossing a runway is not "using a taxiway": the clearance names the
  // crossing separately, so these edges leave the route index alone.
  return zone == ZoneClass::Runway || zone == ZoneClass::RunwayProtected;
}

bool rampZone(ZoneClass zone) {
  return zone == ZoneClass::Apron || zone == ZoneClass::Stand || zone == ZoneClass::DeIcing;
}

DirectedEdge unpack(int state, int routeStates) {
  const int directed = state / routeStates;
  return DirectedEdge{directed / 2, (directed % 2) == 0};
}

}  // namespace

double zoneCostRate(ZoneClass zone) {
  const double limit = policyFor(zone).speedLimit;
  return limit > 0.0 ? 1.0 / limit : kInf;  // seconds per metre
}

double edgeCost(const TaxiGraph& graph, const DirectedEdge& d, const AircraftModel& aircraft) {
  return partialEdgeCost(graph, d, 0.0, aircraft);
}

double partialEdgeCost(const TaxiGraph& graph, const DirectedEdge& d, double s,
                       const AircraftModel& aircraft) {
  (void)aircraft;
  if (!d.valid()) return kInf;
  const Edge& e = graph.edge(d.edge);
  const double remaining = std::max(0.0, graph.length(d.edge) - std::max(0.0, s));
  double cost = remaining * zoneCostRate(e.zone);
  if (e.hotspot) cost += kHotspotPenalty;
  if (graph.vertex(graph.head(d)).gate == GateKind::Soft) cost += kSoftGatePenalty;
  return cost;
}

int advanceRouteIndex(const Edge& edge, int k, const std::vector<std::string>& labels) {
  const int n = static_cast<int>(labels.size());
  if (n == 0) return k;  // no route constraint at all
  if (k < 0 || k > n) return -1;
  if (k < n && edge.taxiway == labels[static_cast<std::size_t>(k)]) return k + 1;
  if (k > 0 && edge.taxiway == labels[static_cast<std::size_t>(k - 1)]) return k;
  if (transparentZone(edge.zone)) return k;
  // Before the route starts and after it ends you are on the ramp, which the
  // clearance never spells out.
  if ((k == 0 || k == n) && rampZone(edge.zone)) return k;
  return -1;
}

double CostToGo::at(const DirectedEdge& d, int k) const {
  if (!d.valid() || k < 0 || k >= routeStates) return kInf;
  const std::size_t i = static_cast<std::size_t>(pack(d, k));
  return i < value.size() ? value[i] : kInf;
}

bool CostToGo::reachable(const DirectedEdge& d, int k) const { return std::isfinite(at(d, k)); }

CostToGo computeCostToGo(const TaxiGraph& gated, const PermissionSet& permissions,
                         const EdgeFilter& filter, const AircraftModel& aircraft) {
  CostToGo ctg;
  ctg.routeStates = static_cast<int>(permissions.routeLabels.size()) + 1;
  const int states = gated.numDirectedEdges() * ctg.routeStates;
  ctg.value.assign(static_cast<std::size_t>(states), kInf);
  ctg.next.assign(static_cast<std::size_t>(states), -1);
  if (permissions.goal == kNoVertex || states == 0) return ctg;

  const int lastIndex = ctg.routeStates - 1;
  using Entry = std::pair<double, int>;
  std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> q;

  // Terminal states: standing at the head of an allowed edge that ends at the
  // goal, with the whole cleared route consumed.
  for (const Edge& e : gated.edges()) {
    for (const bool forward : {true, false}) {
      const DirectedEdge d{e.id, forward};
      if (!filter.allows(d)) continue;
      if (gated.head(d) != permissions.goal) continue;
      const int s = ctg.pack(d, lastIndex);
      ctg.value[static_cast<std::size_t>(s)] = 0.0;
      q.push({0.0, s});
    }
  }

  while (!q.empty()) {
    const auto [value, state] = q.top();
    q.pop();
    if (value > ctg.value[static_cast<std::size_t>(state)] + 1e-12) continue;  // stale entry

    const DirectedEdge d = unpack(state, ctg.routeStates);
    const int k = state % ctg.routeStates;
    const double stepCost = edgeCost(gated, d, aircraft);
    if (!std::isfinite(stepCost)) continue;

    // Predecessors: any allowed edge arriving at the tail of d, from which the
    // turn onto d is flyable and the route index advances to exactly k.
    for (const DirectedEdge& p : gated.arriving(gated.tail(d))) {
      if (!filter.allows(p)) continue;
      if (!turnIsFeasible(gated, p, d, aircraft)) continue;
      for (int kp = 0; kp < ctg.routeStates; ++kp) {
        if (advanceRouteIndex(gated.edge(d.edge), kp, permissions.routeLabels) != k) continue;
        const int previous = ctg.pack(p, kp);
        const double candidate = value + stepCost;
        if (candidate >= ctg.value[static_cast<std::size_t>(previous)]) continue;
        ctg.value[static_cast<std::size_t>(previous)] = candidate;
        ctg.next[static_cast<std::size_t>(previous)] = state;
        q.push({candidate, previous});
      }
    }
  }
  return ctg;
}

std::vector<DirectedEdge> extractGraphRoute(const CostToGo& costToGo, const DirectedEdge& start,
                                            int k) {
  std::vector<DirectedEdge> route;
  if (!costToGo.reachable(start, k)) return route;
  int state = costToGo.pack(start, k);
  route.push_back(start);
  // The state graph is acyclic along `next` because every step strictly
  // decreases the cost-to-go, but a bound costs nothing and catches mistakes.
  for (std::size_t guard = 0; guard < costToGo.next.size(); ++guard) {
    const int nextState = costToGo.next[static_cast<std::size_t>(state)];
    if (nextState < 0) break;
    state = nextState;
    route.push_back(unpack(state, costToGo.routeStates));
  }
  return route;
}

}  // namespace planning::airport
