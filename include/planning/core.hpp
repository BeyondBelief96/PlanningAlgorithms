// core.hpp -- The vocabulary every planner in this repo is written in.
//
// A planning problem, stripped to what an algorithm actually needs:
//
//   where the aeroplane is now              -> initialState()
//   whether a place will do                 -> isGoal()
//   what it can do from here, what each      -> successors(x)
//     option costs and where it leads
//   how it could have got here              -> predecessors(x)
//
// Note what is *not* here: the airport.  No map, no chart, no list of taxiways.
// A planner is handed the moves available from wherever it happens to be
// asking, and nothing else -- because in the capstone, and in every chapter of
// the book after this one, the set of places an aeroplane could be is far too
// large to write down.  Resist the urge to materialise the graph.
//
// This file is part of the *given* library: you do not edit it while working
// the exercises.
//
// [book] LaValle Formulations 2.1, 2.2 and 2.3:
//   X state space, U(x) actions, f(x, u) transition, l(x, u) cost,
//   x_I initial state, X_G goal set.
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

// One move: what you did, where it put you, and what it cost.
// [book] one edge of the state transition graph.
struct Transition {
  Action u = kNoAction;  // the action taken
  State x = kNoState;    // forward: f(x, u).  backward: the x with f(x, u) == this state.
  double cost = 1.0;     // l(x, u), always taken at the *originating* vertex
};

// A discrete planning problem: somewhere to start, somewhere to get to, and a
// way to ask what is available from a given place.
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

  // How hard the planner had to work for this.  Two planners that return the
  // same route are not equally good; on a real surface graph the difference is
  // milliseconds against seconds.  [book] Exercises 18-20.
  long long expanded = 0;   // places actually examined
  long long generated = 0;  // places ever queued to be examined

  int length() const { return static_cast<int>(actions.size()); }
  explicit operator bool() const { return found; }
};

// A guess at how much is still to go from x -- the thing that turns a blind
// search into a directed one.  It must never guess high, or A* stops being
// optimal.  [book] the heuristic Ghat(x).
using Heuristic = std::function<double(State)>;

// \hat{G}(x) == 0 for all x.  A* with this degenerates to Dijkstra's algorithm.
Heuristic zeroHeuristic();

// Re-flies the route move by move and checks that it really starts where the
// aeroplane is, really ends somewhere acceptable, that every move was actually
// available where it was used, and that the quoted cost is the sum of the
// moves.  Returns "" when the route holds up, otherwise the first thing wrong
// with it.
//
// Every test in this repo runs this.  A route you cannot check is not a route
// you can taxi.
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

// Prints a cost table: one row per sweep, one column per place.
// [book] the layout of Figures 2.9, 2.12 and 2.14.
std::string formatCostTable(const Problem& problem,
                            const std::vector<std::string>& rowLabels,
                            const std::vector<std::vector<double>>& rows);

}  // namespace planning
