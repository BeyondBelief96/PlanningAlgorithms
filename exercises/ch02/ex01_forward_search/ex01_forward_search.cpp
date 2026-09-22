// Exercise 01 -- The general forward search template (Figure 2.4).
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

// TODO(you): write the template of Figure 2.4 once, and let the queue
// discipline be the only thing that differs between breadth and depth first.
//
//   1  Q.Insert(x_I) and mark x_I as visited
//   2  while Q not empty do
//   3      x <- Q.GetFirst()
//   4      if x in X_G
//   5          return SUCCESS
//   6      forall u in U(x)
//   7          x' <- f(x, u)
//   8          if x' not visited
//   9              mark x' as visited
//   10             Q.Insert(x')
//   11         else
//   12             resolve duplicate x'
//   13 return FAILURE
//
// Things the figure leaves out and you have to decide:
//   - How do you recover the plan?  (Hint: record a parent pointer and the
//     action that produced each state, then call reconstructForward().)
//   - Where do you mark a state visited -- when you insert it, or when you pop
//     it?  Either works here; say why in a comment.
//   - Fill in Plan::expanded and Plan::generated.  Exercises 18-20 of the book
//     are about comparing those numbers, so start collecting them now.

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
