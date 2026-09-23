// Exercise 04 -- Without holding the frontier.
//
// Breadth first holds the whole frontier in memory.  On a grid of pavement that
// is fine; on a state space of poses it is not.  This gets breadth first's
// answer while holding one branch at a time.  [book] LaValle Section 2.2.2.
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
  //   - Do NOT keep a record of everywhere you have been across the recursion.
  //     A place too deep down one branch may be shallow enough down another, so
  //     marking it permanently visited will make you miss routes that exist.
  //     What you do need is a "currently on this branch" marker, so the search
  //     does not taxi in a circle within one branch.
  //   - Prove to yourself that the route you get has the same length as the one
  //     breadthFirstSearch() returns.  The test checks exactly that.
  (void)problem;
  (void)maxDepth;
  return Plan{};
}

Plan iterativeDeepeningAStar(const Problem& problem, const Heuristic& h, int maxIterations) {
  // TODO(you): the same idea with a ceiling on minutes rather than moves.
  //
  // The subtle part is choosing the next ceiling.  Raising it by a fixed step
  // either re-explores the same ground or steps straight over the answer.
  // Instead, have the bounded search report the smallest value it *rejected*,
  // and use exactly that next.
  (void)problem;
  (void)h;
  (void)maxIterations;
  return Plan{};
}

}  // namespace planning
