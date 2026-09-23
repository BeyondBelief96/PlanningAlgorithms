#include "planning/graphs.hpp"
#include "planning/value_iteration.hpp"
#include "test_harness.hpp"

using namespace planning;
using testing::INF;

// The same departure taxi, read the other way round: "starting from stand 2,
// what is the cheapest I can be standing at each place after exactly k moves?"
// Columns are STAND 2, APRON, TWY A, HS 27 E, RWY 27.
// [book] Figure 2.12, the cost-to-come tables for Example 2.3.
TEST(forward_value_iteration_fills_the_table_row_by_row) {
  const GraphProblem problem = departureTaxi();
  const CostTable C = forwardValueIteration(problem, 4);

  CHECK_EQ(C.size(), std::size_t{5});
  CHECK_ROW(AT(C, 0), {0, INF, INF, INF, INF});  // 0 moves: still on stand
  CHECK_ROW(AT(C, 1), {2, 2, INF, INF, INF});    // 1 move
  CHECK_ROW(AT(C, 2), {4, 4, 3, 6, INF});        // 2 moves
  CHECK_ROW(AT(C, 3), {4, 6, 5, 4, 7});          // 3 moves: holding short for 4
  CHECK_ROW(AT(C, 4), {6, 6, 5, 6, 5});          // 4 moves
}

TEST(the_cost_to_come_does_not_care_where_you_are_going) {
  // Re-clear the aircraft to a different destination and every row is
  // unchanged.  What it cost to get somewhere depends on where you started and
  // what the taxiways are, not on the clearance.  That asymmetry is the whole
  // difference between this table and the one in Exercise 06.
  const GraphProblem original = departureTaxi();
  GraphProblem moved = departureTaxi();
  moved.setGoalStates({moved.stateByName("APRON")});

  const CostTable a = forwardValueIteration(original, 4);
  const CostTable b = forwardValueIteration(moved, 4);
  CHECK_EQ(a.size(), b.size());
  for (std::size_t k = 0; k < a.size(); ++k) CHECK_ROW(a[k], AT(b, k));
}

TEST(both_directions_agree_on_the_taxi_time) {
  // The route choice: stand 1 to HS 36 W, four legs through TWY B for ten
  // minutes.  Counting forwards from the stand and counting backwards from the
  // holding point have to land on the same ten.
  //
  // Careful: these are *fixed-budget* tables, so the route must use exactly K
  // moves.  At K = 5 the answer is no longer 10 -- try it, and see what the
  // aeroplane has to do with the spare move.  Exercise 08 removes the budget.
  //
  // [book] Exercise 1, on Figure 2.21.
  const GraphProblem problem = bypassTaxi();
  const CostTable C = forwardValueIteration(problem, 4);
  const CostTable G = backwardValueIteration(problem, 4);

  const State stand = problem.stateByName("STAND 1");
  const State holdingPoint = problem.stateByName("HS 36 W");
  CHECK_NEAR(AT(AT(C, 4), holdingPoint), 10.0);
  CHECK_NEAR(AT(AT(G, 4), stand), 10.0);
}
