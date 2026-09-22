// Reference solution -- Exercise 07: forward value iteration, fixed length.
//
// The mirror of Exercise 06, equation (2.16):
//
//     C*_{k+1}(x_{k+1}) = min over (x_k, u) with f(x_k, u) = x_{k+1}
//                             of [ C*_k(x_k) + l(x_k, u) ]
//
// Two things change.  The boundary condition now involves x_I rather than X_G,
// and the sweep needs f^{-1}: to fill in a value at x you must know who can
// reach x, not where x leads.  That asymmetry is why LaValle presents the
// backward version first.
#include <algorithm>
#include <vector>

#include "planning/value_iteration.hpp"

namespace planning {

CostTable forwardValueIteration(const Problem& problem, int K) {
  const int n = problem.numStates();
  CostTable rows;
  rows.reserve(static_cast<std::size_t>(K) + 1);

  // Row 0 is C*_1: zero at x_I, infinity elsewhere.  Note that nothing here
  // mentions X_G -- the goal only enters when l_F is added at the end.
  std::vector<double> current(n, kInfinity);
  current[problem.initialState()] = 0.0;
  rows.push_back(current);

  for (int k = 1; k <= K; ++k) {
    std::vector<double> nextRow(n, kInfinity);
    for (State x = 0; x < n; ++x) {
      // t.x is the predecessor, t.cost is l(t.x, t.u).
      for (const Transition& t : problem.predecessors(x)) {
        if (current[t.x] == kInfinity) continue;
        nextRow[x] = std::min(nextRow[x], current[t.x] + t.cost);
      }
    }
    rows.push_back(nextRow);
    current = std::move(nextRow);
  }
  return rows;
}

}  // namespace planning
