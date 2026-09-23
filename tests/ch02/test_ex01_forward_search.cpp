#include "planning/graphs.hpp"
#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "test_harness.hpp"

using namespace planning;

TEST(breadth_first_takes_the_fewest_legs_not_the_quickest_route) {
  const GraphProblem problem = bypassTaxi();  // stand 1 to the 36 holding point
  const Plan plan = breadthFirstSearch(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  // APRON, TWY A, then all the way round on A is three legs and thirteen
  // minutes.  Cutting north through B is four legs and ten.  Breadth first
  // counts legs, so it taxis the slow way and is perfectly happy about it.
  CHECK_EQ(plan.length(), 3);
  CHECK_NEAR(plan.cost, 13.0);
}

TEST(breadth_first_taxis_around_the_pier) {
  const GridProblem problem = GridProblem::fromAscii(maps::standArea());
  const Plan plan = breadthFirstSearch(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  // Seven squares as the crow flies, nine once you go round the pier.
  CHECK_EQ(plan.length(), 9);
}

TEST(depth_first_finds_a_legal_route_even_if_an_absurd_one) {
  const GridProblem problem = GridProblem::fromAscii(maps::standArea());
  const Plan plan = depthFirstSearch(problem);

  CHECK(plan.found);
  CHECK_VALID_PLAN(problem, plan);
  // No length claim.  Which route depth first comes back with depends entirely
  // on the order the four compass moves happen to be listed in -- it is a legal
  // taxi route and nothing more.  Never hand this one to a flight crew.
  CHECK(plan.length() >= 9);
}

TEST(both_refuse_when_there_is_no_route_at_all) {
  // An aeroplane that has entered the runway has no edge back to the holding
  // position.  The honest answer is "no route", and both methods must give it
  // rather than invent one.
  GraphProblem problem = departureTaxi();
  problem.setInitialState(problem.stateByName("RWY 27"));
  CHECK(!breadthFirstSearch(problem).found);
  CHECK(!depthFirstSearch(problem).found);
}

TEST(search_reports_how_much_work_it_did) {
  // How hard a method had to look is the whole subject of Exercises 02-05.
  const GridProblem problem = GridProblem::fromAscii(maps::openApron());
  const Plan plan = breadthFirstSearch(problem);
  CHECK(plan.found);
  CHECK(plan.expanded > 0);
  CHECK(plan.generated >= plan.expanded);
}
