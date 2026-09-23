// Exercise 01 -- A route at all.
//
// Read exercises/ch02/ex01_forward_search/README.md first.
//
// Build and test:   cmake --build build/ninja --target test_ex01_forward_search
//                   ctest --test-dir build/ninja -R ch02.ex01 --output-on-failure
#include <deque>
#include <vector>

#include "planning/search.hpp"

namespace planning {
namespace {

// TODO(you): write the search template once, and let the queue discipline be
// the only thing that differs between breadth and depth first.
//
//   1  put where the aeroplane is into Q, and mark it visited
//   2  while Q is not empty
//   3      x <- take one out of Q
//   4      if x will do, return SUCCESS
//   5      for each option available at x
//   6          x' <- where that option leads
//   7          if x' has not been visited
//   8              mark x' visited and put it into Q
//   9          else
//   10             deal with having reached x' twice
//   11 return FAILURE
//
// Things the template leaves out and you have to decide:
//   - How do you recover the route?  (Hint: record, for each place, which place
//     it was first reached from and which move did it, then call
//     reconstructForward().)
//   - Where do you mark a place visited -- when you put it in, or when you take
//     it out?  Either works here; say why in a comment.  It will *not* be
//     either in Exercise 02.
//   - Fill in Plan::expanded (places examined) and Plan::generated (places ever
//     queued).  Exercises 02 to 05 are largely about comparing those two
//     numbers across methods, so start collecting them now.
//
// [book] LaValle Figure 2.4, FORWARD_SEARCH.

}  // namespace

Plan breadthFirstSearch(const Problem& problem) {
  const int n = problem.numStates();
  std::vector<bool> visited(n, false);
  std::vector<State> parents(n, kNoState);
  std::vector<Action> parentActions(n, kNoAction);
  std::deque<State> q;
  q.push_back(problem.initialState());

  while(!q.empty()) {
    State x = q.front();

    if(problem.isGoal(x)) {
      Plan plan = reconstructForward(problem, x, parents, parentActions);
      return plan;
    }
  }

  return Plan{};
}

Plan depthFirstSearch(const Problem& problem) {
  // TODO(you): Q is LIFO.
  (void)problem;
  return Plan{};
}

}  // namespace planning
