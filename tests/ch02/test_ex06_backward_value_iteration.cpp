#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "planning/value_iteration.hpp"
#include "test_harness.hpp"

using namespace planning;
using testing::INF;

// The departure taxi with a hard four-move budget: x_I = STAND 2, X_G =
// {HS 27 E}, K = 4.  Read a row as "if I have exactly this many moves left,
// what is the cheapest I can be holding short for, starting from each place?"
// Infinity means "not from there, not in that many moves".
//
// Columns are STAND 2, APRON, TWY A, HS 27 E, RWY 27.
// [book] These rows are Figure 2.9, transcribed in column order a b c d e.
TEST(backward_value_iteration_fills_the_table_row_by_row) {
  const GraphProblem problem = departureTaxi();
  const CostTable G = backwardValueIteration(problem, 4);

  CHECK_EQ(G.size(), std::size_t{5});
  CHECK_ROW(AT(G, 0), {INF, INF, INF, 0, INF});  // 0 moves left: only HS 27 E will do
  CHECK_ROW(AT(G, 1), {INF, 4, 1, INF, INF});    // 1 move left
  CHECK_ROW(AT(G, 2), {6, 2, INF, 2, INF});      // 2 moves left
  CHECK_ROW(AT(G, 3), {4, 6, 3, INF, INF});      // 3 moves left
  CHECK_ROW(AT(G, 4), {6, 4, 5, 4, INF});        // 4 moves left: this is the one we use
}

TEST(being_where_you_want_to_be_is_worthless_if_you_still_owe_four_moves) {
  // With a fixed budget there is no "and stop".  An aeroplane already holding
  // short of 27 with four moves left has to spend them, and nothing it can do
  // brings it back to the holding position -- there is no loop through HS 27 E
  // of the right length.  Hence infinity in a column that contains the goal.
  // Exercise 08 is what introduces the termination action and fixes this.
  const GraphProblem problem = departureTaxi();
  const CostTable G = backwardValueIteration(problem, 4);
  const State holdingPoint = problem.stateByName("HS 27 E");
  CHECK_NEAR(AT(AT(G, 0), holdingPoint), 0.0);
  CHECK_NEAR(AT(AT(G, 1), holdingPoint), INF);
}

TEST(the_recovered_route_uses_exactly_the_budget) {
  const GraphProblem problem = departureTaxi();
  const CostTable G = backwardValueIteration(problem, 4);
  const Plan plan = planFromBackwardValues(problem, G);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_EQ(plan.length(), 4);
  // Six minutes, not four.  The quick route out is three legs, so to spend a
  // budget of exactly four the aeroplane holds at the stand for two minutes
  // first and then taxis.  Padding is not free, which is the honest reason
  // nobody plans a taxi with a fixed move count.
  CHECK_NEAR(plan.cost, 6.0);
}

TEST(too_small_a_budget_means_no_route) {
  const GraphProblem problem = departureTaxi();
  const CostTable G = backwardValueIteration(problem, 1);
  CHECK(!planFromBackwardValues(problem, G).found);
}

TEST(with_enough_budget_it_agrees_with_dijkstra_on_the_surface) {
  const GridProblem problem = GridProblem::fromAscii(maps::standArea());
  const CostTable G = backwardValueIteration(problem, 9);
  const Plan plan = planFromBackwardValues(problem, G);
  const Plan reference = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, reference.cost);
}
