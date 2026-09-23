// Reference solution -- Exercise 04: without holding the frontier.
//
// Depth first gives no control over how long the route is and can charge off
// forever; breadth first is well-behaved but holds the whole frontier in
// memory.  Iterative deepening keeps depth first's memory profile and breadth
// first's guarantee by throwing the previous pass's work away.  The waste is
// bounded: the last level usually dwarfs everything before it.
//
// On a grid of pavement this is the wrong trade -- every square is reachable
// several ways.  On a state space of poses, where the frontier will not fit in
// memory, it is the right one.
//
// [book] LaValle Section 2.2.2.
#include <algorithm>
#include <vector>

#include "planning/search.hpp"

namespace planning {
namespace {

struct Frame {
  State x;
  Action u;  // the action applied at the *previous* state to arrive here
};

// Depth-limited DFS.  `onPath` prevents cycling within the current branch; note
// that we deliberately do not keep a global visited set, because a state that
// was too deep in one branch may be shallow enough in another.
bool depthLimited(const Problem& problem, State x, int budget, std::vector<bool>& onPath,
                  std::vector<Frame>& path, Plan& stats) {
  ++stats.expanded;
  if (problem.isGoal(x)) return true;
  if (budget == 0) return false;

  onPath[x] = true;
  for (const Transition& t : problem.successors(x)) {
    if (onPath[t.x]) continue;
    path.push_back({t.x, t.u});
    ++stats.generated;
    if (depthLimited(problem, t.x, budget - 1, onPath, path, stats)) {
      onPath[x] = false;
      return true;
    }
    path.pop_back();
  }
  onPath[x] = false;
  return false;
}

Plan assemble(const Problem& problem, const std::vector<Frame>& path) {
  Plan plan;
  plan.found = true;
  plan.states.push_back(path.front().x);
  for (std::size_t i = 1; i < path.size(); ++i) {
    plan.actions.push_back(path[i].u);
    plan.states.push_back(path[i].x);
    for (const Transition& t : problem.successors(path[i - 1].x))
      if (t.u == path[i].u && t.x == path[i].x) plan.cost += t.cost;
  }
  return plan;
}

}  // namespace

Plan iterativeDeepening(const Problem& problem, int maxDepth) {
  Plan stats;
  for (int limit = 0; limit <= maxDepth; ++limit) {
    std::vector<bool> onPath(problem.numStates(), false);
    std::vector<Frame> path{{problem.initialState(), kNoAction}};
    if (depthLimited(problem, problem.initialState(), limit, onPath, path, stats)) {
      Plan plan = assemble(problem, path);
      plan.expanded = stats.expanded;
      plan.generated = stats.generated;
      return plan;
    }
  }
  return stats;
}

namespace {

// Cost-bounded DFS for IDA*.  Returns the smallest f value that exceeded the
// bound, so the next iteration can raise the bound to exactly that -- raising
// it by less would re-explore the same tree for nothing.
double costLimited(const Problem& problem, State x, double g, double bound, const Heuristic& h,
                   std::vector<bool>& onPath, std::vector<Frame>& path, Plan& stats, bool& found) {
  const double f = g + h(x);
  if (f > bound) return f;
  ++stats.expanded;
  if (problem.isGoal(x)) {
    found = true;
    return f;
  }

  double nextBound = kInfinity;
  onPath[x] = true;
  for (const Transition& t : problem.successors(x)) {
    if (onPath[t.x]) continue;
    path.push_back({t.x, t.u});
    ++stats.generated;
    const double exceeded =
        costLimited(problem, t.x, g + t.cost, bound, h, onPath, path, stats, found);
    if (found) {
      onPath[x] = false;
      return exceeded;
    }
    nextBound = std::min(nextBound, exceeded);
    path.pop_back();
  }
  onPath[x] = false;
  return nextBound;
}

}  // namespace

Plan iterativeDeepeningAStar(const Problem& problem, const Heuristic& h, int maxIterations) {
  Plan stats;
  const State start = problem.initialState();
  double bound = h(start);

  for (int i = 0; i < maxIterations && bound != kInfinity; ++i) {
    std::vector<bool> onPath(problem.numStates(), false);
    std::vector<Frame> path{{start, kNoAction}};
    bool found = false;
    const double next = costLimited(problem, start, 0.0, bound, h, onPath, path, stats, found);
    if (found) {
      Plan plan = assemble(problem, path);
      plan.expanded = stats.expanded;
      plan.generated = stats.generated;
      return plan;
    }
    bound = next;
  }
  return stats;
}

}  // namespace planning
