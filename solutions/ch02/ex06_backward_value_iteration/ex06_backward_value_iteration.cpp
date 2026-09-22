// Reference solution -- Exercise 06: backward value iteration, fixed length.
//
// The whole of Section 2.3.1.1 is equation (2.11):
//
//     G*_k(x_k) = min over u_k of [ l(x_k, u_k) + G*_{k+1}(f(x_k, u_k)) ]
//
// started from the boundary condition G*_F = l_F.  One sweep over X per stage,
// K sweeps in all, O(K |X| |U|) total -- against O(|U|^K) for enumerating plans.
#include <algorithm>
#include <vector>

#include "planning/value_iteration.hpp"

namespace planning {

CostTable backwardValueIteration(const Problem& problem, int K) {
  const int n = problem.numStates();
  CostTable rows;
  rows.reserve(static_cast<std::size_t>(K) + 1);

  // Row 0 is G*_F = l_F: zero on the goal set, infinity everywhere else.
  std::vector<double> current(n);
  for (State x = 0; x < n; ++x) current[x] = problem.finalCost(x);
  rows.push_back(current);

  // Row r is G*_{F-r}, so row K is G*_1.
  for (int r = 1; r <= K; ++r) {
    std::vector<double> nextRow(n, kInfinity);
    for (State x = 0; x < n; ++x) {
      for (const Transition& t : problem.successors(x)) {
        if (current[t.x] == kInfinity) continue;  // avoid inf - inf nonsense
        nextRow[x] = std::min(nextRow[x], t.cost + current[t.x]);
      }
    }
    rows.push_back(nextRow);
    current = std::move(nextRow);
  }
  return rows;
}

Plan planFromBackwardValues(const Problem& problem, const CostTable& G) {
  Plan plan;
  if (G.empty()) return plan;
  const int K = static_cast<int>(G.size()) - 1;

  const State start = problem.initialState();
  if (G[K][start] == kInfinity) return plan;  // no K-step plan reaches X_G

  plan.found = true;
  plan.states.push_back(start);
  State x = start;

  // At stage k we need G*_{k+1}, which lives in row K - k.
  for (int k = 1; k <= K; ++k) {
    const std::vector<double>& nextValues = G[K - k];
    double best = kInfinity;
    Transition choice;
    for (const Transition& t : problem.successors(x)) {
      if (nextValues[t.x] == kInfinity) continue;
      const double candidate = t.cost + nextValues[t.x];
      if (candidate < best) {
        best = candidate;
        choice = t;
      }
    }
    if (best == kInfinity) return Plan{};  // the table lied; should not happen
    plan.actions.push_back(choice.u);
    plan.states.push_back(choice.x);
    plan.cost += choice.cost;
    x = choice.x;
  }
  return plan;
}

}  // namespace planning
