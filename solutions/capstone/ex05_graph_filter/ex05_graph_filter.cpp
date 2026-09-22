// Reference solution -- Exercise 05: filtering the graph (Step 5).
//
// Two things happen here.  Edges that this aircraft or this mission may not use
// are struck out once, before any search runs.  And the gate rule is enforced
// *directionally*: a hard gate stops you going in, never coming out.  An
// aeroplane that has just landed has to be able to leave the runway without
// asking permission to do so.
#include <cmath>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

EdgeFilter filterGraph(const TaxiGraph& gated, const AircraftModel& aircraft,
                       const PermissionSet& permissions) {
  EdgeFilter filter;
  filter.allowed.assign(static_cast<std::size_t>(gated.numDirectedEdges()), 1);
  filter.reason.assign(static_cast<std::size_t>(gated.numDirectedEdges()), std::string());

  for (const Edge& e : gated.edges()) {
    for (const bool forward : {true, false}) {
      const DirectedEdge d{e.id, forward};
      const std::size_t i = static_cast<std::size_t>(d.index());
      const auto block = [&](std::string why) {
        filter.allowed[i] = 0;
        filter.reason[i] = std::move(why);
      };

      if (e.oneWay && !forward) {
        block("one-way the other way");
      } else if (e.closed) {
        block("closed by NOTAM or construction");
      } else if (aircraft.wingspan > e.maxWingspan) {
        block("wingspan " + std::to_string(static_cast<int>(aircraft.wingspan)) + " m exceeds " +
              std::to_string(static_cast<int>(e.maxWingspan)) + " m");
      } else if (policyFor(e.zone).missionOnly && !permissions.deIcingInMission) {
        block("not in the mission");
      } else if (e.zone == ZoneClass::Forbidden || e.zone == ZoneClass::Shoulder ||
                 e.zone == ZoneClass::Unknown) {
        block("leads into a zone that is not drivable");
      } else {
        // The gate rule.  Entering an edge whose zone is more restrictive than
        // the gate's inner side is a crossing, and a crossing needs a clearance.
        const Vertex& gate = gated.vertex(gated.tail(d));
        if (gate.gate == GateKind::Hard && !permissions.allowsGate(gate.id) &&
            zonePriority(e.zone) > zonePriority(gate.innerZone))
          block("unauthorized crossing at " + gate.name);
      }
    }
  }
  return filter;
}

bool turnIsFeasible(const TaxiGraph& graph, const DirectedEdge& in, const DirectedEdge& out,
                    const AircraftModel& aircraft) {
  if (!in.valid() || !out.valid()) return false;
  if (in.edge == out.edge) return false;  // that is a reversal, not a turn
  if (graph.head(in) != graph.tail(out)) return false;

  const double theta = std::fabs(wrapAngle(graph.heading(out) - graph.heading(in)));
  if (theta > kMaxNodeTurn) return false;
  if (theta < 1e-6) return true;

  // A corner of angle theta taken at radius r eats r * tan(theta / 2) of
  // straight line on each side of the junction.
  const double need = aircraft.minTurnRadius * std::tan(0.5 * theta);
  return need <= graph.length(in.edge) + 1e-9 && need <= graph.length(out.edge) + 1e-9;
}

}  // namespace planning::airport
