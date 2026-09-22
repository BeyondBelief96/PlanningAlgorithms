// capstone_fixture.hpp -- shared setup for the capstone tests.
//
// The capstone is a pipeline, so most tests need the first few stages before
// they can say anything about their own.  This header builds them once.
//
// That means a test for Exercise NN will only pass once Exercises 1..NN are
// all green.  Work them in order; the reference build is there to tell you
// whether the test itself is reasonable.
#pragma once

#include <string>

#include "planning/airport/airport_map.hpp"
#include "planning/airport/taxi_planner.hpp"

namespace capstone {

using namespace planning::airport;

struct Fixture {
  const maps::Airport& airport = maps::kilo();
  AircraftModel aircraft = a320();
  TaxiGraph gated;
  Clearance clearance;
  PermissionSet permissions;
  EdgeFilter filter;
  CostToGo costToGo;
  Localization localization;

  // Builds every stage up to and including the ones the test needs.
  explicit Fixture(const std::string& clearanceText =
                       "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27",
                   const Pose& start = Pose{{290.0, 95.0}, 0.5 * planning::airport::kPi},
                   const AircraftModel& model = a320()) {
    aircraft = model;
    gated = buildGatedGraph(airport.graph, airport.zones);
    clearance = parseClearance(clearanceText);
    permissions = buildPermissions(gated, airport.zones, clearance);
    filter = filterGraph(gated, aircraft, permissions);
    costToGo = computeCostToGo(gated, permissions, filter, aircraft);
    localization = localize(airport.zones, gated, aircraft, start);
  }

  const ZoneLayer& zones() const { return airport.zones; }

  VertexId gateNear(double x, double y) const {
    for (const Vertex& v : gated.vertices())
      if (v.gate != GateKind::None && distance(v.p, Vec2{x, y}) < 0.5) return v.id;
    return kNoVertex;
  }

  // The first directed edge whose label matches and whose midpoint is nearest
  // the given point -- enough to name an edge in a test without hard-coding ids.
  DirectedEdge edgeNear(const std::string& label, double x, double y) const {
    DirectedEdge best;
    double bestDistance = 1e300;
    for (const Edge& e : gated.edges()) {
      if (e.taxiway != label) continue;
      const Segment g = gated.geometry(e.id);
      const double d = distance((g.a + g.b) * 0.5, Vec2{x, y});
      if (d >= bestDistance) continue;
      bestDistance = d;
      best = DirectedEdge{e.id, true};
    }
    return best;
  }
};

}  // namespace capstone
