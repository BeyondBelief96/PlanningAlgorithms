// Exercise 03 -- The quickest route, faster.
//
// Read exercises/ch02/ex03_astar/README.md first.
#include <queue>
#include <vector>

#include "planning/search.hpp"

namespace planning {

Plan aStar(const Problem& problem, const Heuristic& h) {
  // TODO(you): Exercise 02, ordered by "spent so far + guess at what is still
  // to come" instead of "spent so far".  Same answer, arrived at after looking
  // at far less of the airport -- as long as the guess never runs high.
  //
  // Watch out for h(x) == infinity, which the surface guesses return for a
  // square from which the goal cannot be reached at all.  Adding infinity to a
  // finite cost is legal and makes the ordering useless -- decide what to do
  // and say why in a comment.
  //
  // [book] LaValle Section 2.2.2, A*.
  (void)problem;
  (void)h;
  return Plan{};
}

Plan bestFirstSearch(const Problem& problem, const Heuristic& h) {
  // TODO(you): the same again, ordered by the guess alone.  The cost so far is
  // dropped entirely -- not de-emphasised, dropped -- which is what costs it
  // optimality and what makes it fast.
  //
  // Once it works, run it on maps::deadEndPier() and watch it taxi straight
  // into the cul-de-sac because the cul-de-sac is towards the goal.  It still
  // gets out, and it still finds the best route, because once it escapes there
  // is only one way round.  Building a surface where it comes back with a route
  // that is genuinely longer is the open exercise in the brief.
  //
  // [book] the 2D shadow of the spiral in Figure 2.5; the open part is book
  // Exercise 2.
  (void)problem;
  (void)h;
  return Plan{};
}

}  // namespace planning
