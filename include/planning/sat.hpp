// sat.hpp -- Section 2.5.3, planning as satisfiability.
#pragma once

#include <optional>
#include <string>
#include <vector>

#include "planning/strips.hpp"

namespace planning {

// Conjunctive normal form in the usual DIMACS convention: variables are
// numbered from 1, a literal is +v or -v, and a clause is a disjunction.
struct CnfFormula {
  int numVars = 0;
  std::vector<std::vector<int>> clauses;

  int newVar() { return ++numVars; }
  void addClause(std::vector<int> clause) { clauses.push_back(std::move(clause)); }
  std::string toDimacs() const;

  // Checks a complete assignment (assignment[v - 1] is the value of variable v).
  bool satisfiedBy(const std::vector<bool>& assignment) const;
};

// The variable layout for a K-stage encoding.  Stages run 1..K+1 for literals
// and 1..K for operators, matching the book's tagging scheme.  This bookkeeping
// is given so that the tests can look inside your formula.
struct SatEncoding {
  StripsProblem problem;
  int K = 0;
  CnfFormula cnf;

  int numAtoms() const { return static_cast<int>(problem.atoms.size()); }

  // Variable for "atom `atom` is true at stage k", k in [1, K + 1].
  int atomVar(int atom, int k) const { return (k - 1) * numAtoms() + atom + 1; }

  // Variable for "operator `op` is applied at stage k", k in [1, K].
  int opVar(int op, int k) const {
    return (K + 1) * numAtoms() + (k - 1) * static_cast<int>(problem.operators.size()) + op + 1;
  }

  int totalVars() const {
    return (K + 1) * numAtoms() + K * static_cast<int>(problem.operators.size());
  }
};

// --- Exercise 11 -----------------------------------------------------------

// Builds the five families of clauses of Section 2.5.3: initial state, goal
// state, operator encodings, frame axioms, and the complete exclusion axiom.
SatEncoding encodePlanningAsSat(const StripsProblem& problem, int K);

// The Davis-Putnam-Logemann-Loveland procedure: unit propagation, pure literal
// elimination, then a branching variable.  Returns an assignment, or nullopt
// when the formula is unsatisfiable.
std::optional<std::vector<bool>> dpll(const CnfFormula& formula);

// Reads the operator indices out of a satisfying assignment, in stage order.
std::vector<int> extractPlan(const SatEncoding& encoding, const std::vector<bool>& assignment);

// Tries K = 0, 1, 2, ... until the encoding is satisfiable.  Returns the plan
// as a list of operator indices, or nullopt if no plan of length <= maxK exists.
std::optional<std::vector<int>> planAsSatisfiability(const StripsProblem& problem, int maxK = 8);

}  // namespace planning
