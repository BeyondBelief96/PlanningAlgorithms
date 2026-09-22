// Exercise 08 -- Value iteration for plans of unspecified length (Section 2.3.2).
//
// Read exercises/ch02/ex08_stationary_value_iteration/README.md first.
#include <algorithm>
#include <stdexcept>
#include <vector>

#include "planning/value_iteration.hpp"

namespace planning {

Stationary backwardValueIterationStationary(const Problem& problem, int maxIterations) {
  // TODO(you): iterate
  //
  //     G*(x) = min( l_F(x), min over u of [ l(x, u) + G*(f(x, u)) ] )
  //
  // until nothing changes.  The l_F(x) term *is* the termination action u_T:
  // applying it leaves the state alone and collects the final-stage cost.
  //
  // Fill in all four fields of Stationary:
  //   - history: row 0 is G*_0 = l_F, row k is G*_{-k}.  Stop before appending
  //     a row identical to the previous one, so history matches the rows of
  //     Figure 2.14 down to (but not including) the repeat.
  //   - iterations: how many sweeps you ran, including the final one that
  //     changed nothing.
  //   - G: the stationary values.
  //   - policy: the argmin of (2.19).  Use kTerminate where stopping is
  //     optimal, kNoAction where G is infinite, and break ties in favour of
  //     kTerminate so a goal state stops instead of wandering.
  //
  // Throw std::runtime_error if you pass maxIterations without stabilising:
  // that means there is a negative cycle, and the model itself is broken.
  (void)problem;
  (void)maxIterations;
  return Stationary{};
}

StationaryForward forwardValueIterationStationary(const Problem& problem, int maxIterations) {
  // TODO(you): the same treatment for the cost-to-come.
  //
  // The termination action shows up differently here.  Going backward, u_T
  // means "stop now and collect l_F".  Going forward it means "we already
  // arrived at x and stopped", so the previous value C*_k(x) competes with
  // every one-step extension that lands on x.  Compare Figures 2.14 and 2.15
  // and make sure the asymmetry makes sense to you.
  (void)problem;
  (void)maxIterations;
  return StationaryForward{};
}

Plan planFromPolicy(const Problem& problem, const Stationary& stationary) {
  // TODO(you): start at x_I and follow the policy until you reach X_G.
  //
  // Add a step cap as an infinite-loop guard; an optimal plan never revisits a
  // state when costs are positive, so numStates() steps is generous.
  (void)problem;
  (void)stationary;
  return Plan{};
}

}  // namespace planning
