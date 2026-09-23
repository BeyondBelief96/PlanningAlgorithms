// Exercise 02 -- The quickest route.
//
// Read exercises/ch02/ex02_dijkstra/README.md first.
#include <queue>
#include <vector>

#include "planning/search.hpp"

namespace planning {

Plan dijkstra(const Problem& problem) {
  // TODO(you): the same template as Exercise 01, with Q ordered by how cheap
  // it was to reach each place.  This is the first method here whose answer you
  // would actually give a crew.
  //
  //   - Where the aeroplane is costs 0; everywhere else starts at infinity.
  //   - Reaching x' from x costs whatever x cost, plus the move.
  //   - Meeting a place a second time now has work to do: if x' is already in Q
  //     at a higher cost, lower it.
  //   - std::priority_queue has no way to lower a key.  Push a second entry at
  //     the lower cost and throw away stale ones as they surface.  Convince
  //     yourself this is safe before you write it -- the argument is the
  //     induction in the guide.
  //   - Mark a place dead when you *take it out*, not when you put it in.  That
  //     is the opposite of Exercise 01.
  //   - Check for arrival on removal too.  A place's cost is only known to be
  //     final at that moment, so returning when you *generate* the holding
  //     point gives you a route that merely reaches it.
  //
  // [book] LaValle Section 2.2.2.
  (void)problem;
  return Plan{};
}

}  // namespace planning
