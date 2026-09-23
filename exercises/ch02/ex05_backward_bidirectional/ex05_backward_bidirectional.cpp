// Exercise 05 -- From the other end.
//
// [book] LaValle Figures 2.6 and 2.7.
//
// Read exercises/ch02/ex05_backward_bidirectional/README.md first.
#include <algorithm>
#include <queue>
#include <vector>

#include "planning/search.hpp"

namespace planning {

Plan backwardDijkstra(const Problem& problem) {
  // TODO(you): Dijkstra from the holding point, working backwards along the
  // taxiways until you reach the aeroplane.
  //
  //   - Seed Q with every acceptable finishing place, each at cost 0.
  //   - problem.predecessors(x) gives Transitions whose .x is the place you
  //     came *from*, and whose .cost is the move's cost at its originating end.
  //     So the relaxation reads  stillToGo(t.x) <- stillToGo(x) + t.cost.
  //   - What you are computing is a different quantity: not what it cost to get
  //     here, but what it will cost to *finish* from here.  That is the more
  //     useful of the two, because it is an answer for every place rather than
  //     a route from one of them.  Exercise 08 computes the same thing by
  //     sweeping, and the capstone replans out of it.
  //   - Stop when you take out the place the aeroplane is.
  //   - reconstructBackward() turns the next[] / nextAction[] arrays you build
  //     into a forward-reading Plan.
  //
  // Then argue that it is still optimal.  The argument mirrors the forward
  // induction exactly, and it is four sentences.  [book] Exercise 6(a).
  (void)problem;
  return Plan{};
}

Plan bidirectionalSearch(const Problem& problem) {
  // TODO(you): grow one search from the aeroplane and one from the holding
  // point, and stop when they touch.
  //
  // The textbook version takes one place out of each queue per round.  That is
  // simple, and it can return a route one move longer than necessary, because
  // the two searches may meet partway through a level.  The test insists the
  // route has the same length breadthFirstSearch() finds, so expand one whole
  // wavefront at a time -- always the smaller of the two -- and check for a
  // meeting after each wavefront.
  //
  // Use concatenate() to glue the two halves together.
  //
  // Then instrument Plan::expanded and compare against plain breadth first on
  // maps::openApron().  Two small wavefronts touch far less pavement than one
  // large one.  [book] Exercise 20.
  (void)problem;
  return Plan{};
}

}  // namespace planning
