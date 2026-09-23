// Reference solution -- Exercise 08: what to do from anywhere.
//
// Letting the aeroplane stop does all the work.  Stopping keeps it where it is
// and adds no cost, so a two-move route padded out to five moves costs exactly
// the same.  That makes "best route of exactly K moves" equal to "best route of
// at most K moves", and once the sweeps stop changing anything the budget has
// effectively become unbounded:
//
//     stillToGo(x) = min( 0 if it may stop at x, else infinity,
//                         min over moves of [ cost + stillToGo(where it leads) ] )
//
// What comes out is not a route.  It is an instruction for every place on the
// airport, which is the whole reason this exercise exists.
//
// [book] Section 2.3.2; the stop option is the termination action u_T and the
// recurrence is (2.18).
#include <algorithm>
#include <stdexcept>
#include <vector>

#include "planning/value_iteration.hpp"

namespace planning {
namespace {

bool sameRow(const std::vector<double>& a, const std::vector<double>& b) {
  if (a.size() != b.size()) return false;
  for (std::size_t i = 0; i < a.size(); ++i) {
    if (a[i] == kInfinity || b[i] == kInfinity) {
      if (a[i] != b[i]) return false;
    } else if (std::abs(a[i] - b[i]) > 1e-12) {
      return false;
    }
  }
  return true;
}

}  // namespace

Stationary backwardValueIterationStationary(const Problem& problem, int maxIterations) {
  const int n = problem.numStates();
  Stationary result;

  // G*_0 is the final-stage cost l_F.
  std::vector<double> current(n);
  for (State x = 0; x < n; ++x) current[x] = problem.finalCost(x);
  result.history.push_back(current);

  while (true) {
    std::vector<double> nextRow(n);
    for (State x = 0; x < n; ++x) {
      // The termination action: stop here and collect l_F(x).
      double best = problem.finalCost(x);
      for (const Transition& t : problem.successors(x)) {
        if (current[t.x] == kInfinity) continue;
        best = std::min(best, t.cost + current[t.x]);
      }
      nextRow[x] = best;
    }
    ++result.iterations;

    if (sameRow(nextRow, current)) break;  // stationary: stop, do not record a duplicate
    if (result.iterations >= maxIterations)
      throw std::runtime_error(
          "backwardValueIterationStationary: values never became stationary; the cost functional "
          "probably admits a negative cycle");
    result.history.push_back(nextRow);
    current = std::move(nextRow);
  }

  result.G = current;

  // Recover the optimal actions with (2.19).  Ties go to u_T, so a goal state
  // stops rather than wandering off and coming back for the same cost.
  result.policy.assign(n, kNoAction);
  for (State x = 0; x < n; ++x) {
    if (result.G[x] == kInfinity) continue;
    double best = problem.finalCost(x);
    Action bestAction = best == kInfinity ? kNoAction : kTerminate;
    for (const Transition& t : problem.successors(x)) {
      if (result.G[t.x] == kInfinity) continue;
      const double candidate = t.cost + result.G[t.x];
      if (candidate < best - 1e-12) {
        best = candidate;
        bestAction = t.u;
      }
    }
    result.policy[x] = bestAction;
  }
  return result;
}

StationaryForward forwardValueIterationStationary(const Problem& problem, int maxIterations) {
  const int n = problem.numStates();
  StationaryForward result;

  std::vector<double> current(n, kInfinity);
  current[problem.initialState()] = 0.0;
  result.history.push_back(current);

  while (true) {
    std::vector<double> nextRow(n);
    for (State x = 0; x < n; ++x) {
      // Termination here means "we already got to x and stopped", so the old
      // value competes with every one-step extension that lands on x.
      double best = current[x];
      for (const Transition& t : problem.predecessors(x)) {
        if (current[t.x] == kInfinity) continue;
        best = std::min(best, current[t.x] + t.cost);
      }
      nextRow[x] = best;
    }
    ++result.iterations;

    if (sameRow(nextRow, current)) break;
    if (result.iterations >= maxIterations)
      throw std::runtime_error(
          "forwardValueIterationStationary: values never became stationary; the cost functional "
          "probably admits a negative cycle");
    result.history.push_back(nextRow);
    current = std::move(nextRow);
  }

  result.C = current;
  return result;
}

Plan planFromPolicy(const Problem& problem, const Stationary& stationary) {
  Plan plan;
  const State start = problem.initialState();
  if (start < 0 || start >= static_cast<int>(stationary.G.size())) return plan;
  if (stationary.G[start] == kInfinity) return plan;

  plan.found = true;
  plan.states.push_back(start);
  State x = start;

  // An optimal plan never revisits a state when costs are positive, so
  // numStates() steps is a generous bound and a cheap infinite-loop guard.
  for (int step = 0; step <= problem.numStates(); ++step) {
    if (problem.isGoal(x)) return plan;
    const Action u = stationary.policy[x];
    if (u == kTerminate || u == kNoAction) break;
    bool advanced = false;
    for (const Transition& t : problem.successors(x)) {
      if (t.u != u) continue;
      plan.actions.push_back(t.u);
      plan.states.push_back(t.x);
      plan.cost += t.cost;
      x = t.x;
      advanced = true;
      break;
    }
    if (!advanced) break;
  }
  return Plan{};  // the policy terminated somewhere that is not a goal
}

}  // namespace planning
