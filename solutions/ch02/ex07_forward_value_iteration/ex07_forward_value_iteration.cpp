// Reference solution -- Exercise 07: the cost already spent.
//
// The mirror of Exercise 06:
//
//     alreadySpent(place, after k+1) = min over moves arriving here of
//                                        [ alreadySpent(where it came from,
//                                            after k) + cost of the move ]
//
// Two things change.  The boundary row is now about where the aeroplane *is*
// rather than where it is going, and the sweep needs to know how places are
// reached rather than where they lead.  That asymmetry is why the backward form
// is usually presented first.
//
// [book] Section 2.3.1.2, equation (2.16).
#include <algorithm>
#include <vector>

#include "planning/value_iteration.hpp"

namespace planning {

CostTable forwardValueIteration(const Problem& problem, int K) {
  const int n = problem.numStates();
  CostTable rows;
  rows.reserve(static_cast<std::size_t>(K) + 1);

  // Row 0: zero where the aeroplane is, infinity elsewhere.  Note that nothing
  // here mentions where it is *going* -- the destination only enters when the
  // final cost is added at the end.
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
