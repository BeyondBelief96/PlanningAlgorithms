// Reference solution -- Exercise 01: the general forward search template.
//
// Figure 2.4 is one algorithm with a hole in it.  The hole is the priority
// function of Q.  Everything below is that figure, with the queue discipline
// passed in.
#include <deque>
#include <vector>

#include "planning/search.hpp"

namespace planning {
namespace {

enum class Discipline { Fifo, Lifo };

Plan forwardSearch(const Problem& problem, Discipline discipline) {
  const int n = problem.numStates();
  std::vector<bool> visited(n, false);
  std::vector<State> parent(n, kNoState);
  std::vector<Action> parentAction(n, kNoAction);

  Plan stats;
  std::deque<State> q;

  // 1  Q.Insert(x_I) and mark x_I as visited
  const State start = problem.initialState();
  q.push_back(start);
  visited[start] = true;
  ++stats.generated;

  // 2  while Q not empty do
  while (!q.empty()) {
    // 3  x <- Q.GetFirst()
    State x;
    if (discipline == Discipline::Fifo) {
      x = q.front();
      q.pop_front();
    } else {
      x = q.back();
      q.pop_back();
    }
    ++stats.expanded;

    // 4  if x in X_G, return SUCCESS
    if (problem.isGoal(x)) {
      Plan plan = reconstructForward(problem, x, parent, parentAction);
      plan.expanded = stats.expanded;
      plan.generated = stats.generated;
      return plan;
    }

    // 5  forall u in U(x)
    for (const Transition& t : problem.successors(x)) {
      // 6  x' <- f(x, u)
      // 7-9  if x' not visited, mark it and insert it
      if (visited[t.x]) continue;  // 10-12: nothing to resolve for BFS/DFS
      visited[t.x] = true;
      parent[t.x] = x;
      parentAction[t.x] = t.u;
      q.push_back(t.x);
      ++stats.generated;
    }
  }

  // 13  return FAILURE
  Plan plan;
  plan.expanded = stats.expanded;
  plan.generated = stats.generated;
  return plan;
}

}  // namespace

Plan breadthFirstSearch(const Problem& problem) {
  return forwardSearch(problem, Discipline::Fifo);
}

Plan depthFirstSearch(const Problem& problem) {
  return forwardSearch(problem, Discipline::Lifo);
}

}  // namespace planning
