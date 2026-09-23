// Exercise 06 -- The cost still to go, on a fixed move budget.
//
// Search gives you a route from where the aeroplane is.  This gives you a
// number for every place on the airport: how long the taxi still is, from
// there.  [book] LaValle Section 2.3.1.1.
//
// Read exercises/ch02/ex06_backward_value_iteration/README.md first.
#include <algorithm>
#include <vector>

#include "planning/value_iteration.hpp"

namespace planning {

CostTable backwardValueIteration(const Problem& problem, int K) {
  // TODO(you): build the table row by row.
  //
  //     stillToGo(place, k moves left) = min over moves of
  //                                        [ cost of the move
  //                                          + stillToGo(where it leads, k-1) ]
  //
  // starting from a boundary row of problem.finalCost(x) -- zero where the
  // aeroplane may stop, infinity everywhere else.
  //
  // Return K + 1 rows: row 0 is the budget fully spent, row r is r moves still
  // to spend, row K is the whole budget available.  That is the order the guide
  // prints them in, so you can read your output straight against it.
  //
  //   - Beware infinity.  If the place a move leads to is infinite, skip that
  //     move rather than computing inf + something.
  //   - There is no "and stop" here.  The route must use *exactly* the budget,
  //     so a perfectly good holding point can still have an infinite value:
  //     with one move left you have to spend it, and nothing brings you back.
  //     Look at the HS 27 E column in the guide until that is obvious.
  //
  // [book] equation (2.11), from G*_F(x) = l_F(x); the table is Figure 2.9.
  (void)problem;
  (void)K;
  return {};
}

Plan planFromBackwardValues(const Problem& problem, const CostTable& G) {
  // TODO(you): walk forward from where the aeroplane is, at each step taking
  // the move the table says was the best one.
  //
  // The index arithmetic is the fiddly part: to decide what to do at row k you
  // need row k - 1, which is row K - k of the table.  Write it out on paper for
  // K = 4 before you write any code.
  //
  // Return an unfound Plan when no route of exactly K moves finishes.
  (void)problem;
  (void)G;
  return Plan{};
}

}  // namespace planning
