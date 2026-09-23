#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "test_harness.hpp"

using namespace planning;

TEST(astar_is_optimal_when_the_estimate_never_overshoots) {
  const GridProblem problem = GridProblem::fromAscii(maps::standArea());
  const Plan plan = aStar(problem, problem.manhattan());

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, 9.0);
}

TEST(astar_with_no_estimate_at_all_is_just_dijkstra) {
  const GridProblem problem = GridProblem::fromAscii(maps::deadEndPier());
  const Plan blind = aStar(problem, zeroHeuristic());
  const Plan reference = dijkstra(problem);

  CHECK(blind.found);
  CHECK_NEAR(blind.cost, reference.cost);
}

TEST(astar_is_optimal_inside_the_dead_end_pier_too) {
  const GridProblem problem = GridProblem::fromAscii(maps::deadEndPier());
  const Plan guided = aStar(problem, problem.manhattan());
  const Plan reference = dijkstra(problem);

  CHECK(guided.found);
  CHECK_VALID_PLAN(problem, guided);
  CHECK_NEAR(guided.cost, reference.cost);
}

TEST(a_better_estimate_searches_less_of_the_apron) {
  // On open pavement the square-corner estimate is *exact*, so it should steer
  // A* almost straight at the holding position instead of fanning out over the
  // whole apron.  The measurable version of book Exercise 18.
  const GridProblem problem = GridProblem::fromAscii(maps::openApron());
  const Plan blind = aStar(problem, zeroHeuristic());
  const Plan guided = aStar(problem, problem.manhattan());

  CHECK(guided.found);
  CHECK_NEAR(guided.cost, blind.cost);
  CHECK_MSG(guided.expanded < blind.expanded,
            "guided expanded " + std::to_string(guided.expanded) + ", blind expanded " +
                std::to_string(blind.expanded));
}

TEST(the_straight_line_estimate_is_also_safe_just_weaker) {
  // Straight-line distance is a distance no taxiing aeroplane can achieve, so
  // it never overestimates and A* stays optimal.  It also tells the search
  // less, so the search does more work.  [book] Exercise 18(b).
  const GridProblem problem = GridProblem::fromAscii(maps::openApron());
  const Plan plan = aStar(problem, problem.euclidean());
  const Plan reference = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, reference.cost);
}

TEST(best_first_finds_a_route_and_promises_nothing_about_it) {
  const GridProblem problem = GridProblem::fromAscii(maps::deadEndPier());
  const Plan plan = bestFirstSearch(problem, problem.manhattan());
  const Plan reference = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK(plan.cost >= reference.cost - 1e-9);
}
