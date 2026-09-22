// Exercise 02 -- Dijkstra's algorithm.
//
// Read exercises/ch02/ex02_dijkstra/README.md first.
#include <queue>
#include <vector>

#include "planning/search.hpp"

namespace planning {

Plan dijkstra(const Problem& problem) {
  // TODO(you): the same template as Exercise 01, with Q sorted by the
  // cost-to-come C(x).
  //
  //   - C(x_I) = 0, and every other state starts at infinity.
  //   - When you generate x' = f(x, u), the candidate cost is C(x) + l(x, u).
  //   - Line 12 of Figure 2.4 now has work to do: if x' is already in Q with a
  //     larger cost, lower it and re-sort Q.
  //   - std::priority_queue has no decrease-key.  The usual workaround is to
  //     push a second entry and ignore an entry when you pop it if the state
  //     is already dead.  Convince yourself this is safe before you write it --
  //     the argument is the induction in Section 2.2.2.
  //   - Test the goal when you *pop* a state, not when you generate it.  Write
  //     yourself a note about why: it is the same reason C(x) only becomes
  //     C*(x) at that moment.
  (void)problem;
  return Plan{};
}

}  // namespace planning
