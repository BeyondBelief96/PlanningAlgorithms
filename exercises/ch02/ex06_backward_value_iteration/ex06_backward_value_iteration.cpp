// Exercise 06 -- Backward value iteration, fixed plan length (Section 2.3.1.1).
//
// Read exercises/ch02/ex06_backward_value_iteration/README.md first.
#include <algorithm>
#include <vector>

#include "planning/value_iteration.hpp"

namespace planning {

CostTable backwardValueIteration(const Problem& problem, int K) {
  // TODO(you): implement equation (2.11),
  //
  //     G*_k(x_k) = min over u_k of [ l(x_k, u_k) + G*_{k+1}(f(x_k, u_k)) ]
  //
  // starting from G*_F(x) = l_F(x) = problem.finalCost(x).
  //
  // Return K + 1 rows: row 0 is G*_F, row 1 is G*_K, ..., row K is G*_1.
  // (That ordering is the one Figure 2.9 prints, top to bottom.)
  //
  //   - Beware infinity.  If G*_{k+1}(f(x, u)) is infinite, skip that action
  //     rather than computing inf + something.
  //   - There is no termination action in this formulation.  A plan must use
  //     exactly K actions, so a state can be *in* X_G and still have an
  //     infinite value -- look at the d column of Figure 2.9 and make sure you
  //     understand why it is infinite at G*_4 and G*_2.
  (void)problem;
  (void)K;
  return {};
}

Plan planFromBackwardValues(const Problem& problem, const CostTable& G) {
  // TODO(you): walk forward from x_I, at each stage picking the action that
  // attains the min in (2.11).
  //
  // The index arithmetic is the fiddly part: at stage k you need G*_{k+1},
  // which is row K - k of the table.  Write it out on paper for K = 4 first.
  //
  // Return an unfound Plan when no K-step plan reaches X_G.
  (void)problem;
  (void)G;
  return Plan{};
}

}  // namespace planning
