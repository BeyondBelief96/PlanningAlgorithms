// core.hpp -- The state-space model of Chapter 2 (Formulations 2.1, 2.2, 2.3).
//
// This file is part of the *given* library: you do not edit it while working
// the exercises.  It defines the vocabulary the whole chapter is written in.
//
//   X          the state space          -> states are ints in [0, numStates())
//   U(x)       the action space at x    -> successors(x) lists one Transition per action
//   f(x, u)    the state transition eq. -> Transition::x
//   l(x, u)    the cost term            -> Transition::cost
//   x_I        the initial state        -> initialState()
//   X_G        the goal set             -> isGoal() / goalStates()
#pragma once

#include <functional>
#include <limits>
#include <string>
#include <vector>

namespace planning {

using State = int;
using Action = int;

inline constexpr State kNoState = -1;
inline constexpr Action kNoAction = -1;

// The termination action u_T of Formulation 2.3.  Applying it leaves the state
// unchanged forever and accumulates no further cost.  It never appears in
// successors(); algorithms that need it synthesise it themselves.
inline constexpr Action kTerminate = -2;

inline constexpr double kInfinity = std::numeric_limits<double>::infinity();

// One edge of the state transition graph.
struct Transition {
  Action u = kNoAction;  // the action taken
  State x = kNoState;    // forward: f(x, u).  backward: the x with f(x, u) == this state.
  double cost = 1.0;     // l(x, u), always taken at the *originating* vertex
};

// A discrete planning problem.  The state transition graph is given only
// implicitly, through successors()/predecessors() -- that implicitness is the
// whole point of Chapter 2, so resist the urge to materialise the graph.
class Problem {
 public:
  virtual ~Problem() = default;

  // |X|.  Finite here; value iteration needs to sweep it.
  virtual int numStates() const = 0;

  virtual State initialState() const = 0;
  virtual bool isGoal(State x) const = 0;
  virtual std::vector<State> goalStates() const = 0;

  // U(x) together with f(x, u) and l(x, u).
  virtual std::vector<Transition> successors(State x) const = 0;

  // f^{-1}: every (x', u) with f(x', u) == x.  Transition::x holds x'.
  virtual std::vector<Transition> predecessors(State x) const = 0;

  // Human-readable name, for printing plans and cost tables.
  virtual std::string name(State x) const;

  // l_F(x): 0 on the goal set, infinity elsewhere (Formulation 2.2, item 3).
  double finalCost(State x) const { return isGoal(x) ? 0.0 : kInfinity; }
};

// The output of every search and of policy rollout.
//
// states  == (x_1, ..., x_{K+1}),  actions == (u_1, ..., u_K)
// so states.size() == actions.size() + 1 whenever found == true.
struct Plan {
  bool found = false;
  std::vector<State> states;
  std::vector<Action> actions;
  double cost = 0.0;

  // Instrumentation, so you can compare algorithms (book Exercises 18-20).
  long long expanded = 0;   // states removed from Q
  long long generated = 0;  // states ever inserted into Q

  int length() const { return static_cast<int>(actions.size()); }
  explicit operator bool() const { return found; }
};

// Heuristic cost-to-go estimate \hat{G}(x) used by A* and best-first search.
using Heuristic = std::function<double(State)>;

// \hat{G}(x) == 0 for all x.  A* with this degenerates to Dijkstra's algorithm.
Heuristic zeroHeuristic();

// Walks the plan through f and checks that it really starts at x_I, really
// ends in X_G, that every action is available where it is used, and that
// Plan::cost is the sum of the l(x, u) terms.  Returns "" when the plan is
// valid, otherwise a description of the first problem found.
std::string validate(const Problem& problem, const Plan& plan);

// --- Plan bookkeeping ------------------------------------------------------
//
// These three are given.  Tracing parent pointers is not what Chapter 2 is
// about, and every search exercise would otherwise repeat it.

// parent[x] is the state from which x was first reached, and parentAction[x]
// the action applied there; parent[initialState()] must be kNoState.  Walks
// back from `goal` and assembles the forward-reading Plan, summing l(x, u).
Plan reconstructForward(const Problem& problem, State goal, const std::vector<State>& parent,
                        const std::vector<Action>& parentAction);

// The mirror image, for backward search: next[x] is the state that follows x
// on the way to the goal, and nextAction[x] the action applied at x.  Walks
// forward from `start` until a goal state is reached.
Plan reconstructBackward(const Problem& problem, State start, const std::vector<State>& next,
                         const std::vector<Action>& nextAction);

// Glues a plan that ends at state s to one that starts at s.
Plan concatenate(const Problem& problem, const Plan& first, const Plan& second);

std::string toString(const Problem& problem, const Plan& plan);

// Pretty-prints a stage-indexed cost table the way Figures 2.9 / 2.12 / 2.14 do.
std::string formatCostTable(const Problem& problem,
                            const std::vector<std::string>& rowLabels,
                            const std::vector<std::vector<double>>& rows);

}  // namespace planning
