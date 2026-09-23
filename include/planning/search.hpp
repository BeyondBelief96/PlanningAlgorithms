// search.hpp -- Finding a route at all, ten different ways.
//
// Every method below is the same program: keep a collection of places you have
// reached but not yet looked past, take one out, see what it leads to, put
// those in.  What changes -- the only thing that changes -- is which one you
// take out next.  That single line is the difference between a planner that
// fans out across the whole apron and one that goes straight to the runway.
//
// Every declaration here is implemented by you in exercises/ch02 and by the
// reference in solutions/ch02.  The signatures are fixed so the same test
// binary can be built against either.
//
// [book] LaValle Section 2.2.
#pragma once

#include "planning/core.hpp"

namespace planning {

// --- Exercise 01: the general forward search template (Figure 2.4) ----------

// Oldest first.  Finds the route with the fewest moves -- which is not the
// same as the quickest one, and on a taxiway graph is rarely what you want.
Plan breadthFirstSearch(const Problem& problem);

// Newest first.  Will find a route if one exists, and the route it finds is
// whatever falls out of the order the moves happen to be listed in.
Plan depthFirstSearch(const Problem& problem);

// --- Exercise 02: Dijkstra's algorithm --------------------------------------

// Cheapest-reached first.  The first method here that counts minutes rather
// than moves, and the first whose answer you would give a crew.  Optimal as
// long as no move costs less than nothing.
Plan dijkstra(const Problem& problem);

// --- Exercise 03: A* and best-first ----------------------------------------

// Dijkstra, plus a guess at what is still to come: spent so far, plus
// estimated to go.  Same answer as Dijkstra, arrived at after looking at far
// less of the airport -- as long as the guess never runs high.
Plan aStar(const Problem& problem, const Heuristic& h);

// The guess *alone*: always move towards the holding point.  Very fast, and it
// will taxi straight into a dead-end pier without hesitating.
Plan bestFirstSearch(const Problem& problem, const Heuristic& h);

// --- Exercise 04: iterative deepening ---------------------------------------

// Search four moves deep, then five, then six.  Ends up with the same route as
// breadth first while holding only one branch in memory at a time -- which
// starts to matter the moment a state is a pose rather than a square.
Plan iterativeDeepening(const Problem& problem, int maxDepth = 64);

// The same trick with minutes instead of moves: raise a cost ceiling rather
// than a depth limit.
Plan iterativeDeepeningAStar(const Problem& problem, const Heuristic& h, int maxIterations = 1000);

// --- Exercise 05: planning from the other end ------------------------------
// [book] Figures 2.6 and 2.7.

// Start at the holding point and work back towards the aeroplane.  Same route
// -- and the by-product is worth more than the route: a cost to the goal from
// *everywhere*, which is what the capstone replans against.
Plan backwardDijkstra(const Problem& problem);

// Search from both ends at once and join them in the middle.  Two small
// wavefronts touch far less pavement than one large one.
Plan bidirectionalSearch(const Problem& problem);

}  // namespace planning
