// value_iteration.hpp -- Section 2.3, discrete optimal planning.
#pragma once

#include <vector>

#include "planning/core.hpp"

namespace planning {

// A stage-indexed table of values over X.  table[row][x] is one cost-to-go (or
// cost-to-come) function; which stage each row denotes is documented per
// function, because the book's backward tables run from high stage to low.
using CostTable = std::vector<std::vector<double>>;

// --- Exercise 06: backward value iteration, fixed length (Figure 2.9) -------
//
// Returns K + 1 rows.  Row 0 is G*_F = l_F, row 1 is G*_K, ..., row K is G*_1.
// The recurrence is (2.11):
//
//     G*_k(x_k) = min over u_k of [ l(x_k, u_k) + G*_{k+1}(f(x_k, u_k)) ]
//
// with no termination action: a plan must use *exactly* K actions.
CostTable backwardValueIteration(const Problem& problem, int K);

// Reads an optimal K-step plan out of the table above, starting from x_I.
Plan planFromBackwardValues(const Problem& problem, const CostTable& G);

// --- Exercise 07: forward value iteration, fixed length (Figure 2.12) ------
//
// Returns K + 1 rows.  Row 0 is C*_1 (which is 0 at x_I and infinity
// elsewhere), row k is C*_{k+1}.  The recurrence is (2.16):
//
//     C*_{k+1}(x_{k+1}) = min over (x_k, u) with f(x_k, u) = x_{k+1}
//                             of [ C*_k(x_k) + l(x_k, u) ]
//
// Note that C* says nothing about X_G; the goal only enters when you add l_F.
CostTable forwardValueIteration(const Problem& problem, int K);

// --- Exercise 08: unspecified plan length (Figures 2.14, 2.15) -------------

struct Stationary {
  std::vector<double> G;       // the stationary optimal cost-to-go G*
  std::vector<Action> policy;  // the argmin of (2.19); kTerminate at goals,
                               // kNoAction where G is infinite
  int iterations = 0;          // iterations performed before values stopped changing
  CostTable history;           // row 0 is G*_0 = l_F, row k is G*_{-k}
};

// Backward value iteration with the termination action u_T, run until the
// cost-to-go function stops changing:
//
//     G*(x) = min( l_F(x), min over u of [ l(x, u) + G*(f(x, u)) ] )
//
// Stops early and reports the iteration count; throws std::runtime_error if the
// values have not stabilised after maxIterations (which means a negative cycle).
Stationary backwardValueIterationStationary(const Problem& problem, int maxIterations = 1000);

struct StationaryForward {
  std::vector<double> C;  // the stationary optimal cost-to-come C*
  int iterations = 0;
  CostTable history;  // row 0 is C*_1, row k is C*_{k+1}
};

// Forward value iteration with the termination action, run to stationarity.
StationaryForward forwardValueIterationStationary(const Problem& problem, int maxIterations = 1000);

// Rolls the policy forward from x_I to a goal, following (2.19).
Plan planFromPolicy(const Problem& problem, const Stationary& stationary);

}  // namespace planning
