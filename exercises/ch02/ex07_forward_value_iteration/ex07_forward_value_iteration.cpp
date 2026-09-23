// Exercise 07 -- The cost already spent, on the same budget.
//
// [book] LaValle Section 2.3.1.2.
//
// Read exercises/ch02/ex07_forward_value_iteration/README.md first.
#include <algorithm>
#include <vector>

#include "planning/value_iteration.hpp"

namespace planning {

CostTable forwardValueIteration(const Problem& problem, int K) {
  // TODO(you): the mirror image of Exercise 06.
  //
  //     alreadySpent(place, after k+1 moves) = min over moves arriving here of
  //                                              [ alreadySpent(where it came
  //                                                  from, after k)
  //                                                + cost of the move ]
  //
  // starting from 0 where the aeroplane is and infinity everywhere else.
  //
  // Return K + 1 rows: row 0 is zero moves made, row k is exactly k moves made.
  //
  // Two things to notice while you write it, because they are the real lesson:
  //   - Nothing here mentions where the aeroplane is *going*.  What it cost to
  //     get somewhere depends on the airport and where you started, not on the
  //     clearance.  The backward version cannot even start without knowing
  //     where the route is supposed to end.
  //   - You need to know how places are *reached*, not where they lead.
  //     problem.predecessors(x) hands it over here, but on a surface graph
  //     where the state carries a heading that is the harder direction.
  //
  // [book] equation (2.16), from C*_1(x_I) = 0; the table is Figure 2.12.
  (void)problem;
  (void)K;
  return {};
}

}  // namespace planning
