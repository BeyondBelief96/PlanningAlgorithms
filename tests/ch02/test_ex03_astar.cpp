#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "test_harness.hpp"

using namespace planning;

TEST(astar_is_optimal_with_an_admissible_heuristic) {
  const GridProblem problem = GridProblem::fromAscii(maps::tiny());
  const Plan plan = aStar(problem, problem.manhattan());

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, 9.0);
}

TEST(astar_with_a_zero_heuristic_is_dijkstra) {
  const GridProblem problem = GridProblem::fromAscii(maps::bugTrap());
  const Plan blind = aStar(problem, zeroHeuristic());
  const Plan reference = dijkstra(problem);

  CHECK(blind.found);
  CHECK_NEAR(blind.cost, reference.cost);
}

TEST(astar_is_optimal_on_the_bug_trap_too) {
  const GridProblem problem = GridProblem::fromAscii(maps::bugTrap());
  const Plan guided = aStar(problem, problem.manhattan());
  const Plan reference = dijkstra(problem);

  CHECK(guided.found);
  CHECK_VALID_PLAN(problem, guided);
  CHECK_NEAR(guided.cost, reference.cost);
}

TEST(a_better_heuristic_explores_less) {
  // Book Exercise 18.  In a wide-open room the Manhattan estimate is exact, so
  // it should steer A* almost straight at the goal.
  const GridProblem problem = GridProblem::fromAscii(maps::openRoom());
  const Plan blind = aStar(problem, zeroHeuristic());
  const Plan guided = aStar(problem, problem.manhattan());

  CHECK(guided.found);
  CHECK_NEAR(guided.cost, blind.cost);
  CHECK_MSG(guided.expanded < blind.expanded,
            "guided expanded " + std::to_string(guided.expanded) + ", blind expanded " +
                std::to_string(blind.expanded));
}

TEST(euclidean_is_also_admissible_on_a_four_connected_grid) {
  // Book Exercise 18(b).  It never overestimates, so A* stays optimal -- but it
  // is a weaker estimate than Manhattan, so it does more work.
  const GridProblem problem = GridProblem::fromAscii(maps::openRoom());
  const Plan plan = aStar(problem, problem.euclidean());
  const Plan reference = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, reference.cost);
}

TEST(best_first_finds_a_plan_but_promises_nothing_about_it) {
  const GridProblem problem = GridProblem::fromAscii(maps::bugTrap());
  const Plan plan = bestFirstSearch(problem, problem.manhattan());
  const Plan reference = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK(plan.cost >= reference.cost - 1e-9);
}
