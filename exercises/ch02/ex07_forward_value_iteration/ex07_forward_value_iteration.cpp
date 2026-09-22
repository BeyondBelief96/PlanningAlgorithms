// Exercise 07 -- Forward value iteration, fixed plan length (Section 2.3.1.2).
//
// Read exercises/ch02/ex07_forward_value_iteration/README.md first.
#include <algorithm>
#include <vector>

#include "planning/value_iteration.hpp"

namespace planning {

CostTable forwardValueIteration(const Problem& problem, int K) {
  // TODO(you): implement equation (2.16),
  //
  //     C*_{k+1}(x_{k+1}) = min over (x_k, u) with f(x_k, u) = x_{k+1}
  //                             of [ C*_k(x_k) + l(x_k, u) ]
  //
  // starting from C*_1(x) = 0 at x_I and infinity elsewhere.
  //
  // Return K + 1 rows: row 0 is C*_1, row k is C*_{k+1}, matching Figure 2.12.
  //
  // Two things to notice while you write it, because they are the real lesson
  // of this section:
  //   - Nothing here mentions X_G.  The goal only enters when you add l_F at
  //     the end.  The backward version, by contrast, cannot even start without
  //     knowing X_G.
  //   - You need f^{-1}, not f.  problem.predecessors(x) gives it to you here,
  //     but in a real problem f^{-1} may be far harder to compute than f.
  (void)problem;
  (void)K;
  return {};
}

}  // namespace planning
