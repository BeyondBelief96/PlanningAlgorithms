// Exercise 11 -- Planning as satisfiability (Section 2.5.3).
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
  //   1. Initial state    every literal of S at stage 1, and the negation of
  //                       every positive literal not in S.  Unit clauses.
  //   2. Goal state       every literal of G at stage F = K + 1.  Unit clauses.
  //   3. Operators        equation (2.33),
  //                         !o_k OR (p_1 AND ... AND p_m AND e_1 AND ... AND e_n)
  //                       Distribute the OR over the AND to get one binary
  //                       clause per literal.  Preconditions are read at stage
  //                       k; effects are asserted at stage k + 1.
  //   4. Frame axioms     equation (2.34).  If a literal changes between stage
  //                       k and k + 1, some operator at stage k must have had
  //                       the new value as an effect.  Two clauses per atom per
  //                       stage.  Skip these and the solver will happily
  //                       hallucinate changes out of nowhere -- try it once,
  //                       deliberately, and look at the "plan" you get.
  //   5. Exclusion        at most one operator per stage: a binary clause
  //                       (!o_k OR !o'_k) for every pair.
  //
  // Note that no clause forces an operator to be applied at every stage.  That
  // is deliberate: it lets a K-stage formula express any plan of length <= K.
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
  // flashlight problem at K = 4 has about 30 variables.
  (void)formula;
  return std::nullopt;
}

std::vector<int> extractPlan(const SatEncoding& encoding, const std::vector<bool>& assignment) {
  // TODO(you): read off, for each stage 1..K, which operator variable is true.
  // The exclusion axiom guarantees at most one.  Stages with none are the
  // "do nothing" padding that lets a short plan satisfy a long formula.
  (void)encoding;
  (void)assignment;
  return {};
}

std::optional<std::vector<int>> planAsSatisfiability(const StripsProblem& problem, int maxK) {
  // TODO(you): try K = 0, 1, 2, ... until the formula is satisfiable.
  //
  // Note what you have built: if the problem has no solution at all, this loop
  // never terminates on its own.  That is the drawback the book flags, and it
  // is why maxK exists.
  (void)problem;
  (void)maxK;
  return std::nullopt;
}

}  // namespace planning
