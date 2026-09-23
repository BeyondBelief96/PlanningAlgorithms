#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "test_harness.hpp"

using namespace planning;

TEST(dijkstra_takes_the_bypass_because_it_counts_minutes) {
  const GraphProblem problem = bypassTaxi();
  const Plan plan = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  // STAND 1, APRON, TWY A, TWY B, HS 36 W: 2 + 4 + 3 + 1 = 10 minutes.  One leg
  // longer than staying on A, and three minutes quicker.  This is the first
  // moment in the chapter where the cost function decides anything.
  CHECK_NEAR(plan.cost, 10.0);
  CHECK_EQ(plan.length(), 4);
}

TEST(dijkstra_taxis_out_in_four_minutes) {
  const GraphProblem problem = departureTaxi();  // stand 2 to HS 27 E
  const Plan plan = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  // APRON, TWY A, HS 27 E: 2 + 1 + 1.  Straight out on the apron lanes is one
  // leg shorter and twice as slow.
  // [book] Figure 2.14 gives G*(a) = 4 for exactly this.
  CHECK_NEAR(plan.cost, 4.0);
  CHECK_EQ(plan.length(), 3);
}

TEST(dijkstra_is_optimal_on_the_surface_too) {
  const GridProblem problem = GridProblem::fromAscii(maps::standArea());
  const Plan plan = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, 9.0);
}

TEST(dijkstra_handles_diagonal_moves) {
  const GridProblem problem = GridProblem::fromAscii(maps::openApron(), /*eightConnected=*/true);
  const Plan plan = dijkstra(problem);
  const Plan breadth = breadthFirstSearch(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  // Breadth first minimises the number of moves.  Once a diagonal costs
  // sqrt(2) that stops being the same thing as minimising taxi time, and only
  // one of the two methods notices.
  CHECK(plan.cost <= breadth.cost + 1e-9);
}

TEST(dijkstra_refuses_when_there_is_no_route) {
  GraphProblem problem = departureTaxi();
  problem.setInitialState(problem.stateByName("RWY 27"));  // nothing leaves the runway
  CHECK(!dijkstra(problem).found);
}
