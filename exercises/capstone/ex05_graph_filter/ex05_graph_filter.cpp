// Exercise 05 -- filtering the graph for this aircraft and mission (Step 5).
//
// Read exercises/capstone/ex05_graph_filter/README.md first.
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

EdgeFilter filterGraph(const TaxiGraph& gated, const AircraftModel& aircraft,
                       const PermissionSet& permissions) {
  // TODO(you): one entry per DirectedEdge::index(), with a reason string for
  // every edge you strike out.  Block an edge when it is travelled against a
  // one-way, when it is closed, when the wingspan does not fit, when its zone
  // is mission-only and the mission does not ask for it, when its zone is not
  // drivable at all -- and when entering it means crossing an unauthorized
  // hard gate.
  //
  // That last one is *directional*.  A hard gate stops you going in, never
  // coming out: an aeroplane that has just landed must be able to leave the
  // runway without asking permission.  Compare zonePriority(edge.zone) with
  // zonePriority(gate.innerZone) at the *tail* of the directed edge.
  (void)gated;
  (void)aircraft;
  (void)permissions;
  return EdgeFilter{};
}

bool turnIsFeasible(const TaxiGraph& graph, const DirectedEdge& in, const DirectedEdge& out,
                    const AircraftModel& aircraft) {
  // TODO(you): the two are only connected if they share a vertex, the turn is
  // not a reversal (kMaxNodeTurn), and there is room for the fillet.  A corner
  // of angle theta taken at radius r eats r * tan(theta / 2) of straight line
  // on *each* side of the junction.
  (void)graph;
  (void)in;
  (void)out;
  (void)aircraft;
  return false;
}

}  // namespace planning::airport
