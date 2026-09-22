#include <deque>
#include <vector>

#include "planning/strips.hpp"
#include "test_harness.hpp"

using namespace planning;

namespace {

// A deliberately self-contained breadth-first search, so that this test says
// something about Exercise 09 even if Exercise 01 is still a stub.
Plan localBfs(const Problem& problem) {
  const int n = problem.numStates();
  // Defensive: an unimplemented state space reports |X| = 0, and we would
  // rather fail the test than index off the end of a vector.
  if (n <= 0 || problem.initialState() < 0 || problem.initialState() >= n) return Plan{};
  std::vector<State> parent(n, kNoState);
  std::vector<Action> parentAction(n, kNoAction);
  std::vector<bool> visited(n, false);
  std::deque<State> q{problem.initialState()};
  visited[problem.initialState()] = true;
  while (!q.empty()) {
    const State x = q.front();
    q.pop_front();
    if (problem.isGoal(x)) return reconstructForward(problem, x, parent, parentAction);
    for (const Transition& t : problem.successors(x)) {
      if (visited[t.x]) continue;
      visited[t.x] = true;
      parent[t.x] = x;
      parentAction[t.x] = t.u;
      q.push_back(t.x);
    }
  }
  return Plan{};
}

}  // namespace

// atoms are, in order: On(Cap, F), In(Battery1, F), In(Battery2, F).
// So bit 0 is the cap, bit 1 is battery 1, bit 2 is battery 2.
TEST(three_complementary_pairs_make_eight_states) {
  const StripsStateSpace space(flashlightProblem());
  CHECK_EQ(space.numStates(), 8);
}

TEST(the_initial_state_is_cap_on_and_no_batteries) {
  const StripsStateSpace space(flashlightProblem());
  CHECK_EQ(space.initialState(), 0b001);
}

TEST(the_goal_set_is_a_single_state_here) {
  const StripsStateSpace space(flashlightProblem());
  const std::vector<State> goals = space.goalStates();
  CHECK_EQ(goals.size(), std::size_t{1});
  CHECK_EQ(goals.front(), 0b111);
  CHECK(space.isGoal(0b111));
  CHECK(!space.isGoal(0b011));
}

TEST(only_remove_cap_applies_in_the_initial_state) {
  const StripsStateSpace space(flashlightProblem());
  const std::vector<Transition> out = space.successors(0b001);
  CHECK_EQ(out.size(), std::size_t{1});
  CHECK_EQ(space.strips().operators[out.front().u].name, std::string("RemoveCap"));
  CHECK_EQ(out.front().x, 0b000);
}

TEST(with_the_cap_off_three_operators_apply) {
  const StripsStateSpace space(flashlightProblem());
  // PlaceCap, Insert(Battery1), Insert(Battery2) -- but not RemoveCap.
  CHECK_EQ(space.successors(0b000).size(), std::size_t{3});
}

TEST(effects_leave_unmentioned_pairs_alone) {
  const StripsProblem problem = flashlightProblem();
  const StripsStateSpace space(problem);
  // Insert(Battery1) from "cap off, battery 2 already in" must keep battery 2.
  const Operator& insert1 = problem.operators[2];
  CHECK_EQ(insert1.name, std::string("Insert(Battery1)"));
  CHECK(space.applicable(0b100, insert1));
  CHECK_EQ(space.apply(0b100, insert1), StripsState{0b110});
  CHECK(!space.applicable(0b101, insert1));  // the cap is on
  CHECK(!space.applicable(0b110, insert1));  // battery 1 is already in
}

TEST(only_place_cap_can_reach_the_goal) {
  const StripsStateSpace space(flashlightProblem());
  const std::vector<Transition> in = space.predecessors(0b111);
  CHECK_EQ(in.size(), std::size_t{1});
  CHECK_EQ(in.front().x, 0b110);
  CHECK_EQ(space.strips().operators[in.front().u].name, std::string("PlaceCap"));
}

TEST(searching_the_state_space_recovers_the_plan_of_equation_2_24) {
  const StripsStateSpace space(flashlightProblem());
  const Plan plan = localBfs(space);

  CHECK(plan.found);
  CHECK_VALID_PLAN(space, plan);
  CHECK_EQ(plan.length(), 4);
  CHECK_EQ(space.strips().operators[plan.actions.front()].name, std::string("RemoveCap"));
  CHECK_EQ(space.strips().operators[plan.actions.back()].name, std::string("PlaceCap"));
}

TEST(the_light_switch_problem_needs_two_actions) {
  const StripsStateSpace space(lightSwitchProblem());
  const Plan plan = localBfs(space);

  CHECK(plan.found);
  CHECK_VALID_PLAN(space, plan);
  CHECK_EQ(plan.length(), 2);
  CHECK_EQ(space.strips().operators[plan.actions[0]].name, std::string("MoveToSwitch"));
  CHECK_EQ(space.strips().operators[plan.actions[1]].name, std::string("FlipOn"));
}
