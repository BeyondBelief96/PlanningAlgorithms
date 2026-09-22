#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "test_harness.hpp"

using namespace planning;

TEST(dijkstra_prefers_the_cheap_four_step_route_on_figure_2_21) {
  const GraphProblem problem = figure2_21();
  const Plan plan = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  // a -> b -> c -> d -> e costs 2 + 4 + 3 + 1 = 10, beating the three-action
  // route a -> b -> c -> e at 2 + 4 + 7 = 13.
  CHECK_NEAR(plan.cost, 10.0);
  CHECK_EQ(plan.length(), 4);
}

TEST(dijkstra_matches_the_optimal_cost_to_go_of_figure_2_14) {
  const GraphProblem problem = figure2_8();  // x_I = a, X_G = {d}
  const Plan plan = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  // Figure 2.14 gives G*(a) = 4, by a -> b -> c -> d.
  CHECK_NEAR(plan.cost, 4.0);
  CHECK_EQ(plan.length(), 3);
}

TEST(dijkstra_is_optimal_on_the_grid) {
  const GridProblem problem = GridProblem::fromAscii(maps::tiny());
  const Plan plan = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, 9.0);
}

TEST(dijkstra_handles_diagonal_steps) {
  const GridProblem problem = GridProblem::fromAscii(maps::openRoom(), /*eightConnected=*/true);
  const Plan plan = dijkstra(problem);
  const Plan breadth = breadthFirstSearch(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  // Breadth first minimises the number of actions; with sqrt(2) diagonals that
  // is no longer the same thing as minimising cost.
  CHECK(plan.cost <= breadth.cost + 1e-9);
}

TEST(dijkstra_reports_failure_when_no_plan_exists) {
  GraphProblem problem = figure2_8();
  problem.setInitialState(problem.stateByName("e"));
  CHECK(!dijkstra(problem).found);
}
