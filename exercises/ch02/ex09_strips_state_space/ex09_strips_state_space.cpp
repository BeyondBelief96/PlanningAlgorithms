// Exercise 09 -- A description you can search.
//
// The taxi is eight minutes; the turnaround is forty.  This is the adapter that
// lets every search method you already wrote run on a description of the forty
// -- a list of facts and a list of jobs, with the state space never drawn.
//
// [book] LaValle Section 2.4.2.
//
// Read exercises/ch02/ex09_strips_state_space/README.md first.
#include <vector>

#include "planning/strips.hpp"

namespace planning {

StripsStateSpace::StripsStateSpace(StripsProblem problem) : problem_(std::move(problem)) {}

bool StripsStateSpace::applicable(StripsState mask, const Operator& op) const {
  // TODO(you): every precondition of the job must hold.  A fact needs its bit
  // set; the negation of a fact needs it clear.
  (void)mask;
  (void)op;
  return false;
}

StripsState StripsStateSpace::apply(StripsState mask, const Operator& op) const {
  // TODO(you): set the bits the positive effects name, clear the bits the
  // negative ones name, and leave every fact the job does not mention alone.
  //
  // Start from `mask` and *edit* it.  Building a new mask out of the effects is
  // the usual bug here, and it is the one that unloads ULD2 when you load
  // ULD1.
  (void)op;
  return mask;
}

int StripsStateSpace::numStates() const {
  // TODO(you): one yes-or-no answer per fact, so 2^facts states.
  return 0;
}

State StripsStateSpace::initialState() const {
  // TODO(you): initialMask() already does this; just widen the result.
  return kNoState;
}

bool StripsStateSpace::isGoal(State x) const {
  // TODO(you): careful -- the goal names a *set* of states.  Any fact it does
  // not mention may go either way, so test only the facts it actually names.
  (void)x;
  return false;
}

std::vector<State> StripsStateSpace::goalStates() const {
  // TODO(you): enumerate.  There are 8 states here; the moment there are not,
  // this is the first thing that has to change.
  return {};
}

std::vector<Transition> StripsStateSpace::successors(State x) const {
  // TODO(you): one Transition per job that can run, with the job's index as
  // the action and unit cost.
  (void)x;
  return {};
}

std::vector<Transition> StripsStateSpace::predecessors(State x) const {
  // TODO(you): working backwards through effects is fiddly.  With eight states
  // brute force is fine: ask every state whether some job takes it to x.  Leave
  // a comment noting that this is the part that does not scale -- at thirty
  // facts this loop runs a billion times per query.
  (void)x;
  return {};
}

std::string StripsStateSpace::name(State x) const {
  // TODO(you): maskToString() gives a readable list of the facts that hold.
  (void)x;
  return "?";
}

}  // namespace planning
