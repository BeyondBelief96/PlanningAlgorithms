// Reference solution -- Exercise 05: backward and bidirectional search.
//
// Figure 2.6 is Figure 2.4 with f replaced by f^{-1} and the roles of x_I and
// X_G swapped.  Figure 2.7 runs both at once and stops when the two trees
// touch.
#include <algorithm>
#include <queue>
#include <vector>

#include "planning/search.hpp"

namespace planning {

Plan backwardDijkstra(const Problem& problem) {
  const int n = problem.numStates();
  std::vector<double> costToGo(n, kInfinity);  // G(x)
  std::vector<bool> dead(n, false);
  std::vector<State> next(n, kNoState);
  std::vector<Action> nextAction(n, kNoAction);

  using Entry = std::pair<double, State>;
  std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> q;

  Plan stats;
  for (State g : problem.goalStates()) {
    costToGo[g] = 0.0;
    q.push({0.0, g});
    ++stats.generated;
  }

  while (!q.empty()) {
    const auto [c, x] = q.top();
    q.pop();
    if (dead[x]) continue;
    dead[x] = true;
    ++stats.expanded;

    if (x == problem.initialState()) {
      Plan plan = reconstructBackward(problem, x, next, nextAction);
      plan.expanded = stats.expanded;
      plan.generated = stats.generated;
      return plan;
    }

    // t.x is the predecessor x', reached by applying t.u there.
    for (const Transition& t : problem.predecessors(x)) {
      if (dead[t.x]) continue;
      const double candidate = c + t.cost;
      if (candidate >= costToGo[t.x]) continue;
      costToGo[t.x] = candidate;
      next[t.x] = x;
      nextAction[t.x] = t.u;
      q.push({candidate, t.x});
      ++stats.generated;
    }
  }

  Plan plan;
  plan.expanded = stats.expanded;
  plan.generated = stats.generated;
  return plan;
}

Plan bidirectionalSearch(const Problem& problem) {
  const int n = problem.numStates();
  const State start = problem.initialState();

  Plan stats;
  if (problem.isGoal(start)) {
    Plan plan;
    plan.found = true;
    plan.states = {start};
    return plan;
  }

  std::vector<bool> seenF(n, false), seenB(n, false);
  std::vector<State> parent(n, kNoState), next(n, kNoState);
  std::vector<Action> parentAction(n, kNoAction), nextAction(n, kNoAction);

  std::vector<State> frontierF{start};
  std::vector<State> frontierB = problem.goalStates();
  seenF[start] = true;
  for (State g : frontierB) seenB[g] = true;
  stats.generated = 1 + static_cast<long long>(frontierB.size());

  // We expand one whole wavefront per round, always the smaller of the two.
  //
  // Figure 2.7 instead pops a single state from each queue per iteration.  That
  // is simpler, but it can return a plan one step longer than necessary,
  // because the two trees may touch in the middle of a level.  Expanding whole
  // levels costs nothing extra and keeps the "fewest actions" guarantee that
  // breadth-first search gives.
  while (!frontierF.empty() && !frontierB.empty()) {
    const bool forward = frontierF.size() <= frontierB.size();
    std::vector<State>& frontier = forward ? frontierF : frontierB;
    std::vector<bool>& seenHere = forward ? seenF : seenB;
    const std::vector<bool>& seenThere = forward ? seenB : seenF;

    std::vector<State> nextFrontier;
    std::vector<State> meetings;
    for (State x : frontier) {
      ++stats.expanded;
      const std::vector<Transition> edges =
          forward ? problem.successors(x) : problem.predecessors(x);
      for (const Transition& t : edges) {
        if (seenHere[t.x]) continue;
        seenHere[t.x] = true;
        if (forward) {
          parent[t.x] = x;
          parentAction[t.x] = t.u;
        } else {
          next[t.x] = x;
          nextAction[t.x] = t.u;
        }
        nextFrontier.push_back(t.x);
        ++stats.generated;
        if (seenThere[t.x]) meetings.push_back(t.x);
      }
    }

    if (!meetings.empty()) {
      // Any meeting point in this level yields a shortest plan; take the first.
      const State meet = meetings.front();
      const Plan head = reconstructForward(problem, meet, parent, parentAction);
      const Plan tail = reconstructBackward(problem, meet, next, nextAction);
      Plan plan = concatenate(problem, head, tail);
      plan.expanded = stats.expanded;
      plan.generated = stats.generated;
      return plan;
    }
    frontier = std::move(nextFrontier);
  }

  Plan plan;
  plan.expanded = stats.expanded;
  plan.generated = stats.generated;
  return plan;
}

}  // namespace planning
