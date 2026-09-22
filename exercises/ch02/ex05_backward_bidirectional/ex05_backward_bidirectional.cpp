// Exercise 05 -- Backward and bidirectional search (Figures 2.6 and 2.7).
//
// Read exercises/ch02/ex05_backward_bidirectional/README.md first.
#include <algorithm>
#include <queue>
#include <vector>

#include "planning/search.hpp"

namespace planning {

Plan backwardDijkstra(const Problem& problem) {
  // TODO(you): Dijkstra from the goal set, walking f^{-1}.
  //
  //   - Seed Q with every state of goalStates(), each at cost 0.
  //   - problem.predecessors(x) gives Transitions whose .x is the *predecessor*
  //     x', and whose .cost is l(x', u).  So the relaxation reads
  //     G(x') <- G(x) + l(x', u).
  //   - What you are computing is the cost-to-go G(x), not the cost-to-come.
  //   - Stop when you pop x_I.
  //   - reconstructBackward() turns the next[] / nextAction[] arrays you build
  //     into a forward-reading Plan.
  //
  // This is book Exercise 6(a): argue that it still yields optimal plans.
  (void)problem;
  return Plan{};
}

Plan bidirectionalSearch(const Problem& problem) {
  // TODO(you): grow a tree from x_I along f and a tree from X_G along f^{-1},
  // and stop when they touch.
  //
  // Figure 2.7 pops one state from each queue per iteration.  That is simple,
  // but it can return a plan one action longer than necessary, because the two
  // trees may meet in the middle of a level.  The test here insists the plan
  // has the same length breadthFirstSearch() finds, so expand one whole
  // wavefront at a time -- always the smaller of the two -- and check for a
  // meeting after each wavefront.
  //
  // Use concatenate() to glue the forward half to the backward half.
  //
  // This is book Exercise 20: instrument Plan::expanded and compare against
  // plain breadth-first search on maps::openRoom().
  (void)problem;
  return Plan{};
}

}  // namespace planning
