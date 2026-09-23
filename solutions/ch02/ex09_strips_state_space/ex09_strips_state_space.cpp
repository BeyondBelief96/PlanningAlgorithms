// Reference solution -- Exercise 09: a description you can search.
//
// A state of the turnaround is one yes-or-no answer for every fact, which is
// exactly a bit string over `atoms`.  Reading it as an integer drops every
// search method from Exercises 01 to 08 onto a turnaround description
// unchanged -- the payoff for having written them against an interface rather
// than against a map.
//
// It also shows why this kind of planning is hard: three facts is eight states,
// ten facts about a real turnaround is a thousand, thirty is a billion.  The
// description is tiny and the graph it names is enormous.
//
// [book] Section 2.4.2; the Kolmogorov complexity remark is Section 2.4.3.
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
