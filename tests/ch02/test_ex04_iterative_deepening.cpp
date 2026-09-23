#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "test_harness.hpp"

using namespace planning;

TEST(iterative_deepening_matches_breadth_first_on_leg_count) {
  const GridProblem problem = GridProblem::fromAscii(maps::standArea());
  const Plan plan = iterativeDeepening(problem, 16);
  const Plan reference = breadthFirstSearch(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_EQ(plan.length(), reference.length());
}

TEST(iterative_deepening_on_the_taxi_graph) {
  const GraphProblem problem = bypassTaxi();
  const Plan plan = iterativeDeepening(problem, 16);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_EQ(plan.length(), 3);
}

TEST(iterative_deepening_gives_up_inside_its_depth_budget) {
  const GridProblem problem = GridProblem::fromAscii(maps::standArea());
  // The shortest route round the pier is nine moves, so a budget of four
  // cannot find it -- and must say so rather than return the best-so-far.
  CHECK(!iterativeDeepening(problem, 4).found);
}

TEST(ida_star_is_optimal) {
  const GridProblem problem = GridProblem::fromAscii(maps::standArea());
  const Plan plan = iterativeDeepeningAStar(problem, problem.manhattan());
  const Plan reference = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, reference.cost);
}

TEST(ida_star_counts_minutes_on_the_taxi_graph) {
  const GraphProblem problem = bypassTaxi();
  const Plan plan = iterativeDeepeningAStar(problem, zeroHeuristic());

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, 10.0);
}
