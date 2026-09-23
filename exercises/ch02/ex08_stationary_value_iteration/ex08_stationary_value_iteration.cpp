// Exercise 08 -- What to do from anywhere.
//
// The high point of the unit, and the piece the capstone reuses most.  What
// comes out is not a route: it is an instruction for every square of the
// airport, which is what lets an aeroplane that is not where the plan expected
// look up an answer rather than ask for a new plan.
//
// [book] LaValle Section 2.3.2.
//
// Read exercises/ch02/ex08_stationary_value_iteration/README.md first.
#include <algorithm>
#include <stdexcept>
#include <vector>

#include "planning/value_iteration.hpp"

namespace planning {

Stationary backwardValueIterationStationary(const Problem& problem, int maxIterations) {
  // TODO(you): sweep
  //
  //     stillToGo(x) = min( 0 if the aeroplane may stop at x, else infinity,
  //                         min over moves of [ cost of the move
  //                                             + stillToGo(where it leads) ] )
  //
  // until nothing changes.  That first term *is* the stop option: staying put
  // forever and collecting problem.finalCost(x).  On a surface it is not a
  // no-op -- it is the holding position.
  //
  // Fill in all four fields of Stationary:
  //   - history: every sweep in order, starting with the boundary row.  Stop
  //     before appending a row identical to its predecessor.
  //   - iterations: how many sweeps you ran, counting the final one that
  //     changed nothing -- that is the sweep that *detects* settlement.
  //   - G: the settled numbers.
  //   - policy: the best move at every place.  kTerminate where stopping is
  //     right, kNoAction where the number is infinite, and break ties in favour
  //     of stopping.  A planner that prefers motion to stopping when the two
  //     cost the same taxis an aeroplane in a circle for no reason, and
  //     somebody files a report about it.
  //
  // Throw std::runtime_error if you pass maxIterations without settling, and
  // say in the message what it actually means: some loop of taxiways costs less
  // than nothing to go round, so it is preferable to go round forever.  A
  // failure that reads "did not converge" teaches nothing.
  //
  // [book] the recurrence is (2.18) and the policy is (2.19); the tables are
  // Figure 2.14.
  (void)problem;
  (void)maxIterations;
  return Stationary{};
}

StationaryForward forwardValueIterationStationary(const Problem& problem, int maxIterations) {
  // TODO(you): the same treatment for the cost already spent.
  //
  // Stopping means something different here, and the difference is the point.
  // Backwards it means "finish here and collect the final cost".  Forwards it
  // means "we already arrived here and stopped", so the previous value at x
  // competes with every one-move extension that lands on x.  Compare the two
  // tables in the guide until the asymmetry makes sense.
  //
  // [book] Figures 2.14 and 2.15.
  (void)problem;
  (void)maxIterations;
  return StationaryForward{};
}

Plan planFromPolicy(const Problem& problem, const Stationary& stationary) {
  // TODO(you): start where the aeroplane is and follow the policy until it
  // says stop.
  //
  // Add a step cap as an infinite-loop guard; a best route never visits the
  // same place twice when every move costs something, so numStates() steps is
  // generous.
  (void)problem;
  (void)stationary;
  return Plan{};
}

}  // namespace planning
