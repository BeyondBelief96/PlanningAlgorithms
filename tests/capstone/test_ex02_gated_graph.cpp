#include <set>

#include "planning/airport/airport_map.hpp"
#include "planning/airport/taxi_planner.hpp"
#include "test_harness.hpp"

using namespace planning::airport;

namespace {

TaxiGraph gated() {
  const maps::Airport& airport = maps::kilo();
  return buildGatedGraph(airport.graph, airport.zones);
}

VertexId gateNear(const TaxiGraph& graph, double x, double y) {
  for (const Vertex& v : graph.vertices())
    if (v.gate != GateKind::None && distance(v.p, Vec2{x, y}) < 0.5) return v.id;
  return kNoVertex;
}

int countGates(const TaxiGraph& graph, GateKind kind) {
  int n = 0;
  for (const Vertex& v : graph.vertices())
    if (v.gate == kind) ++n;
  return n;
}

}  // namespace

TEST(every_zone_crossing_becomes_a_vertex) {
  const maps::Airport& airport = maps::kilo();
  const TaxiGraph g = gated();

  // The raw chart has 24 vertices and 25 edges.  Twelve of those edges cross a
  // zone boundary somewhere in the middle, which adds twelve vertices and
  // twelve edges.
  CHECK_EQ(airport.graph.numVertices(), 24);
  CHECK_EQ(airport.graph.numEdges(), 25);
  CHECK_EQ(g.numVertices(), 36);
  CHECK_EQ(g.numEdges(), 37);
}

TEST(kilo_field_has_five_soft_gates_and_eight_hard_ones) {
  const TaxiGraph g = gated();
  CHECK_EQ(countGates(g, GateKind::Soft), 5);
  CHECK_EQ(countGates(g, GateKind::Hard), 8);
}

TEST(the_splits_land_on_the_boundary) {
  const TaxiGraph g = gated();
  // Taxiway B crosses runway 18/36: taxiway to protected at x = 1525, protected
  // to runway at 1575, out again at 1625 and 1675.
  CHECK(gateNear(g, 1525, 400) != kNoVertex);
  CHECK(gateNear(g, 1575, 400) != kNoVertex);
  CHECK(gateNear(g, 1625, 400) != kNoVertex);
  CHECK(gateNear(g, 1675, 400) != kNoVertex);
  // Taxiway E onto runway 09/27: the holding position at y = 425, the runway
  // edge at 475.
  CHECK(gateNear(g, 2300, 425) != kNoVertex);
  CHECK(gateNear(g, 2300, 475) != kNoVertex);
}

TEST(a_gate_knows_which_side_is_which) {
  const TaxiGraph g = gated();
  const Vertex& hs = g.vertex(gateNear(g, 1525, 400));
  CHECK(hs.gate == GateKind::Hard);
  CHECK(hs.innerZone == ZoneClass::Taxiway);
  CHECK(hs.outerZone == ZoneClass::RunwayProtected);

  const Vertex& edge = g.vertex(gateNear(g, 1575, 400));
  CHECK(edge.innerZone == ZoneClass::RunwayProtected);
  CHECK(edge.outerZone == ZoneClass::Runway);
}

TEST(a_painted_holding_position_gives_the_gate_its_name) {
  const TaxiGraph g = gated();
  const Vertex& painted = g.vertex(gateNear(g, 1525, 400));
  CHECK(painted.holdShortId >= 0);
  CHECK_EQ(painted.name, std::string("HS 36 W"));

  // The runway *edge* is a hard gate too, but nobody painted a line there.
  const Vertex& unpainted = g.vertex(gateNear(g, 1575, 400));
  CHECK(unpainted.gate == GateKind::Hard);
  CHECK_EQ(unpainted.holdShortId, -1);
}

TEST(a_hard_gate_knows_which_runway_is_behind_it) {
  const TaxiGraph g = gated();
  const std::vector<std::string> thirtySix = g.vertex(gateNear(g, 1525, 400)).protects;
  CHECK(std::find(thirtySix.begin(), thirtySix.end(), "36") != thirtySix.end());

  const std::vector<std::string> twentySeven = g.vertex(gateNear(g, 2300, 425)).protects;
  CHECK(std::find(twentySeven.begin(), twentySeven.end(), "27") != twentySeven.end());
  CHECK(std::find(twentySeven.begin(), twentySeven.end(), "36") == twentySeven.end());
}

TEST(the_apron_and_stand_boundaries_are_soft) {
  const TaxiGraph g = gated();
  const VertexId apronExit = gateNear(g, 500, 200);
  CHECK(apronExit != kNoVertex);
  CHECK(g.vertex(apronExit).gate == GateKind::Soft);

  const VertexId standGate = gateNear(g, 290, 130);
  CHECK(standGate != kNoVertex);
  CHECK(g.vertex(standGate).gate == GateKind::Soft);
  CHECK(g.vertex(standGate).outerZone == ZoneClass::Stand);

  // The de-icing pad boundary too: allowed, but only if the mission asks.
  CHECK(gateNear(g, 680, 235) != kNoVertex);
}

TEST(a_junction_between_two_taxiways_is_not_a_gate) {
  const TaxiGraph g = gated();
  CHECK_EQ(gateNear(g, 1400, 400), kNoVertex);  // D meets B
  CHECK_EQ(gateNear(g, 1000, 200), kNoVertex);  // A meets F
  CHECK_EQ(gateNear(g, 1600, 400), kNoVertex);  // B meets the 36 centreline -- all runway
}

TEST(every_edge_carries_the_zone_of_its_own_midpoint) {
  const TaxiGraph g = gated();
  std::set<ZoneClass> seen;
  for (const Edge& e : g.edges()) {
    CHECK(e.zone != ZoneClass::Unknown);
    seen.insert(e.zone);
  }
  CHECK(seen.count(ZoneClass::Stand) == 1);
  CHECK(seen.count(ZoneClass::Apron) == 1);
  CHECK(seen.count(ZoneClass::Taxiway) == 1);
  CHECK(seen.count(ZoneClass::RunwayProtected) == 1);
  CHECK(seen.count(ZoneClass::Runway) == 1);
  CHECK(seen.count(ZoneClass::DeIcing) == 1);
}

TEST(flags_come_from_the_whole_edge_and_not_just_its_midpoint) {
  const TaxiGraph g = gated();
  // The hotspot sits on the F/B junction.  Taxiway F runs from y = 200 to
  // y = 400 and only its last fifty metres are inside, so a midpoint test
  // would miss it.
  int hotspots = 0;
  int closed = 0;
  for (const Edge& e : g.edges()) {
    if (e.hotspot) ++hotspots;
    if (e.closed) ++closed;
  }
  CHECK_MSG(hotspots >= 2, "expected the F and B edges at the junction to be flagged");
  CHECK_MSG(closed == 1, "the closed west end of the apron should block exactly one edge");
}

TEST(split_edges_inherit_the_limits_of_their_parent) {
  const TaxiGraph g = gated();
  for (const Edge& e : g.edges()) {
    if (e.taxiway == "F") CHECK(e.oneWay);
    if (e.taxiway == "E") CHECK_NEAR(e.maxWingspan, 52.0);
    if (e.taxiway == "RWY 09/27") CHECK_NEAR(e.maxWingspan, 80.0);
  }
}
