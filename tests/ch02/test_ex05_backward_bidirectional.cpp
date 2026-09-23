#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "test_harness.hpp"

using namespace planning;

TEST(planning_from_the_holding_point_backwards_costs_the_same) {
  const GraphProblem problem = bypassTaxi();
  const Plan backward = backwardDijkstra(problem);
  const Plan forward = dijkstra(problem);

  CHECK(backward.found);
  CHECK_VALID_PLAN(problem, backward);
  CHECK_NEAR(backward.cost, forward.cost);
  CHECK_NEAR(backward.cost, 10.0);
}

TEST(backward_dijkstra_on_the_surface) {
  const GridProblem problem = GridProblem::fromAscii(maps::deadEndPier());
  const Plan backward = backwardDijkstra(problem);
  const Plan forward = dijkstra(problem);

  CHECK(backward.found);
  CHECK_VALID_PLAN(problem, backward);
  CHECK_NEAR(backward.cost, forward.cost);
}

TEST(backward_dijkstra_refuses_when_the_aircraft_cannot_get_there) {
  // Searching backwards does not conjure an edge that is not on the chart.
  GraphProblem problem = departureTaxi();
  problem.setInitialState(problem.stateByName("RWY 27"));  // nothing leaves the runway
  CHECK(!backwardDijkstra(problem).found);
}

TEST(bidirectional_search_matches_breadth_first_on_leg_count) {
  const GridProblem problem = GridProblem::fromAscii(maps::openApron());
  const Plan both = bidirectionalSearch(problem);
  const Plan reference = breadthFirstSearch(problem);

  CHECK(both.found);
  CHECK_VALID_PLAN(problem, both);
  CHECK_EQ(both.length(), reference.length());
}

TEST(two_small_wavefronts_beat_one_large_one) {
  // The number of apron squares r moves from anywhere grows with r, so two
  // searches meeting in the middle touch far less pavement than one search
  // crossing the whole apron.  [book] Exercise 20.
  const GridProblem problem = GridProblem::fromAscii(maps::openApron());
  const Plan both = bidirectionalSearch(problem);
  const Plan reference = breadthFirstSearch(problem);

  CHECK_MSG(both.expanded <= reference.expanded,
            "bidirectional expanded " + std::to_string(both.expanded) +
                ", breadth first expanded " + std::to_string(reference.expanded));
}

TEST(bidirectional_search_on_a_one_way_taxi_graph) {
  const GraphProblem problem = bypassTaxi();
  const Plan plan = bidirectionalSearch(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_EQ(plan.length(), 3);
}
