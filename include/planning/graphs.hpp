// graphs.hpp -- Explicitly enumerated state transition graphs.
//
// Given library code.  These are the small worked examples from the book; the
// tests check your algorithms against the numbers LaValle prints.
#pragma once

#include <string>
#include <vector>

#include "planning/core.hpp"

namespace planning {

// A Problem backed by an adjacency list.  The action index u is simply the
// position of the edge in the out-edge list of the originating state, so
// U(x) = {0, 1, ..., outDegree(x) - 1}.
class GraphProblem : public Problem {
 public:
  GraphProblem(std::vector<std::string> stateNames, State initial, std::vector<State> goals);

  void addEdge(State from, State to, double cost);
  void addEdge(const std::string& from, const std::string& to, double cost);

  State stateByName(const std::string& n) const;  // kNoState if unknown

  int numStates() const override;
  State initialState() const override;
  bool isGoal(State x) const override;
  std::vector<State> goalStates() const override;
  std::vector<Transition> successors(State x) const override;
  std::vector<Transition> predecessors(State x) const override;
  std::string name(State x) const override;

  void setInitialState(State x) { initial_ = x; }
  void setGoalStates(std::vector<State> g) { goals_ = std::move(g); }

 private:
  struct Edge {
    State to;
    double cost;
  };
  std::vector<std::string> names_;
  std::vector<std::vector<Edge>> out_;
  State initial_;
  std::vector<State> goals_;
};

// Figure 2.8 -- the five-state example used for Examples 2.3 and 2.5.
//
//   a -> a  (2)   a -> b  (2)
//   b -> c  (1)   b -> d  (4)
//   c -> d  (1)   c -> a  (1)
//   d -> c  (1)   d -> e  (1)
//   e has no outgoing edges, so d is unreachable from e.
//
// Defaults: x_I = a, X_G = {d}.
GraphProblem figure2_8();

// Figure 2.21 -- the five-state problem of book Exercise 1.
//
//   a -> b  (2)
//   b -> a  (1)   b -> c  (4)
//   c -> d  (3)   c -> e  (7)
//   d -> c  (1)   d -> d  (1)   d -> e  (1)
//   e has no outgoing edges.
//
// Defaults: x_I = a, X_G = {e}.
GraphProblem figure2_21();

}  // namespace planning
