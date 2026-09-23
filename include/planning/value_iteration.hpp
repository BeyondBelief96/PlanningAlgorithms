// value_iteration.hpp -- Working out the answer for everywhere at once.
//
// Search gives you a route from where the aeroplane is.  This gives you a
// number for every place on the airport: how long the taxi still is, from
// there.  It costs far more to compute and it answers a much better question,
// because an aeroplane on a real surface is routinely not where the plan said
// it would be -- it stopped short, it was held, it took the wrong exit -- and a
// number for every place means the planner always has an answer ready.
//
// That is the single biggest idea Chapter 2 sets up, and it is what the
// capstone's Exercise 06 and its replanning are built on.
//
// [book] LaValle Section 2.3, discrete optimal planning.
#pragma once

#include <vector>

#include "planning/core.hpp"

namespace planning {

// One row per sweep, one column per place.  Which sweep each row denotes is
// documented per function, because the backward tables count down and the
// forward ones count up.
using CostTable = std::vector<std::vector<double>>;

// --- Exercise 06: the cost still to go, on a fixed move budget -------------
//
// Row k answers: "with exactly k moves left, what is the cheapest I can finish
// from each place?"  Row 0 is the budget spent -- zero if you are already where
// you need to be, infinity otherwise -- and each row after it is built from the
// one before by trying every move and keeping the best:
//
//     cost(place, k moves left) = min over moves of
//                                   [ cost of the move
//                                     + cost(where it leads, k - 1 moves left) ]
//
// There is no "and stop" here.  A route must use *exactly* the budget, which is
// why the aeroplane sometimes has to sit at the stand burning a move.
//
// [book] Figure 2.9, and the recurrence (2.11).  Returns K + 1 rows:
// row 0 is G*_F = l_F, row 1 is G*_K, ..., row K is G*_1.
CostTable backwardValueIteration(const Problem& problem, int K);

// Reads the route out of the table, from wherever the aeroplane is: at each
// place take the move the table says was the best one.
Plan planFromBackwardValues(const Problem& problem, const CostTable& G);

// --- Exercise 07: the cost already spent, on the same budget ---------------
//
// The mirror image.  Row k answers: "after exactly k moves, what is the
// cheapest I could be standing at each place?"  Built by looking at how each
// place could have been *reached*:
//
//     cost(place, after k + 1 moves) = min over moves that arrive here of
//                                         [ cost(where it came from, after k)
//                                           + cost of the move ]
//
// Note that this table says nothing whatever about where the aeroplane is
// going.  What it cost to get somewhere depends on the airport and where you
// started, not on the clearance.
//
// [book] Figure 2.12, and the recurrence (2.16).  Returns K + 1 rows: row 0 is
// C*_1, row k is C*_{k+1}.
CostTable forwardValueIteration(const Problem& problem, int K);

// --- Exercise 08: take the move budget away --------------------------------
// [book] Figures 2.14 and 2.15.

struct Stationary {
  std::vector<double> G;       // minutes still to go, from every place
  std::vector<Action> policy;  // what to do at every place; kTerminate where
                               // the aeroplane should stop, kNoAction where
                               // there is nothing legal to do at all
  int iterations = 0;          // sweeps before the numbers stopped moving
  CostTable history;           // every sweep, in order
};

// The same backward sweep, with one thing added -- an aeroplane that is already
// where it needs to be may simply stop -- run over and over until the numbers
// stop changing:
//
//     still to go(place) = min( 0 if this place will do, else infinity,
//                               min over moves of [ cost of the move
//                                                   + still to go(where it leads) ] )
//
// The stage number stops mattering once the numbers settle, and what is left is
// the thing worth having: a policy.  Not a route from the stand -- an
// instruction for every square of the airport, which is why the aeroplane can
// be somewhere nobody planned for and still know what to do.
//
// Stops as soon as nothing changed, and reports how many sweeps that took.
// Throws std::runtime_error if the numbers never settle, which on a taxi graph
// means somewhere a move costs less than nothing.
Stationary backwardValueIterationStationary(const Problem& problem, int maxIterations = 1000);

struct StationaryForward {
  std::vector<double> C;  // minutes already spent, to reach every place
  int iterations = 0;
  CostTable history;
};

// The forward sweep, run the same way until the numbers stop changing.
StationaryForward forwardValueIterationStationary(const Problem& problem, int maxIterations = 1000);

// Follows the policy from wherever the aeroplane is until it says stop.
// [book] rolling out (2.19).
Plan planFromPolicy(const Problem& problem, const Stationary& stationary);

}  // namespace planning
