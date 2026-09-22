#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "planning/value_iteration.hpp"
#include "test_harness.hpp"

using namespace planning;
using testing::INF;

// Example 2.5: the same five-state problem, now with the termination action.
// The expected rows are Figure 2.14, in column order a b c d e.
TEST(backward_stationary_reproduces_figure_2_14) {
  const GraphProblem problem = figure2_8();  // x_I = a, X_G = {d}
  const Stationary result = backwardValueIterationStationary(problem);

  CHECK_EQ(result.history.size(), std::size_t{4});
  CHECK_ROW(AT(result.history, 0), {INF, INF, INF, 0, INF});  // G*_0  = l_F
  CHECK_ROW(AT(result.history, 1), {INF, 4, 1, 0, INF});      // G*_-1
  CHECK_ROW(AT(result.history, 2), {6, 2, 1, 0, INF});        // G*_-2
  CHECK_ROW(AT(result.history, 3), {4, 2, 1, 0, INF});        // G*_-3, already stationary
  CHECK_ROW(result.G, {4, 2, 1, 0, INF});                 // G*
  CHECK_EQ(result.iterations, 4);
}

TEST(d_is_unreachable_from_e_so_its_value_stays_infinite) {
  const GraphProblem problem = figure2_8();
  const Stationary result = backwardValueIterationStationary(problem);
  CHECK_NEAR(AT(result.G, problem.stateByName("e")), INF);
  CHECK_EQ(AT(result.policy, problem.stateByName("e")), kNoAction);
}

TEST(the_policy_terminates_at_the_goal) {
  const GraphProblem problem = figure2_8();
  const Stationary result = backwardValueIterationStationary(problem);
  CHECK_EQ(AT(result.policy, problem.stateByName("d")), kTerminate);
}

TEST(rolling_out_the_policy_gives_the_optimal_plan) {
  // Section 2.3.2 walks this through by hand: from a, going to b costs
  // 2 + G*(b) = 4, which beats the self-loop at 2 + G*(a) = 6.
  const GraphProblem problem = figure2_8();
  const Stationary result = backwardValueIterationStationary(problem);
  const Plan plan = planFromPolicy(problem, result);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, 4.0);
  CHECK_EQ(plan.length(), 3);
}

// Figure 2.15: forward value iteration on the same graph, from x_I = b.
TEST(forward_stationary_reproduces_figure_2_15) {
  GraphProblem problem = figure2_8();
  problem.setInitialState(problem.stateByName("b"));
  const StationaryForward result = forwardValueIterationStationary(problem);

  CHECK_EQ(result.history.size(), std::size_t{4});
  CHECK_ROW(AT(result.history, 0), {INF, 0, INF, INF, INF});  // C*_1
  CHECK_ROW(AT(result.history, 1), {INF, 0, 1, 4, INF});      // C*_2
  CHECK_ROW(AT(result.history, 2), {2, 0, 1, 2, 5});          // C*_3
  CHECK_ROW(AT(result.history, 3), {2, 0, 1, 2, 3});          // C*_4
  CHECK_ROW(result.C, {2, 0, 1, 2, 3});                   // C*
  CHECK_EQ(result.iterations, 4);
}

TEST(book_exercise_1_on_figure_2_21) {
  // (a) backward value iteration to stationarity, and (b) forward.
  const GraphProblem problem = figure2_21();  // x_I = a, X_G = {e}
  const Stationary backward = backwardValueIterationStationary(problem);
  const StationaryForward forward = forwardValueIterationStationary(problem);

  CHECK_ROW(backward.G, {10, 8, 4, 1, 0});
  CHECK_ROW(forward.C, {0, 2, 6, 9, 10});

  // The two agree where they must: the optimal cost from x_I to X_G.
  CHECK_NEAR(AT(backward.G, problem.stateByName("a")), AT(forward.C, problem.stateByName("e")));

  const Plan plan = planFromPolicy(problem, backward);
  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, 10.0);
}

TEST(stationary_value_iteration_agrees_with_dijkstra_on_the_grid) {
  const GridProblem problem = GridProblem::fromAscii(maps::bugTrap());
  const Stationary result = backwardValueIterationStationary(problem);
  const Plan plan = planFromPolicy(problem, result);
  const Plan reference = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, reference.cost);
  // Section 2.3.3: Dijkstra is value iteration that only touches the states
  // whose values can still change.  Same answer, very different bookkeeping.
  CHECK_NEAR(AT(result.G, problem.initialState()), reference.cost);
}
