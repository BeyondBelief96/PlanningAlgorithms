// search.hpp -- Section 2.2, searching for feasible plans.
//
// Every declaration here is implemented by you in exercises/ch02 and by the
// reference in solutions/ch02.  The signatures are fixed so the same test
// binary can be built against either.
#pragma once

#include "planning/core.hpp"

namespace planning {

// --- Exercise 01: the general forward search template (Figure 2.4) ----------

// Q is FIFO.  Finds a plan with the fewest actions.
Plan breadthFirstSearch(const Problem& problem);

// Q is LIFO.  Systematic for finite X, but the plan it returns is arbitrary.
Plan depthFirstSearch(const Problem& problem);

// --- Exercise 02: Dijkstra's algorithm --------------------------------------

// Q sorted by the cost-to-come C(x).  Optimal for nonnegative l(x, u).
Plan dijkstra(const Problem& problem);

// --- Exercise 03: A* and best-first ----------------------------------------

// Q sorted by C(x) + \hat{G}(x).  Optimal when \hat{G} underestimates G*.
Plan aStar(const Problem& problem, const Heuristic& h);

// Q sorted by \hat{G}(x) alone.  Fast, greedy, and not optimal.
Plan bestFirstSearch(const Problem& problem, const Heuristic& h);

// --- Exercise 04: iterative deepening ---------------------------------------

// Repeated depth-limited DFS for limits 0, 1, 2, ...  Same plan length as BFS,
// but with the memory footprint of depth-first search.
Plan iterativeDeepening(const Problem& problem, int maxDepth = 64);

// Iterative-deepening A*: the cutoff is on C(x) + \hat{G}(x) rather than depth.
Plan iterativeDeepeningAStar(const Problem& problem, const Heuristic& h, int maxIterations = 1000);

// --- Exercise 05: backward and bidirectional search (Figures 2.6, 2.7) ------

// Dijkstra run from the goal set backward along f^{-1} until x_I is reached.
// The returned Plan still reads forward, from x_I to X_G.
Plan backwardDijkstra(const Problem& problem);

// Two breadth-first wavefronts, one from x_I along f and one from a goal state
// along f^{-1}, joined where they meet.
Plan bidirectionalSearch(const Problem& problem);

}  // namespace planning
