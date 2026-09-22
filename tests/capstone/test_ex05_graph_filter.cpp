#include "capstone/capstone_fixture.hpp"
#include "test_harness.hpp"

using namespace planning::airport;
using capstone::Fixture;

namespace {

// The directed edge of `label` nearest a point, in the direction that goes
// from `from` toward `to`.
DirectedEdge directed(const Fixture& f, const std::string& label, Vec2 from, Vec2 to) {
  DirectedEdge best;
  double bestDistance = 1e300;
  for (const Edge& e : f.gated.edges()) {
    if (e.taxiway != label) continue;
    for (const bool forward : {true, false}) {
      const DirectedEdge d{e.id, forward};
      const double score =
          distance(f.gated.tailPoint(d), from) + distance(f.gated.headPoint(d), to);
      if (score >= bestDistance) continue;
      bestDistance = score;
      best = d;
    }
  }
  return best;
}

}  // namespace

TEST(an_ordinary_taxiway_edge_survives_in_both_directions) {
  const Fixture f;
  const DirectedEdge east = directed(f, "A", Vec2{680, 200}, Vec2{1000, 200});
  CHECK(f.filter.allows(east));
  CHECK(f.filter.allows(east.reversed()));
}

TEST(a_one_way_taxiway_is_blocked_the_other_way) {
  const Fixture f;
  const DirectedEdge north = directed(f, "F", Vec2{1000, 200}, Vec2{1000, 400});
  CHECK(f.filter.allows(north));
  CHECK(!f.filter.allows(north.reversed()));
  CHECK_MSG(!AT(f.filter.reason, north.reversed().index()).empty(),
            "every blocked edge needs a reason a human can read");
}

TEST(a_closed_edge_is_blocked_both_ways) {
  const Fixture f;
  const DirectedEdge west = directed(f, "APRON", Vec2{170, 200}, Vec2{110, 200});
  CHECK(!f.filter.allows(west));
  CHECK(!f.filter.allows(west.reversed()));
}

TEST(a_wingspan_that_does_not_fit_blocks_the_taxiway) {
  const Fixture wide("TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27",
                     Pose{{290.0, 95.0}, 0.5 * kPi}, b777());
  const DirectedEdge east = directed(wide, "A", Vec2{680, 200}, Vec2{1000, 200});
  CHECK(!wide.filter.allows(east));
  CHECK_MSG(AT(wide.filter.reason, east.index()).find("wingspan") != std::string::npos,
            "say which limit it was");
}

TEST(de_icing_is_blocked_unless_the_mission_asks_for_it) {
  const Fixture plain;
  const DirectedEdge onto = directed(plain, "DEICE", Vec2{680, 235}, Vec2{680, 280});
  CHECK(!plain.filter.allows(onto));

  const Fixture deiced(
      "TAXI TO RUNWAY 27 VIA A DEICE A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27");
  CHECK(deiced.filter.allows(directed(deiced, "DEICE", Vec2{680, 235}, Vec2{680, 280})));
}

TEST(an_unauthorized_hard_gate_blocks_the_way_in) {
  // "Hold short of runway 27": the protected edge beyond the holding position
  // on taxiway E must be unreachable.
  const Fixture f;
  const DirectedEdge inward = directed(f, "E", Vec2{2300, 425}, Vec2{2300, 475});
  CHECK(!f.filter.allows(inward));
  CHECK_MSG(AT(f.filter.reason, inward.index()).find("crossing") != std::string::npos,
            "name the gate that stopped it");
}

TEST(a_hard_gate_never_blocks_the_way_out) {
  // The same gate, travelled the other way.  An aeroplane that has just landed
  // has to be able to leave the runway without asking permission to do so.
  const Fixture f;
  const DirectedEdge outward = directed(f, "E", Vec2{2300, 475}, Vec2{2300, 425});
  CHECK(f.filter.allows(outward));
}

TEST(an_authorized_crossing_is_open_in_both_directions) {
  const Fixture f;
  const DirectedEdge east = directed(f, "B", Vec2{1525, 400}, Vec2{1575, 400});
  CHECK(f.filter.allows(east));
  CHECK(f.filter.allows(east.reversed()));
}

TEST(a_square_corner_is_feasible_and_a_reversal_is_not) {
  const Fixture f;
  const AircraftModel jet = a320();
  const DirectedEdge alongA = directed(f, "A", Vec2{1000, 200}, Vec2{1400, 200});
  const DirectedEdge ontoD = directed(f, "D", Vec2{1400, 200}, Vec2{1400, 400});

  CHECK(turnIsFeasible(f.gated, alongA, ontoD, jet));
  CHECK_MSG(!turnIsFeasible(f.gated, alongA, alongA.reversed(), jet),
            "you cannot turn round on the spot");
  CHECK_MSG(!turnIsFeasible(f.gated, ontoD, alongA, jet),
            "these do not meet head to tail in this order");
}

TEST(a_corner_needs_room_for_the_fillet) {
  // The stub of taxiway E between the holding position and the runway edge is
  // fifty metres long.  A 20 m turn radius fits a right angle into it; a 60 m
  // radius does not, and that is a route the aircraft cannot fly.
  const Fixture f;
  const DirectedEdge alongB = directed(f, "B", Vec2{1800, 400}, Vec2{2300, 400});
  const DirectedEdge ontoE = directed(f, "E", Vec2{2300, 400}, Vec2{2300, 425});

  AircraftModel nimble = a320();
  nimble.minTurnRadius = 20.0;
  CHECK(turnIsFeasible(f.gated, alongB, ontoE, nimble));

  AircraftModel lumbering = a320();
  lumbering.minTurnRadius = 60.0;
  CHECK(!turnIsFeasible(f.gated, alongB, ontoE, lumbering));
}
