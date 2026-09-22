#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "test_harness.hpp"

using namespace planning;

TEST(bfs_finds_the_fewest_actions_on_figure_2_21) {
  const GraphProblem problem = figure2_21();  // x_I = a, X_G = {e}
  const Plan plan = breadthFirstSearch(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  // a -> b -> c -> e is three actions.  The cheaper route a -> b -> c -> d -> e
  // costs 10 rather than 13, but takes four; breadth first does not care.
  CHECK_EQ(plan.length(), 3);
  CHECK_NEAR(plan.cost, 13.0);
}

TEST(bfs_walks_around_the_wall_on_the_tiny_map) {
  const GridProblem problem = GridProblem::fromAscii(maps::tiny());
  const Plan plan = breadthFirstSearch(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  // The Manhattan distance is 7, but the wall forces a detour to 9.
  CHECK_EQ(plan.length(), 9);
}

TEST(dfs_finds_a_valid_plan_even_if_a_silly_one) {
  const GridProblem problem = GridProblem::fromAscii(maps::tiny());
  const Plan plan = depthFirstSearch(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  // No length claim: which plan depth first returns depends entirely on the
  // order U(x) happens to be enumerated in.
  CHECK(plan.length() >= 9);
}

TEST(both_report_failure_when_no_plan_exists) {
  GraphProblem problem = figure2_8();
  problem.setInitialState(problem.stateByName("e"));  // e has no outgoing edges
  CHECK(!breadthFirstSearch(problem).found);
  CHECK(!depthFirstSearch(problem).found);
}

TEST(search_reports_how_much_work_it_did) {
  const GridProblem problem = GridProblem::fromAscii(maps::openRoom());
  const Plan plan = breadthFirstSearch(problem);
  CHECK(plan.found);
  CHECK(plan.expanded > 0);
  CHECK(plan.generated >= plan.expanded);
}
