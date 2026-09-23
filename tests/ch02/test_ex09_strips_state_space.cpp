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

// The hold-loading atoms, in order:
//   bit 0   Closed(Door, Hold)
//   bit 1   Loaded(ULD1, Hold)
//   bit 2   Loaded(ULD2, Hold)
// Three yes/no facts about the turnaround, so eight possible states of it.
TEST(three_facts_about_the_hold_make_eight_states) {
  const StripsStateSpace space(cargoHoldProblem());
  CHECK_EQ(space.numStates(), 8);
}

TEST(the_aeroplane_arrives_shut_and_empty) {
  const StripsStateSpace space(cargoHoldProblem());
  CHECK_EQ(space.initialState(), 0b001);  // door closed, nothing loaded
}

TEST(the_hold_is_only_finished_one_way) {
  const StripsStateSpace space(cargoHoldProblem());
  const std::vector<State> goals = space.goalStates();
  CHECK_EQ(goals.size(), std::size_t{1});
  CHECK_EQ(goals.front(), 0b111);
  CHECK(space.isGoal(0b111));   // loaded and shut
  CHECK(!space.isGoal(0b011));  // one container still on the tug
}

TEST(with_the_door_shut_there_is_exactly_one_thing_to_do) {
  const StripsStateSpace space(cargoHoldProblem());
  const std::vector<Transition> out = space.successors(0b001);
  CHECK_EQ(out.size(), std::size_t{1});
  CHECK_EQ(space.strips().operators[out.front().u].name, std::string("OpenDoor"));
  CHECK_EQ(out.front().x, 0b000);
  // And note that opening the door *undoes* part of the goal.  Any method that
  // only accepts jobs moving towards the goal is stuck on the first one.
}

TEST(with_the_door_open_there_are_three) {
  const StripsStateSpace space(cargoHoldProblem());
  // CloseDoor, Load(ULD1), Load(ULD2) -- but not OpenDoor, it is open already.
  CHECK_EQ(space.successors(0b000).size(), std::size_t{3});
}

TEST(loading_one_container_does_not_unload_the_other) {
  const StripsProblem problem = cargoHoldProblem();
  const StripsStateSpace space(problem);
  // Loading ULD1 into an open hold that already holds ULD2 must leave ULD2
  // where it is.  Nothing in the operator says so; it is the standing rule that
  // a job changes only what it names, and it is the usual bug here.
  const Operator& load1 = problem.operators[2];
  CHECK_EQ(load1.name, std::string("Load(ULD1)"));
  CHECK(space.applicable(0b100, load1));
  CHECK_EQ(space.apply(0b100, load1), StripsState{0b110});
  CHECK(!space.applicable(0b101, load1));  // the door is shut
  CHECK(!space.applicable(0b110, load1));  // ULD1 is already aboard
}

TEST(the_last_job_is_always_shutting_the_door) {
  const StripsStateSpace space(cargoHoldProblem());
  const std::vector<Transition> in = space.predecessors(0b111);
  CHECK_EQ(in.size(), std::size_t{1});
  CHECK_EQ(in.front().x, 0b110);
  CHECK_EQ(space.strips().operators[in.front().u].name, std::string("CloseDoor"));
}

TEST(searching_the_description_recovers_the_turnaround_in_four_jobs) {
  // Open the door, load both containers, shut the door.  Nobody wrote that
  // sequence down anywhere: it falls out of searching a state space that was
  // never drawn, only described.
  // [book] equation (2.24).
  const StripsStateSpace space(cargoHoldProblem());
  const Plan plan = localBfs(space);

  CHECK(plan.found);
  CHECK_VALID_PLAN(space, plan);
  CHECK_EQ(plan.length(), 4);
  CHECK_EQ(space.strips().operators[plan.actions.front()].name, std::string("OpenDoor"));
  CHECK_EQ(space.strips().operators[plan.actions.back()].name, std::string("CloseDoor"));
}

TEST(the_ground_power_job_needs_somebody_to_walk_over_first) {
  const StripsStateSpace space(groundPowerProblem());
  const Plan plan = localBfs(space);

  CHECK(plan.found);
  CHECK_VALID_PLAN(space, plan);
  CHECK_EQ(plan.length(), 2);
  CHECK_EQ(space.strips().operators[plan.actions[0]].name, std::string("WalkToPanel"));
  CHECK_EQ(space.strips().operators[plan.actions[1]].name, std::string("ConnectGpu"));
}
