#include "planning/graphs.hpp"

#include <algorithm>
#include <stdexcept>

namespace planning {

GraphProblem::GraphProblem(std::vector<std::string> stateNames, State initial,
                           std::vector<State> goals)
    : names_(std::move(stateNames)), out_(names_.size()), initial_(initial),
      goals_(std::move(goals)) {}

void GraphProblem::addEdge(State from, State to, double cost) {
  if (from < 0 || from >= numStates() || to < 0 || to >= numStates())
    throw std::out_of_range("GraphProblem::addEdge: state index out of range");
  out_[from].push_back({to, cost});
}

void GraphProblem::addEdge(const std::string& from, const std::string& to, double cost) {
  const State f = stateByName(from);
  const State t = stateByName(to);
  if (f == kNoState || t == kNoState)
    throw std::invalid_argument("GraphProblem::addEdge: unknown state name");
  addEdge(f, t, cost);
}

State GraphProblem::stateByName(const std::string& n) const {
  const auto it = std::find(names_.begin(), names_.end(), n);
  return it == names_.end() ? kNoState : static_cast<State>(it - names_.begin());
}

int GraphProblem::numStates() const { return static_cast<int>(names_.size()); }
State GraphProblem::initialState() const { return initial_; }

bool GraphProblem::isGoal(State x) const {
  return std::find(goals_.begin(), goals_.end(), x) != goals_.end();
}

std::vector<State> GraphProblem::goalStates() const { return goals_; }

std::vector<Transition> GraphProblem::successors(State x) const {
  std::vector<Transition> result;
  if (x < 0 || x >= numStates()) return result;
  result.reserve(out_[x].size());
  for (std::size_t u = 0; u < out_[x].size(); ++u)
    result.push_back({static_cast<Action>(u), out_[x][u].to, out_[x][u].cost});
  return result;
}

std::vector<Transition> GraphProblem::predecessors(State x) const {
  std::vector<Transition> result;
  for (State from = 0; from < numStates(); ++from)
    for (std::size_t u = 0; u < out_[from].size(); ++u)
      if (out_[from][u].to == x)
        result.push_back({static_cast<Action>(u), from, out_[from][u].cost});
  return result;
}

std::string GraphProblem::name(State x) const {
  if (x < 0 || x >= numStates()) return "?";
  return names_[x];
}

GraphProblem figure2_8() {
  GraphProblem g({"a", "b", "c", "d", "e"}, 0, {3});
  g.addEdge("a", "a", 2);
  g.addEdge("a", "b", 2);
  g.addEdge("b", "c", 1);
  g.addEdge("b", "d", 4);
  g.addEdge("c", "d", 1);
  g.addEdge("c", "a", 1);
  g.addEdge("d", "c", 1);
  g.addEdge("d", "e", 1);
  return g;
}

GraphProblem figure2_21() {
  GraphProblem g({"a", "b", "c", "d", "e"}, 0, {4});
  g.addEdge("a", "b", 2);
  g.addEdge("b", "a", 1);
  g.addEdge("b", "c", 4);
  g.addEdge("c", "d", 3);
  g.addEdge("c", "e", 7);
  g.addEdge("d", "c", 1);
  g.addEdge("d", "d", 1);
  g.addEdge("d", "e", 1);
  return g;
}

}  // namespace planning
