// Exercise 11 -- Planning without a planner.
//
// Translate the turnaround into one large true-or-false formula, and hand it to
// a solver that has never heard of an aeroplane.
//
// [book] LaValle Section 2.5.3.
//
// Read exercises/ch02/ex11_planning_as_sat/README.md first.
#include <algorithm>
#include <vector>

#include "planning/sat.hpp"

namespace planning {

SatEncoding encodePlanningAsSat(const StripsProblem& problem, int K) {
  // TODO(you): produce the five families of clauses.  SatEncoding::atomVar()
  // and opVar() already lay out the variable numbering for you; set
  // cnf.numVars = totalVars() and then add clauses.
  //
  //   1. how it starts    every fact true on arrival, at step 1, plus the
  //                       negation of every positive fact not listed.
  //                       One-literal clauses.
  //   2. how it must end  every goal fact, at step K + 1.  One-literal clauses.
  //   3. a job only runs  NOT job@k OR (all preconditions hold at k AND all
  //      if it can        effects hold at k+1).  Distribute the OR over the AND
  //                       to get one two-literal clause per fact.
  //   4. nothing changes  if a fact changes between step k and k + 1, some job
  //      by itself        at step k must have had the new value as an effect.
  //                       Two clauses per fact per step.  Skip these and the
  //                       solver will cheerfully have the containers teleport
  //                       into the hold with no loader responsible -- try it
  //                       once, deliberately, and look at the "plan" you get.
  //   5. one at a time    (NOT job@k OR NOT otherjob@k) for every pair.
  //
  // Note that no clause forces a job to run at every step.  That is deliberate:
  // an empty step means family 4 holds everything still, which is what lets a
  // K-step formula express any plan of length <= K.  Same trick as the stop
  // option in Exercise 08 and the do-nothing jobs in Exercise 10.
  //
  // [book] family 3 is equation (2.33), family 4 is (2.34) -- the frame axioms
  // -- and family 5 is the complete exclusion axiom.
  (void)problem;
  (void)K;
  return SatEncoding{};
}

std::optional<std::vector<bool>> dpll(const CnfFormula& formula) {
  // TODO(you): the Davis-Putnam-Logemann-Loveland procedure.
  //
  //   - unit propagation: a clause with one unassigned literal and no
  //     satisfied literal forces that literal.  Repeat to a fixpoint.  A clause
  //     with no unassigned and no satisfied literal is a conflict.
  //   - pure literal elimination: a variable appearing with only one polarity
  //     among the still-unsatisfied clauses can be set that way for free.
  //   - branch on an unassigned variable, try true, then false.
  //
  // Recursion with a copied assignment vector is fine at this scale; the
  // hold-loading problem at K = 4 has about 30 variables.
  (void)formula;
  return std::nullopt;
}

std::vector<int> extractPlan(const SatEncoding& encoding, const std::vector<bool>& assignment) {
  // TODO(you): read off, for each step 1..K, which job variable is true.
  // Family 5 guarantees at most one.  Steps with none are the do-nothing
  // padding that lets a short plan satisfy a long formula.
  (void)encoding;
  (void)assignment;
  return {};
}

std::optional<std::vector<int>> planAsSatisfiability(const StripsProblem& problem, int maxK) {
  // TODO(you): try K = 0, 1, 2, ... until the formula is satisfiable.
  //
  // Note what you have built: if the turnaround has no solution at all, this
  // loop never terminates on its own.  That is why maxK exists, and it means
  // this is a *complete* method for finding plans and only a *semi-decision*
  // procedure for proving there is none.  Worth knowing about a tool before you
  // put it in a pipeline that is supposed to refuse.
  (void)problem;
  (void)maxK;
  return std::nullopt;
}

}  // namespace planning
