#include "planning/graphs.hpp"
#include "planning/value_iteration.hpp"
#include "test_harness.hpp"

using namespace planning;
using testing::INF;

// Figure 2.12: the cost-to-come functions for Example 2.3, x_I = a, K = 4.
TEST(forward_value_iteration_reproduces_figure_2_12) {
  const GraphProblem problem = figure2_8();
  const CostTable C = forwardValueIteration(problem, 4);

  CHECK_EQ(C.size(), std::size_t{5});
  CHECK_ROW(AT(C, 0), {0, INF, INF, INF, INF});  // C*_1
  CHECK_ROW(AT(C, 1), {2, 2, INF, INF, INF});    // C*_2
  CHECK_ROW(AT(C, 2), {4, 4, 3, 6, INF});        // C*_3
  CHECK_ROW(AT(C, 3), {4, 6, 5, 4, 7});          // C*_4
  CHECK_ROW(AT(C, 4), {6, 6, 5, 6, 5});          // C*_5
}

TEST(the_cost_to_come_knows_nothing_about_the_goal) {
  // Move the goal somewhere else entirely and every row must be unchanged:
  // C* is a function of x_I and f alone.
  const GraphProblem original = figure2_8();
  GraphProblem moved = figure2_8();
  moved.setGoalStates({moved.stateByName("b")});

  const CostTable a = forwardValueIteration(original, 4);
  const CostTable b = forwardValueIteration(moved, 4);
  CHECK_EQ(a.size(), b.size());
  for (std::size_t k = 0; k < a.size(); ++k) CHECK_ROW(a[k], AT(b, k));
}

TEST(forward_and_backward_agree_on_the_optimal_cost) {
  // Book Exercise 1.  Figure 2.21 with x_I = a and X_G = {e}: the cheapest
  // plan is a -> b -> c -> d -> e, four actions for a total of 10.  Both
  // directions must land on that same number at K = 4.
  //
  // Careful: these are *fixed-length* tables, so a plan must use exactly K
  // actions.  At K = 5 the answer is not 10 any more -- try it and see what
  // padding the extra stage costs.  Exercise 08 is what removes that
  // restriction.
  const GraphProblem problem = figure2_21();
  const CostTable C = forwardValueIteration(problem, 4);
  const CostTable G = backwardValueIteration(problem, 4);

  const State a = problem.stateByName("a");
  const State e = problem.stateByName("e");
  CHECK_NEAR(AT(AT(C, 4), e), 10.0);
  CHECK_NEAR(AT(AT(G, 4), a), 10.0);
}
