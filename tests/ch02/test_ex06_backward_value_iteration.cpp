#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "planning/value_iteration.hpp"
#include "test_harness.hpp"

using namespace planning;
using testing::INF;

// Example 2.3 with K = 4, x_I = a, X_G = {d}.  The expected rows below are
// Figure 2.9 of the book, transcribed column order a b c d e.
TEST(backward_value_iteration_reproduces_figure_2_9) {
  const GraphProblem problem = figure2_8();
  const CostTable G = backwardValueIteration(problem, 4);

  CHECK_EQ(G.size(), std::size_t{5});
  CHECK_ROW(AT(G, 0), {INF, INF, INF, 0, INF});  // G*_5 = l_F
  CHECK_ROW(AT(G, 1), {INF, 4, 1, INF, INF});    // G*_4
  CHECK_ROW(AT(G, 2), {6, 2, INF, 2, INF});      // G*_3
  CHECK_ROW(AT(G, 3), {4, 6, 3, INF, INF});      // G*_2
  CHECK_ROW(AT(G, 4), {6, 4, 5, 4, INF});        // G*_1
}

TEST(a_state_can_be_in_the_goal_set_and_still_have_infinite_value) {
  // There is no termination action here, so from d a plan must take exactly
  // four more actions and end in X_G -- and d cannot get back to itself.
  const GraphProblem problem = figure2_8();
  const CostTable G = backwardValueIteration(problem, 4);
  const State d = problem.stateByName("d");
  CHECK_NEAR(AT(AT(G, 0), d), 0.0);
  CHECK_NEAR(AT(AT(G, 1), d), INF);
}

TEST(the_recovered_plan_uses_exactly_K_actions) {
  const GraphProblem problem = figure2_8();
  const CostTable G = backwardValueIteration(problem, 4);
  const Plan plan = planFromBackwardValues(problem, G);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_EQ(plan.length(), 4);
  // G*_1(a) = 6: the self-loop a -> a burns a stage for 2, then a -> b -> c -> d.
  CHECK_NEAR(plan.cost, 6.0);
}

TEST(no_K_step_plan_means_no_plan) {
  const GraphProblem problem = figure2_8();
  const CostTable G = backwardValueIteration(problem, 1);
  CHECK(!planFromBackwardValues(problem, G).found);
}

TEST(with_enough_stages_it_agrees_with_dijkstra_on_the_grid) {
  const GridProblem problem = GridProblem::fromAscii(maps::tiny());
  const CostTable G = backwardValueIteration(problem, 9);
  const Plan plan = planFromBackwardValues(problem, G);
  const Plan reference = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, reference.cost);
}
