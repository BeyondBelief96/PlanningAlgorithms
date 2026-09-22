#include "capstone/capstone_fixture.hpp"
#include "test_harness.hpp"

using namespace planning::airport;
using capstone::Fixture;

TEST(the_route_labels_come_through_in_order) {
  const Fixture f;
  CHECK_EQ(f.permissions.routeLabels.size(), std::size_t{4});
  CHECK_EQ(AT(f.permissions.routeLabels, 0), std::string("A"));
  CHECK_EQ(AT(f.permissions.routeLabels, 1), std::string("D"));
  CHECK_EQ(AT(f.permissions.routeLabels, 2), std::string("B"));
  CHECK_EQ(AT(f.permissions.routeLabels, 3), std::string("E"));
}

TEST(cross_runway_36_opens_exactly_the_runway_36_gates) {
  const Fixture f;
  CHECK(f.permissions.allowsGate(f.gateNear(1525, 400)));
  CHECK(f.permissions.allowsGate(f.gateNear(1575, 400)));
  CHECK(f.permissions.allowsGate(f.gateNear(1625, 400)));
  CHECK(f.permissions.allowsGate(f.gateNear(1675, 400)));
  CHECK_EQ(f.permissions.authorizedGates.size(), std::size_t{4});
}

TEST(hold_short_of_27_opens_nothing_at_all) {
  const Fixture f;
  CHECK(!f.permissions.allowsGate(f.gateNear(2300, 425)));
  CHECK(!f.permissions.allowsGate(f.gateNear(2300, 475)));
  CHECK(!f.permissions.allowsGate(f.gateNear(1800, 425)));
  CHECK(f.permissions.enterableRunways.count("36") == 1);
  CHECK(f.permissions.enterableRunways.count("27") == 0);
}

TEST(the_unauthorized_painted_lines_become_mandatory_stops) {
  const Fixture f;
  // The two holding positions for runway 27; the runway *edges* behind them
  // have no painted line and are not somewhere you stop.
  CHECK_EQ(f.permissions.mandatoryStops.size(), std::size_t{2});
  CHECK(f.permissions.mandatoryStops.count(f.gateNear(2300, 425)) == 1);
  CHECK(f.permissions.mandatoryStops.count(f.gateNear(1800, 425)) == 1);
}

TEST(the_goal_is_the_holding_position_on_the_last_cleared_taxiway) {
  const Fixture f;
  // "...via A D B E, hold short of runway 27" means the holding position on E,
  // not the one on C, even though both protect runway 27.
  CHECK_EQ(f.permissions.goal, f.gateNear(2300, 425));
}

TEST(a_line_up_clearance_moves_the_goal_onto_the_runway) {
  const Fixture f("TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 LINE UP AND WAIT");
  CHECK(f.clearance.clearedToEnterDestination);
  CHECK(f.permissions.enterableRunways.count("27") == 1);
  CHECK_EQ(f.permissions.goal, f.gateNear(2300, 475));
  CHECK(f.permissions.allowsGate(f.gateNear(2300, 425)));
}

TEST(a_stand_clearance_ends_at_the_parking_position) {
  const Fixture f("TAXI TO STAND 2 VIA C B D A CROSS RUNWAY 36");
  CHECK(!f.clearance.destinationIsRunway);
  CHECK(f.permissions.goal != kNoVertex);
  const Vertex& goal = f.gated.vertex(f.permissions.goal);
  CHECK_NEAR(goal.p.x, 290.0);
  CHECK_NEAR(goal.p.y, 95.0);
  CHECK(zoneAt(f.zones(), goal.p).zone == ZoneClass::Stand);
}

TEST(a_clearance_that_names_nothing_reachable_has_no_goal) {
  const Fixture f("TAXI TO RUNWAY 27 VIA A HOLD SHORT RUNWAY 27");
  // There is no holding position for 27 on taxiway A.
  CHECK_EQ(f.permissions.goal, kNoVertex);
  CHECK_MSG(!f.permissions.detail.empty(), "say why, so the pipeline can report it");
}

TEST(de_icing_is_only_in_the_mission_when_the_clearance_says_so) {
  const Fixture plain;
  CHECK(!plain.permissions.deIcingInMission);

  const Fixture deiced(
      "TAXI TO RUNWAY 27 VIA A DEICE A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27");
  CHECK(deiced.permissions.deIcingInMission);
}
