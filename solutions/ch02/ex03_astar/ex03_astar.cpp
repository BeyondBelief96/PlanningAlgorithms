// Reference solution -- Exercise 03: the quickest route, faster.
//
// A* is Exercise 02 with one line changed: order Q by "spent so far + guess at
// what is still to come" rather than "spent so far".  Best first is the same
// code again with the spent-so-far term dropped entirely -- which is what costs
// it optimality and what makes it fast.
//
// [book] "The A* search algorithm works in exactly the same way as Dijkstra's
// algorithm.  The only difference is the function used to sort Q." 
#include <queue>
#include <vector>

#include "planning/search.hpp"

namespace planning {
namespace {

// weightOnCostToCome == 1 gives A*; == 0 gives best-first search.
Plan heuristicSearch(const Problem& problem, const Heuristic& h, double weightOnCostToCome) {
  const int n = problem.numStates();
  std::vector<double> cost(n, kInfinity);
  std::vector<bool> dead(n, false);
  std::vector<State> parent(n, kNoState);
  std::vector<Action> parentAction(n, kNoAction);

  using Entry = std::pair<double, State>;
  std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> q;

  Plan stats;
  const State start = problem.initialState();
  cost[start] = 0.0;
  q.push({weightOnCostToCome * 0.0 + h(start), start});
  ++stats.generated;

  while (!q.empty()) {
    const State x = q.top().second;
    q.pop();
    if (dead[x]) continue;
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
      const double candidate = cost[x] + t.cost;
      if (candidate >= cost[t.x]) continue;
      cost[t.x] = candidate;
      parent[t.x] = x;
      parentAction[t.x] = t.u;
      const double estimate = h(t.x);
      // An infinite heuristic means "cannot reach the goal from here"; keep it
      // out of Q rather than letting inf + inf poison the ordering.
      if (estimate == kInfinity) continue;
      q.push({weightOnCostToCome * candidate + estimate, t.x});
      ++stats.generated;
    }
  }

  Plan plan;
  plan.expanded = stats.expanded;
  plan.generated = stats.generated;
  return plan;
}

}  // namespace

Plan aStar(const Problem& problem, const Heuristic& h) { return heuristicSearch(problem, h, 1.0); }

Plan bestFirstSearch(const Problem& problem, const Heuristic& h) {
  return heuristicSearch(problem, h, 0.0);
}

}  // namespace planning
