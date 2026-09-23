// Reference solution -- Exercise 02: the quickest route.
//
// Same template as Exercise 01, but Q is ordered by how cheap it was to reach
// each place, and meeting a place twice finally has work to do: it may have
// turned out to be reachable more cheaply, and then it has to be re-sorted.
//
// std::priority_queue cannot lower a key, so we use the standard trick of
// pushing a second entry and discarding stale ones as they surface.  The `dead`
// flag is what makes the discard safe: once a place has come out of Q its cost
// is final, so every later copy is by definition worse.  The argument is the
// induction in docs/ch02/03-search-methods.md.
//
// [book] LaValle Section 2.2.2.
#include <queue>
#include <vector>

#include "planning/search.hpp"

namespace planning {

Plan dijkstra(const Problem& problem) {
  const int n = problem.numStates();
  std::vector<double> cost(n, kInfinity);   // C(x), optimal once `dead`
  std::vector<bool> dead(n, false);
  std::vector<State> parent(n, kNoState);
  std::vector<Action> parentAction(n, kNoAction);

  using Entry = std::pair<double, State>;  // (C(x), x), smallest first
  std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> q;

  Plan stats;
  const State start = problem.initialState();
  cost[start] = 0.0;
  q.push({0.0, start});
  ++stats.generated;

  while (!q.empty()) {
    const auto [c, x] = q.top();
    q.pop();
    if (dead[x]) continue;  // a stale entry left behind by a decrease-key
    dead[x] = true;
    ++stats.expanded;

    if (problem.isGoal(x)) {
      Plan plan = reconstructForward(problem, x, parent, parentAction);
      plan.expanded = stats.expanded;
      plan.generated = stats.generated;
      return plan;
    }

    for (const Transition& t : problem.successors(x)) {
      if (dead[t.x]) continue;
      const double candidate = c + t.cost;
      if (candidate >= cost[t.x]) continue;  // line 12: only improvements matter
      cost[t.x] = candidate;
      parent[t.x] = x;
      parentAction[t.x] = t.u;
      q.push({candidate, t.x});
      ++stats.generated;
    }
  }

  Plan plan;
  plan.expanded = stats.expanded;
  plan.generated = stats.generated;
  return plan;
}

}  // namespace planning
