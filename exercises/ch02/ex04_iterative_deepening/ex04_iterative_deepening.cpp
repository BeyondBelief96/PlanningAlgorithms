// Exercise 04 -- Iterative deepening and IDA*.
//
// Read exercises/ch02/ex04_iterative_deepening/README.md first.
#include <algorithm>
#include <vector>

#include "planning/search.hpp"

namespace planning {

Plan iterativeDeepening(const Problem& problem, int maxDepth) {
  // TODO(you): for limit = 0, 1, 2, ..., run a depth-limited depth-first
  // search and throw the result away if it fails.
  //
  //   - A recursive helper is much easier to write than an explicit stack here.
  //   - Do NOT keep a global visited set across the recursion.  A state that
  //     was too deep down one branch may be shallow enough down another.  What
  //     you do need is a "currently on the path" marker, to avoid cycling.
  //   - Prove to yourself that the plan you get has the same length as the one
  //     breadthFirstSearch() returns.  The test checks exactly that.
  (void)problem;
  (void)maxDepth;
  return Plan{};
}

Plan iterativeDeepeningAStar(const Problem& problem, const Heuristic& h, int maxIterations) {
  // TODO(you): the same idea with the cutoff on C(x) + h(x) rather than depth.
  //
  // The subtle part is choosing the next bound.  Raising it by a fixed step
  // either re-explores the same tree or skips past the optimum.  Instead, have
  // the depth-limited search return the smallest f value it *rejected*, and use
  // that as the next bound.
  (void)problem;
  (void)h;
  (void)maxIterations;
  return Plan{};
}

}  // namespace planning
