#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "planning/value_iteration.hpp"
#include "test_harness.hpp"

using namespace planning;
using testing::INF;

// The departure taxi again, with the move budget removed: an aeroplane that is
// already holding short is allowed to simply stop.  Now each row says "the
// cheapest taxi time from here to holding short of 27, using as many moves as
// it takes", and the rows stop changing once that is settled.
//
// Columns are STAND 2, APRON, TWY A, HS 27 E, RWY 27.
// [book] Example 2.5 and Figure 2.14, in column order a b c d e.
TEST(the_cost_to_go_table_settles_after_three_sweeps) {
  const GraphProblem problem = departureTaxi();  // stand 2 to HS 27 E
  const Stationary result = backwardValueIterationStationary(problem);

  CHECK_EQ(result.history.size(), std::size_t{4});
  CHECK_ROW(AT(result.history, 0), {INF, INF, INF, 0, INF});  // only the holding point is free
  CHECK_ROW(AT(result.history, 1), {INF, 4, 1, 0, INF});      // one move out
  CHECK_ROW(AT(result.history, 2), {6, 2, 1, 0, INF});        // two moves out
  CHECK_ROW(AT(result.history, 3), {4, 2, 1, 0, INF});        // settled
  CHECK_ROW(result.G, {4, 2, 1, 0, INF});  // four minutes from the stand
  CHECK_EQ(result.iterations, 4);
}

TEST(from_the_runway_there_is_no_way_back_so_the_value_stays_infinite) {
  // An infinite entry is not a failure of the algorithm.  It is the planner
  // saying, correctly, that from here the clearance cannot be complied with --
  // and the policy has no action to offer, rather than a bad one.
  const GraphProblem problem = departureTaxi();
  const Stationary result = backwardValueIterationStationary(problem);
  CHECK_NEAR(AT(result.G, problem.stateByName("RWY 27")), INF);
  CHECK_EQ(AT(result.policy, problem.stateByName("RWY 27")), kNoAction);
}

TEST(the_policy_says_stop_at_the_holding_point) {
  // The one action the aeroplane must not improvise past.
  const GraphProblem problem = departureTaxi();
  const Stationary result = backwardValueIterationStationary(problem);
  CHECK_EQ(AT(result.policy, problem.stateByName("HS 27 E")), kTerminate);
}

TEST(following_the_policy_from_the_stand_gives_the_optimal_route) {
  // From STAND 2 the choice is: push back, at 2 + G*(APRON) = 4, or hold at the
  // stand, at 2 + G*(STAND 2) = 6.  Waiting is never free.
  //
  // Note what the policy is: an instruction for every square of the airport,
  // not a route from one of them.  That is what lets the capstone's aeroplane
  // be somewhere unexpected and still know what to do.
  const GraphProblem problem = departureTaxi();
  const Stationary result = backwardValueIterationStationary(problem);
  const Plan plan = planFromPolicy(problem, result);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, 4.0);
  CHECK_EQ(plan.length(), 3);
}

// The same, counted forwards from an aeroplane that is already on the apron.
// Each row is "the cheapest way to be standing at each place at all".
// [book] Figure 2.15, forward value iteration from x_I = b.
TEST(forward_value_iteration_settles_too) {
  GraphProblem problem = departureTaxi();
  problem.setInitialState(problem.stateByName("APRON"));
  const StationaryForward result = forwardValueIterationStationary(problem);

  CHECK_EQ(result.history.size(), std::size_t{4});
  CHECK_ROW(AT(result.history, 0), {INF, 0, INF, INF, INF});  // where it stands now
  CHECK_ROW(AT(result.history, 1), {INF, 0, 1, 4, INF});      // one move
  CHECK_ROW(AT(result.history, 2), {2, 0, 1, 2, 5});          // two moves
  CHECK_ROW(AT(result.history, 3), {2, 0, 1, 2, 3});          // settled
  CHECK_ROW(result.C, {2, 0, 1, 2, 3});
  CHECK_EQ(result.iterations, 4);
}

TEST(both_directions_agree_on_the_route_choice) {
  // The bypass graph, both ways to stationarity.  G reads "minutes still to
  // go", C reads "minutes already spent", and they must meet in the middle.
  // [book] Exercise 1, on Figure 2.21.
  const GraphProblem problem = bypassTaxi();  // stand 1 to HS 36 W
  const Stationary backward = backwardValueIterationStationary(problem);
  const StationaryForward forward = forwardValueIterationStationary(problem);

  CHECK_ROW(backward.G, {10, 8, 4, 1, 0});  // minutes still to go
  CHECK_ROW(forward.C, {0, 2, 6, 9, 10});   // minutes already spent

  // Ten minutes, measured from either end.
  CHECK_NEAR(AT(backward.G, problem.stateByName("STAND 1")),
             AT(forward.C, problem.stateByName("HS 36 W")));

  const Plan plan = planFromPolicy(problem, backward);
  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, 10.0);
}

TEST(value_iteration_agrees_with_dijkstra_and_does_far_more_work) {
  const GridProblem problem = GridProblem::fromAscii(maps::deadEndPier());
  const Stationary result = backwardValueIterationStationary(problem);
  const Plan plan = planFromPolicy(problem, result);
  const Plan reference = dijkstra(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  CHECK_NEAR(plan.cost, reference.cost);
  // Same answer, wildly different bookkeeping.  Dijkstra is value iteration
  // that only touches the squares whose values can still change; value
  // iteration sweeps every square of the airport on every pass.  What value
  // iteration buys for that price is the answer for *every* square, which is
  // the thing you want when the aeroplane might not be where you thought.
  // [book] Section 2.3.3.
  CHECK_NEAR(AT(result.G, problem.initialState()), reference.cost);
}
