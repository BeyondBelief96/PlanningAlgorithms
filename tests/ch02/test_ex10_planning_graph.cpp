#include "planning/planning_graph.hpp"
#include "test_harness.hpp"

using namespace planning;

// The hold-loading atoms, in order:
//   atom 0  Closed(Door, Hold)
//   atom 1  Loaded(ULD1, Hold)
//   atom 2  Loaded(ULD2, Hold)
//
// The planning graph answers a cheaper question than "what is the plan?".  It
// answers "how early could this possibly be finished?", by assuming every job
// that could run does run, all at once, and tracking only which pairs of facts
// cannot honestly hold together.  For a turnaround that is exactly the question
// the ramp wants answered: not the order, the earliest.
//
// [book] Figure 2.20.

TEST(the_graph_levels_off_after_three_rounds_of_jobs) {
  const StripsProblem problem = cargoHoldProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);

  // Facts, jobs, facts, jobs, facts, jobs, facts -- and the last two fact
  // layers are identical, so nothing new can ever appear and the graph stops.
  CHECK_EQ(graph.numLayers(), 4);
  CHECK_EQ(graph.O.size(), std::size_t{3});
  CHECK_EQ(graph.levelledOffAt, 3);
}

TEST(the_fact_layers_only_ever_grow) {
  const StripsProblem problem = cargoHoldProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);

  CHECK_EQ(AT(graph.L, 0).size(), std::size_t{3});  // what is true when it parks
  CHECK_EQ(AT(graph.L, 1).size(), std::size_t{4});  // OpenDoor adds !Closed(Door, Hold)
  CHECK_EQ(AT(graph.L, 2).size(), std::size_t{6});  // every fact is now possible
  CHECK_EQ(AT(graph.L, 3).size(), std::size_t{6});  // and stays possible
}

TEST(doing_nothing_counts_as_a_job) {
  const StripsProblem problem = cargoHoldProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);

  // Round 1: OpenDoor, plus one do-nothing job per fact -- a fact nobody
  // disturbs is still true next round, and the graph has to be able to say so.
  CHECK_EQ(AT(graph.O, 0).size(), std::size_t{1 + 3});
  int trivial = 0;
  for (const GraphOp& op : AT(graph.O, 0))
    if (op.trivial()) ++trivial;
  CHECK_EQ(trivial, 3);

  // Round 2: all four real jobs are now possible, plus 4 do-nothings.
  CHECK_EQ(AT(graph.O, 1).size(), std::size_t{4 + 4});
  // Round 3: four real jobs, plus 6 do-nothings.
  CHECK_EQ(AT(graph.O, 2).size(), std::size_t{4 + 6});
}

TEST(the_door_cannot_be_shut_and_the_hold_loaded_that_early) {
  const StripsProblem problem = cargoHoldProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);

  const SignedLit doorShut = makeLit(0, true);
  const SignedLit uld1Aboard = makeLit(1, true);

  // Two rounds in, the only ways to have the door shut are to shut it or to
  // never have opened it, and both fight with loading, which needs it open.
  // So "shut and loaded" is not honestly reachable yet, however it looks.
  CHECK(graph.literalsMutex(2, doorShut, uld1Aboard));
  // One round later the conflict is gone: shut the door *after* loading.
  CHECK(!graph.literalsMutex(3, doorShut, uld1Aboard));
}

TEST(the_two_containers_never_fight_with_each_other) {
  const StripsProblem problem = cargoHoldProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);
  // Two loaders, two containers, one open door: nothing about loading ULD1
  // interferes with loading ULD2, so the graph may put both in the same round.
  // Independent jobs running together is the whole reason to plan a turnaround
  // in layers rather than in sequence.  [book] the layered plan of (2.32).
  CHECK(!graph.literalsMutex(2, makeLit(1, true), makeLit(2, true)));
}

TEST(the_hold_cannot_possibly_be_finished_before_the_third_round) {
  const StripsProblem problem = cargoHoldProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);

  CHECK(!goalPossiblyReachable(problem, graph, 2));
  CHECK(goalPossiblyReachable(problem, graph, 3));
  CHECK_EQ(firstGoalLayer(problem, graph), 3);
  // Three rounds: open the door, load both containers together, shut it.  A
  // lower bound on the turnaround, arrived at without searching anything.
}

TEST(ground_power_cannot_be_on_before_the_second_round) {
  const StripsProblem problem = groundPowerProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);

  CHECK_EQ(firstGoalLayer(problem, graph), 2);
  CHECK(graph.levelledOffAt >= 0);
  // "The ground power is connected" and "the aeroplane is off its battery" are
  // both effects of the single job ConnectGpu, so they never conflict: one job
  // achieving both is enough to clear the pair.
  CHECK(!graph.literalsMutex(2, makeLit(1, true), makeLit(2, false)));
}
