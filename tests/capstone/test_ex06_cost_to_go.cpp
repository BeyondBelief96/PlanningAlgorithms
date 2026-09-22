#include <algorithm>

#include "capstone/capstone_fixture.hpp"
#include "test_harness.hpp"

using namespace planning::airport;
using capstone::Fixture;

namespace {

Edge labelled(const std::string& taxiway, ZoneClass zone = ZoneClass::Taxiway) {
  Edge e;
  e.taxiway = taxiway;
  e.zone = zone;
  return e;
}

// The labels the route visits, with runs of the same label collapsed.
std::vector<std::string> labelsOf(const TaxiGraph& graph, const std::vector<DirectedEdge>& route) {
  std::vector<std::string> out;
  for (const DirectedEdge& d : route) {
    const std::string& label = graph.edge(d.edge).taxiway;
    if (out.empty() || out.back() != label) out.push_back(label);
  }
  return out;
}

}  // namespace

TEST(the_cost_rate_is_the_reciprocal_of_the_speed_limit) {
  CHECK_NEAR(zoneCostRate(ZoneClass::Taxiway), 0.1);
  CHECK_NEAR(zoneCostRate(ZoneClass::Apron), 0.2);
  CHECK_NEAR(zoneCostRate(ZoneClass::Stand), 0.4);
  CHECK_NEAR(zoneCostRate(ZoneClass::Runway), 1.0 / 15.0);
  // Nothing may drive here, so no amount of time buys you a metre of it.
  CHECK(zoneCostRate(ZoneClass::Forbidden) == kInf);
}

TEST(an_edge_costs_its_length_in_seconds_plus_its_penalties) {
  const Fixture f;
  const AircraftModel jet = a320();
  // Taxiway A from the apron gate to the de-icing junction: 180 m at 10 m/s.
  const DirectedEdge a = f.edgeNear("A", 590, 200);
  CHECK_NEAR(f.gated.length(a.edge), 180.0);
  CHECK_NEAR(edgeCost(f.gated, a, jet), 18.0);
  // Entering halfway along costs half as much.
  CHECK_NEAR(partialEdgeCost(f.gated, a, 90.0, jet), 9.0);
}

TEST(a_soft_gate_and_a_hotspot_are_fixed_costs) {
  const Fixture f;
  const AircraftModel jet = a320();
  // The apron taxilane edge that ends at the apron/taxiway gate.
  const DirectedEdge toGate = f.edgeNear("APRON", 455, 200);
  CHECK_NEAR(edgeCost(f.gated, toGate, jet), 90.0 * 0.2 + kSoftGatePenalty);
  // ...and the penalty does not shrink when you join the edge late.
  CHECK_NEAR(partialEdgeCost(f.gated, toGate, 90.0, jet), kSoftGatePenalty);
}

TEST(the_route_index_advances_only_on_the_next_cleared_taxiway) {
  const std::vector<std::string> route{"A", "D", "B", "E"};
  CHECK_EQ(advanceRouteIndex(labelled("A"), 0, route), 1);
  CHECK_EQ(advanceRouteIndex(labelled("A"), 1, route), 1);  // still on A
  CHECK_EQ(advanceRouteIndex(labelled("D"), 1, route), 2);
  CHECK_EQ(advanceRouteIndex(labelled("B"), 1, route), -1);  // D comes first
  CHECK_EQ(advanceRouteIndex(labelled("F"), 1, route), -1);  // not on the clearance at all
}

TEST(runways_are_transparent_and_the_ramp_is_free_at_either_end) {
  const std::vector<std::string> route{"A", "D", "B", "E"};
  // Crossing runway 36 happens on edges labelled B but lying in the runway;
  // the clearance names the crossing separately, so the index must not move.
  CHECK_EQ(advanceRouteIndex(labelled("B", ZoneClass::Runway), 3, route), 3);
  CHECK_EQ(advanceRouteIndex(labelled("RWY 18/36", ZoneClass::Runway), 3, route), 3);
  // Before the route starts and after it ends you are on the ramp.
  CHECK_EQ(advanceRouteIndex(labelled("APRON", ZoneClass::Apron), 0, route), 0);
  CHECK_EQ(advanceRouteIndex(labelled("STAND 2", ZoneClass::Stand), 4, route), 4);
  CHECK_EQ(advanceRouteIndex(labelled("APRON", ZoneClass::Apron), 2, route), -1);
  // No route constraint at all leaves the index alone.
  CHECK_EQ(advanceRouteIndex(labelled("ANYTHING"), 0, {}), 0);
}

TEST(the_cost_to_go_is_zero_where_the_mission_ends) {
  const Fixture f;
  const DirectedEdge onto = f.edgeNear("E", 2300, 412);
  CHECK_EQ(f.gated.head(onto), f.permissions.goal);
  CHECK_NEAR(f.costToGo.at(onto, 4), 0.0);
}

TEST(the_cost_to_go_decreases_along_the_cleared_route) {
  const Fixture f;
  const DirectedEdge early = f.edgeNear("A", 1200, 200);
  const DirectedEdge late = f.edgeNear("B", 2000, 400);
  CHECK(f.costToGo.reachable(early, 1));
  CHECK(f.costToGo.reachable(late, 3));
  CHECK(f.costToGo.at(early, 1) > f.costToGo.at(late, 3));
}

TEST(an_edge_the_clearance_forbids_never_appears_on_the_route) {
  const Fixture f;
  // Taxiway F is open and drivable, but "via A D B E" does not mention it, so
  // there is no route index at which an aircraft may join it.
  const DirectedEdge f1 = f.edgeNear("F", 1000, 300);
  CHECK(f.filter.allows(f1));
  for (int k = 0; k < f.costToGo.routeStates; ++k)
    CHECK(advanceRouteIndex(f.gated.edge(f1.edge), k, f.permissions.routeLabels) < 0);

  // Note that computeCostToGo() may still put a finite number on (F, k): the
  // cost *from* a state is well defined even for a state you could never be
  // in.  Forward reachability is enforced where it belongs, in Exercise 07,
  // when the candidate picks its starting route index.
  const std::vector<DirectedEdge> route =
      extractGraphRoute(f.costToGo, f.edgeNear("A", 590, 200), 1);
  for (const DirectedEdge& d : route) CHECK(f.gated.edge(d.edge).taxiway != "F");
}

TEST(the_extracted_route_follows_the_clearance) {
  const Fixture f;
  const DirectedEdge start = f.edgeNear("A", 590, 200);
  const std::vector<DirectedEdge> route = extractGraphRoute(f.costToGo, start, 1);
  CHECK(!route.empty());
  CHECK_EQ(f.gated.head(AT(route, route.size() - 1)), f.permissions.goal);

  const std::vector<std::string> labels = labelsOf(f.gated, route);
  CHECK_EQ(labels.size(), std::size_t{4});
  CHECK_EQ(AT(labels, 0), std::string("A"));
  CHECK_EQ(AT(labels, 1), std::string("D"));
  CHECK_EQ(AT(labels, 2), std::string("B"));
  CHECK_EQ(AT(labels, 3), std::string("E"));
}

TEST(the_hotspot_penalty_decides_between_two_equal_routes) {
  // With no "via" the search may pick either connector between taxiway A and
  // taxiway B.  On this map the two are exactly the same length, so the
  // hotspot is the only thing that separates them -- which makes it easy to
  // see that the penalty is really being applied.
  const std::string open = "TAXI TO RUNWAY 27 CROSS RUNWAY 36 HOLD SHORT RUNWAY 27";

  const auto connectorUsed = [&](const maps::Airport& airport) {
    const AircraftModel jet = a320();
    const TaxiGraph gated = buildGatedGraph(airport.graph, airport.zones);
    const Clearance clearance = parseClearance(open);
    const PermissionSet permissions = buildPermissions(gated, airport.zones, clearance);
    const EdgeFilter filter = filterGraph(gated, jet, permissions);
    const CostToGo costToGo = computeCostToGo(gated, permissions, filter, jet);

    DirectedEdge start;
    for (const Edge& e : gated.edges()) {
      if (e.taxiway != "A") continue;
      const Segment g = gated.geometry(e.id);
      if (distance((g.a + g.b) * 0.5, Vec2{590, 200}) < 1.0) start = DirectedEdge{e.id, true};
    }
    std::string used;
    for (const DirectedEdge& d : extractGraphRoute(costToGo, start, 0)) {
      const std::string& label = gated.edge(d.edge).taxiway;
      if (label == "D" || label == "F") used = label;
    }
    return used;
  };

  // As built, the hotspot sits on the F/B junction, so the search avoids F.
  CHECK_EQ(connectorUsed(maps::kilo()), std::string("D"));

  // Move it onto connector D and the answer flips -- same distance, different
  // cost, different route.
  maps::Airport moved = maps::buildKilo();
  const int hotspot = moved.zones.findPolygon("HOTSPOT 1");
  CHECK(hotspot >= 0);
  moved.zones.polygon(hotspot).outline = makeRectangle(1380, 250, 1420, 350);
  moved.zones.build();
  CHECK_EQ(connectorUsed(moved), std::string("F"));
}
