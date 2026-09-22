// Reference solution -- Exercise 02: Dijkstra's algorithm.
//
// Same template as Exercise 01, but Q is sorted by the cost-to-come C(x), and
// line 12 of Figure 2.4 finally has work to do: a state already in Q may be
// reached again along a cheaper path, and must then be re-sorted.
//
// std::priority_queue cannot decrease a key, so we use the standard trick of
// pushing a second entry and discarding stale pops.  The `dead` flag is the
// book's third category of state, and it is what makes the discard safe: once
// a state has been removed from Q its cost-to-come is final (see the induction
// argument in Section 2.2.2).
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
