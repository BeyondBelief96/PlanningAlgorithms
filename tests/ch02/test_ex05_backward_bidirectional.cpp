#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "test_harness.hpp"

using namespace planning;

TEST(backward_dijkstra_finds_the_same_optimal_cost) {
  const GraphProblem problem = figure2_21();
  const Plan backward = backwardDijkstra(problem);
  const Plan forward = dijkstra(problem);

  CHECK(backward.found);
  CHECK_VALID_PLAN(problem, backward);
  CHECK_NEAR(backward.cost, forward.cost);
  CHECK_NEAR(backward.cost, 10.0);
}

TEST(backward_dijkstra_on_the_grid) {
  const GridProblem problem = GridProblem::fromAscii(maps::bugTrap());
  const Plan backward = backwardDijkstra(problem);
  const Plan forward = dijkstra(problem);

  CHECK(backward.found);
  CHECK_VALID_PLAN(problem, backward);
  CHECK_NEAR(backward.cost, forward.cost);
}

TEST(backward_dijkstra_reports_failure_when_the_goal_is_unreachable) {
  GraphProblem problem = figure2_8();
  problem.setInitialState(problem.stateByName("e"));  // nothing leaves e
  CHECK(!backwardDijkstra(problem).found);
}

TEST(bidirectional_search_matches_breadth_first_on_plan_length) {
  const GridProblem problem = GridProblem::fromAscii(maps::openRoom());
  const Plan both = bidirectionalSearch(problem);
  const Plan reference = breadthFirstSearch(problem);

  CHECK(both.found);
  CHECK_VALID_PLAN(problem, both);
  CHECK_EQ(both.length(), reference.length());
}

TEST(bidirectional_search_explores_less_than_one_wavefront_would) {
  // Book Exercise 20.  Two small wavefronts beat one large one, because the
  // number of states at radius r grows with r.
  const GridProblem problem = GridProblem::fromAscii(maps::openRoom());
  const Plan both = bidirectionalSearch(problem);
  const Plan reference = breadthFirstSearch(problem);

  CHECK_MSG(both.expanded <= reference.expanded,
            "bidirectional expanded " + std::to_string(both.expanded) +
                ", breadth first expanded " + std::to_string(reference.expanded));
}

TEST(bidirectional_search_on_a_directed_graph) {
  const GraphProblem problem = figure2_21();
  const Plan plan = bidirectionalSearch(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_EQ(plan.length(), 3);
}
