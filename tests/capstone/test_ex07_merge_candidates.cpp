#include <algorithm>

#include "capstone/capstone_fixture.hpp"
#include "test_harness.hpp"

using namespace planning::airport;
using capstone::Fixture;

namespace {

constexpr double kDeg = kPi / 180.0;
const char* kDeparture = "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27";

std::vector<MergeCandidate> candidatesFor(const Fixture& f) {
  return generateMergeCandidates(f.gated, f.zones(), f.aircraft, f.localization, f.permissions,
                                 f.filter, f.costToGo);
}

}  // namespace

TEST(a_stand_start_looks_at_stand_and_apron_lines_only) {
  const Fixture f(kDeparture, Pose{{290, 95}, 90 * kDeg});
  CHECK(f.localization.mode == StartMode::Stand);
  const std::vector<MergeCandidate> candidates = candidatesFor(f);
  CHECK(!candidates.empty());
  for (const MergeCandidate& c : candidates) {
    const ZoneClass zone = f.gated.edge(c.edge.edge).zone;
    CHECK_MSG(zone == ZoneClass::Stand || zone == ZoneClass::Apron,
              std::string("a stand start produced a candidate on ") + toString(zone));
  }
}

TEST(an_apron_start_never_aims_at_a_taxiway) {
  const Fixture f(kDeparture, Pose{{350, 240}, 45 * kDeg});
  CHECK(f.localization.mode == StartMode::Apron);
  for (const MergeCandidate& c : candidatesFor(f))
    CHECK(f.gated.edge(c.edge.edge).zone == ZoneClass::Apron);
}

TEST(nothing_off_a_runway_ever_produces_a_runway_candidate) {
  for (const Pose& start :
       {Pose{{290, 95}, 90 * kDeg}, Pose{{350, 240}, 45 * kDeg}, Pose{{800, 206}, 8 * kDeg}}) {
    const Fixture f(kDeparture, start);
    for (const MergeCandidate& c : candidatesFor(f)) {
      const ZoneClass zone = f.gated.edge(c.edge.edge).zone;
      CHECK(zone != ZoneClass::Runway);
      CHECK(zone != ZoneClass::RunwayProtected);
    }
  }
}

TEST(no_candidate_lies_across_a_holding_position) {
  // On taxiway B, 75 m short of the runway 36 holding position, and cleared to
  // cross it.  Even so, the *free-space* half of the plan may not reach past
  // the line: the crossing happens on the graph, at the gate, or not at all.
  const Fixture f("TAXI TO RUNWAY 27 VIA B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27",
                  Pose{{1450, 400}, 0.0});
  CHECK(f.localization.mode == StartMode::TaxiwayCapture);
  const std::vector<MergeCandidate> candidates = candidatesFor(f);
  CHECK(!candidates.empty());
  for (const MergeCandidate& c : candidates)
    CHECK_MSG(c.target.p.x < 1525.0, "a candidate was generated beyond HS 36 W");
}

TEST(inside_the_protected_area_there_is_nowhere_legal_to_go) {
  // Between the two holding positions for runway 36, with no crossing
  // clearance.  Nothing ahead is reachable and nothing behind is a candidate.
  const Fixture f("TAXI TO RUNWAY 27 VIA B E HOLD SHORT RUNWAY 27", Pose{{1550, 400}, 0.0});
  CHECK(f.localization.mode == StartMode::Runway);
  CHECK(candidatesFor(f).empty());
}

TEST(on_a_runway_every_candidate_is_ahead) {
  const Fixture f("TAXI TO STAND 2 VIA C B D A CROSS RUNWAY 36", Pose{{1150, 500}, 0.0});
  CHECK(f.localization.mode == StartMode::Runway);
  const std::vector<MergeCandidate> candidates = candidatesFor(f);
  CHECK(!candidates.empty());
  for (const MergeCandidate& c : candidates) {
    CHECK_MSG(alongTrack(f.localization.pose, c.target.p) > 0.0,
              "forward only: you cannot pick an exit behind you");
    CHECK(f.gated.edge(c.edge.edge).zone == ZoneClass::Runway);
  }
}

TEST(candidates_keep_clear_of_junctions_and_have_room_to_settle) {
  const Fixture f(kDeparture, Pose{{800, 206}, 8 * kDeg});
  const std::vector<MergeCandidate> candidates = candidatesFor(f);
  CHECK(!candidates.empty());
  for (const MergeCandidate& c : candidates) {
    const double length = f.gated.length(c.edge.edge);
    CHECK(c.s >= kJunctionExclusion - 1e-9);
    CHECK(c.s <= length - kJunctionExclusion + 1e-9);
    CHECK(c.leadIn >= kMinLeadIn - 1e-9);
  }
}

TEST(the_lead_in_follows_collinear_edges_across_junctions) {
  // Taxiway A is cut in three by the de-icing junction and the F junction, so
  // an edge-by-edge lead-in would understate it badly.  Merging 25 m into the
  // 400 m stretch from A1 to A2 leaves 375 m of A, and nothing after it is
  // collinear, so that is the answer.
  const Fixture f(kDeparture, Pose{{1050, 206}, 0.0});
  const std::vector<MergeCandidate> candidates = candidatesFor(f);
  CHECK(!candidates.empty());
  double best = 0.0;
  for (const MergeCandidate& c : candidates) best = std::max(best, c.leadIn);
  CHECK_MSG(best > 200.0, "the lead-in should run to the end of taxiway A, not the next vertex");
}

TEST(candidates_arrive_cheapest_first) {
  const Fixture f(kDeparture, Pose{{350, 240}, 45 * kDeg});
  const std::vector<MergeCandidate> candidates = candidatesFor(f);
  CHECK(candidates.size() > 1);
  const double rate = zoneCostRate(f.localization.zone);
  double previous = -1.0;
  for (const MergeCandidate& c : candidates) {
    const double score = c.costToGo + distance(f.localization.pose.p, c.target.p) * rate;
    CHECK(score >= previous - 1e-9);
    previous = score;
  }
}

TEST(every_candidate_carries_a_usable_route_index) {
  const Fixture f(kDeparture, Pose{{290, 95}, 90 * kDeg});
  for (const MergeCandidate& c : candidatesFor(f)) {
    CHECK(c.routeIndex >= 0);
    CHECK_EQ(c.routeIndex,
             advanceRouteIndex(f.gated.edge(c.edge.edge), 0, f.permissions.routeLabels));
    CHECK(f.costToGo.reachable(c.edge, c.routeIndex));
  }
}

TEST(a_fault_produces_nothing_at_all) {
  const Fixture f(kDeparture, Pose{{800, 228}, 0.0});
  CHECK(f.localization.mode == StartMode::Fault);
  CHECK(candidatesFor(f).empty());
}
