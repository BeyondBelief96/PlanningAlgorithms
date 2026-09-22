// Exercise 09 builds its own little world: a rectangle of apron with a wall
// across most of it.  Nothing here depends on Kilo Field or on the rest of the
// pipeline, because the point of the exercise is the search, not the map.
#include <cmath>

#include "planning/airport/taxi_planner.hpp"
#include "test_harness.hpp"

using namespace planning::airport;

namespace {

// An apron 400 by 200, with a wall from the south edge up to `wallTop`.
ZoneLayer yard(double wallTop) {
  ZoneLayer layer;
  ZonePolygon apron;
  apron.zone = ZoneClass::Apron;
  apron.name = "APRON";
  apron.outline = makeRectangle(0, 0, 400, 200);
  layer.add(apron);

  if (wallTop > 0.0) {
    ZonePolygon wall;
    wall.zone = ZoneClass::Forbidden;
    wall.name = "WALL";
    wall.outline = makeRectangle(180, 0, 220, wallTop);
    layer.add(wall);
  }
  layer.build();
  return layer;
}

MergeCandidate at(double x, double y, double heading) {
  MergeCandidate c;
  c.target = Pose{{x, y}, heading};
  return c;
}

HybridAStarParams params() {
  HybridAStarParams p;
  p.radius = 25.0;
  p.primitiveLength = 8.0;
  p.positionResolution = 4.0;
  p.maxExpansions = 40000;
  return p;
}

bool stayedInside(const ZoneLayer& layer, const Path& path, ZoneClass zone) {
  for (double s = 0.0; s <= path.length() + 1e-9; s += 1.0)
    if (zoneAt(layer, path.at(s).p).zone != zone) return false;
  return true;
}

}  // namespace

TEST(an_open_yard_is_solved_by_the_analytic_expansion_alone) {
  const ZoneLayer layer = yard(0.0);
  const MergeCandidate goal = at(350, 50, 0.0);
  const MergePath merge =
      planHybridAStar(layer, Pose{{50, 50}, 0.0}, goal, {ZoneClass::Apron}, params());

  CHECK(merge.found);
  CHECK(merge.method == MergeMethod::HybridAStar);
  CHECK_NEAR(merge.path.length(), 300.0);
}

TEST(the_search_goes_round_the_wall) {
  const ZoneLayer layer = yard(150.0);
  const MergeCandidate goal = at(350, 50, 0.0);
  const Pose start{{50, 50}, 0.0};

  // The wall sits exactly between the two, so the straight answer is not open.
  CHECK(zoneAt(layer, Vec2{200, 50}).zone == ZoneClass::Forbidden);

  const MergePath merge = planHybridAStar(layer, start, goal, {ZoneClass::Apron}, params());
  CHECK(merge.found);
  CHECK_MSG(merge.path.length() > 300.0, "a path round the wall has to be longer than through it");
  CHECK(stayedInside(layer, merge.path, ZoneClass::Apron));
}

TEST(the_result_lands_exactly_on_the_merge_pose) {
  const ZoneLayer layer = yard(150.0);
  const MergeCandidate goal = at(350, 50, 20.0 * kPi / 180.0);
  const MergePath merge =
      planHybridAStar(layer, Pose{{50, 50}, 0.0}, goal, {ZoneClass::Apron}, params());

  CHECK(merge.found);
  const Pose end = merge.path.endPose();
  CHECK_MSG(distance(end.p, goal.target.p) < 1e-3,
            "hybrid A* reaches a *region*; the analytic expansion is what makes it exact");
  CHECK(std::fabs(wrapAngle(end.heading - goal.target.heading)) < 1e-3);
}

TEST(the_search_cannot_leave_the_zone_it_was_given) {
  // Same yard, but the goal is on the far side of the wall and the wall now
  // reaches the north edge.  There is no way round, and no amount of searching
  // should produce one.
  const ZoneLayer layer = yard(200.0);
  const MergeCandidate goal = at(350, 50, 0.0);
  const MergePath merge =
      planHybridAStar(layer, Pose{{50, 50}, 0.0}, goal, {ZoneClass::Apron}, params());
  CHECK(!merge.found);
  CHECK_MSG(!merge.detail.empty(), "say that the search gave up, and after how much work");
}

TEST(a_start_outside_the_allowed_zones_is_refused_at_once) {
  const ZoneLayer layer = yard(150.0);
  const MergePath merge =
      planHybridAStar(layer, Pose{{200, 50}, 0.0}, at(350, 50, 0.0), {ZoneClass::Apron}, params());
  CHECK(!merge.found);
}

TEST(every_primitive_respects_the_turn_radius) {
  const ZoneLayer layer = yard(150.0);
  const HybridAStarParams p = params();
  const MergePath merge =
      planHybridAStar(layer, Pose{{50, 50}, 0.0}, at(350, 50, 0.0), {ZoneClass::Apron}, p);
  CHECK(merge.found);
  CHECK_MSG(merge.path.maxAbsCurvature() <= 1.0 / p.radius + 1e-6,
            "a motion primitive the aircraft cannot fly is not a motion primitive");
}

TEST(the_expansion_budget_is_honoured) {
  // One expansion is not enough to get anywhere, and the search must come back
  // rather than run away.
  const ZoneLayer layer = yard(150.0);
  HybridAStarParams p = params();
  p.maxExpansions = 1;
  const MergePath merge =
      planHybridAStar(layer, Pose{{50, 190}, kPi}, at(350, 50, 0.0), {ZoneClass::Apron}, p);
  CHECK(!merge.found);
}
