// Reference solution -- Exercise 09: STRIPS to state space (Section 2.4.2).
//
// A state is one choice of positive-or-negative from every complementary pair,
// which is exactly a bit string over `atoms`.  Reading that bit string as an
// integer gives |X| = 2^|atoms| and drops the whole of Section 2.2 onto the
// logic-based representation unchanged.
//
// It also shows why logic-based planning is hard: three atoms is eight states,
// but thirty atoms is a billion.  The input is tiny and the graph is enormous,
// which is the whole point of Section 2.4's remark about Kolmogorov complexity.
#include <vector>

#include "planning/strips.hpp"

namespace planning {
namespace {

bool holds(StripsState mask, int atom) { return (mask >> atom) & StripsState{1}; }

}  // namespace

StripsStateSpace::StripsStateSpace(StripsProblem problem) : problem_(std::move(problem)) {}

bool StripsStateSpace::applicable(StripsState mask, const Operator& op) const {
  for (const Literal& pre : op.preconditions) {
    const int a = problem_.atomIndex(pre);
    if (a < 0) return false;  // a precondition we cannot even represent
    if (holds(mask, a) != pre.positive) return false;
  }
  return true;
}

StripsState StripsStateSpace::apply(StripsState mask, const Operator& op) const {
  // "It is assumed that the truth values of all unmentioned complementary
  // pairs are not affected" -- so start from the current mask and edit.
  for (const Literal& effect : op.effects) {
    const int a = problem_.atomIndex(effect);
    if (a < 0) continue;
    if (effect.positive) mask |= (StripsState{1} << a);
    else mask &= ~(StripsState{1} << a);
  }
  return mask;
}

int StripsStateSpace::numStates() const { return 1 << problem_.atoms.size(); }

State StripsStateSpace::initialState() const {
  return static_cast<State>(initialMask(problem_));
}

bool StripsStateSpace::isGoal(State x) const {
  const StripsState mask = static_cast<StripsState>(x);
  // G names a *set* of states: any unmentioned pair may go either way.
  for (const Literal& l : problem_.goal) {
    const int a = problem_.atomIndex(l);
    if (a < 0) return false;
    if (holds(mask, a) != l.positive) return false;
  }
  return true;
}

std::vector<State> StripsStateSpace::goalStates() const {
  std::vector<State> result;
  for (State x = 0; x < numStates(); ++x)
    if (isGoal(x)) result.push_back(x);
  return result;
}

std::vector<Transition> StripsStateSpace::successors(State x) const {
  std::vector<Transition> result;
  const StripsState mask = static_cast<StripsState>(x);
  for (std::size_t i = 0; i < problem_.operators.size(); ++i) {
    const Operator& op = problem_.operators[i];
    if (!applicable(mask, op)) continue;
    result.push_back({static_cast<Action>(i), static_cast<State>(apply(mask, op)), 1.0});
  }
  return result;
}

std::vector<Transition> StripsStateSpace::predecessors(State x) const {
  // Regression through STRIPS effects is fiddly, and |X| is small here, so we
  // simply ask every state whether it can reach x in one step.  If you ever
  // scale this up, this is the first thing that has to go.
  std::vector<Transition> result;
  for (State y = 0; y < numStates(); ++y) {
    const StripsState mask = static_cast<StripsState>(y);
    for (std::size_t i = 0; i < problem_.operators.size(); ++i) {
      const Operator& op = problem_.operators[i];
      if (!applicable(mask, op)) continue;
      if (static_cast<State>(apply(mask, op)) == x)
        result.push_back({static_cast<Action>(i), y, 1.0});
    }
  }
  return result;
}

std::string StripsStateSpace::name(State x) const {
  return maskToString(problem_, static_cast<StripsState>(x));
}

}  // namespace planning
