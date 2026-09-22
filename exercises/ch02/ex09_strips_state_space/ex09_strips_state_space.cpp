// Exercise 09 -- STRIPS to state space (Section 2.4.2).
//
// Read exercises/ch02/ex09_strips_state_space/README.md first.
#include <vector>

#include "planning/strips.hpp"

namespace planning {

StripsStateSpace::StripsStateSpace(StripsProblem problem) : problem_(std::move(problem)) {}

bool StripsStateSpace::applicable(StripsState mask, const Operator& op) const {
  // TODO(you): every precondition must hold.  A positive literal needs its bit
  // set; a negative literal needs it clear.
  (void)mask;
  (void)op;
  return false;
}

StripsState StripsStateSpace::apply(StripsState mask, const Operator& op) const {
  // TODO(you): set the bits named by positive effects, clear the bits named by
  // negative ones, and leave every unmentioned complementary pair alone.
  (void)op;
  return mask;
}

int StripsStateSpace::numStates() const {
  // TODO(you): one binary choice per complementary pair.
  return 0;
}

State StripsStateSpace::initialState() const {
  // TODO(you): initialMask() already does this; just widen the result.
  return kNoState;
}

bool StripsStateSpace::isGoal(State x) const {
  // TODO(you): careful -- G names a *set* of states.  Any complementary pair
  // that G does not mention may go either way.
  (void)x;
  return false;
}

std::vector<State> StripsStateSpace::goalStates() const {
  // TODO(you): enumerate.  |X| is 8 here; when it is not, this is the first
  // thing that has to change.
  return {};
}

std::vector<Transition> StripsStateSpace::successors(State x) const {
  // TODO(you): one Transition per applicable operator, with the operator's
  // index as the action and unit cost.
  (void)x;
  return {};
}

std::vector<Transition> StripsStateSpace::predecessors(State x) const {
  // TODO(you): regression through STRIPS effects is fiddly.  Since |X| is
  // tiny, brute force is fine: ask every state whether one operator takes it
  // to x.  Leave a comment noting that this is the part that does not scale.
  (void)x;
  return {};
}

std::string StripsStateSpace::name(State x) const {
  // TODO(you): maskToString() gives a readable set of positive literals.
  (void)x;
  return "?";
}

}  // namespace planning
