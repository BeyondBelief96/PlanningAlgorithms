// Exercise 03 -- A* and best-first search.
//
// Read exercises/ch02/ex03_astar/README.md first.
#include <queue>
#include <vector>

#include "planning/search.hpp"

namespace planning {

Plan aStar(const Problem& problem, const Heuristic& h) {
  // TODO(you): Exercise 02 with Q sorted by C(x) + h(x) instead of C(x).
  //
  // Watch out for h(x) == infinity, which the grid heuristics return for a
  // state from which no goal is reachable.  Adding infinity to a finite cost is
  // fine, but it makes the ordering useless -- decide what to do and say so.
  (void)problem;
  (void)h;
  return Plan{};
}

Plan bestFirstSearch(const Problem& problem, const Heuristic& h) {
  // TODO(you): the same again, sorted by h(x) alone.
  //
  // Once it works, run it on maps::bugTrap() and watch it dive into the pocket.
  // That is the 2D version of the spiral in Figure 2.5, and it is book
  // Exercise 2.
  (void)problem;
  (void)h;
  return Plan{};
}

}  // namespace planning
