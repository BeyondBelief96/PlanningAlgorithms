#include "planning/planning_graph.hpp"
#include "test_harness.hpp"

using namespace planning;

// The flashlight problem's atoms, in order:
//   atom 0  On(Cap, Flashlight)
//   atom 1  In(Battery1, Flashlight)
//   atom 2  In(Battery2, Flashlight)

TEST(the_flashlight_graph_matches_figure_2_20) {
  const StripsProblem problem = flashlightProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);

  // L1, O1, L2, O2, L3, O3, L4 -- and then L4 = L3, so it has levelled off.
  CHECK_EQ(graph.numLayers(), 4);
  CHECK_EQ(graph.O.size(), std::size_t{3});
  CHECK_EQ(graph.levelledOffAt, 3);
}

TEST(layers_grow_monotonically_to_all_six_literals) {
  const StripsProblem problem = flashlightProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);

  CHECK_EQ(AT(graph.L, 0).size(), std::size_t{3});  // the initial state
  CHECK_EQ(AT(graph.L, 1).size(), std::size_t{4});  // RemoveCap adds !On(Cap, F)
  CHECK_EQ(AT(graph.L, 2).size(), std::size_t{6});  // every literal is now present
  CHECK_EQ(AT(graph.L, 3).size(), std::size_t{6});
}

TEST(operator_layers_include_the_trivial_maintenance_operators) {
  const StripsProblem problem = flashlightProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);

  // O1: RemoveCap, plus one trivial operator per literal of L1.
  CHECK_EQ(AT(graph.O, 0).size(), std::size_t{1 + 3});
  int trivial = 0;
  for (const GraphOp& op : AT(graph.O, 0))
    if (op.trivial()) ++trivial;
  CHECK_EQ(trivial, 3);

  // O2: PlaceCap, RemoveCap, Insert(B1), Insert(B2), plus 4 trivial.
  CHECK_EQ(AT(graph.O, 1).size(), std::size_t{4 + 4});
  // O3: all four operators, plus 6 trivial.
  CHECK_EQ(AT(graph.O, 2).size(), std::size_t{4 + 6});
}

TEST(having_the_cap_on_is_mutex_with_a_battery_being_in_at_L3) {
  const StripsProblem problem = flashlightProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);

  const SignedLit capOn = makeLit(0, true);
  const SignedLit battery1In = makeLit(1, true);

  // At L3 the only way to have the cap on is PlaceCap or keeping it on, and
  // both interfere with Insert(Battery1) -- it needs the cap off.
  CHECK(graph.literalsMutex(2, capOn, battery1In));
  // One layer later the conflict is resolved: PlaceCap can follow the inserts.
  CHECK(!graph.literalsMutex(3, capOn, battery1In));
}

TEST(the_two_batteries_are_never_mutex_with_each_other) {
  const StripsProblem problem = flashlightProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);
  // Insert(Battery1) and Insert(Battery2) do not conflict, which is exactly
  // why the layered plan of (2.32) can put them in one layer.
  CHECK(!graph.literalsMutex(2, makeLit(1, true), makeLit(2, true)));
}

TEST(the_goal_first_becomes_possible_at_the_fourth_layer) {
  const StripsProblem problem = flashlightProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);

  CHECK(!goalPossiblyReachable(problem, graph, 2));
  CHECK(goalPossiblyReachable(problem, graph, 3));
  CHECK_EQ(firstGoalLayer(problem, graph), 3);
  // Three operator layers: ({RemoveCap}, {Insert(B1), Insert(B2)}, {PlaceCap}).
}

TEST(the_light_switch_goal_is_possible_after_two_operator_layers) {
  const StripsProblem problem = lightSwitchProblem();
  const PlanningGraph graph = buildPlanningGraph(problem);

  CHECK_EQ(firstGoalLayer(problem, graph), 2);
  CHECK(graph.levelledOffAt >= 0);
  // On(Light) and !Dark(Room) are both effects of the single operator FlipOn,
  // so they are not mutex -- "if there exists an operator that achieves both,
  // then this condition is false".
  CHECK(!graph.literalsMutex(2, makeLit(1, true), makeLit(2, false)));
}
