// Reference solution -- Exercise 11: planning without a planner.
//
// Every fact and every job gets tagged with a step, K is fixed in advance, and
// the whole turnaround collapses into one enormous Boolean formula.  Then a
// solver that has never heard of an aeroplane does the planning.
//
// The cost of the trick is that fixed K: you do not know it before you solve
// the problem, so the outer loop below tries K = 0, 1, 2, ... and gives up at
// maxK.  If the turnaround has no solution at all, that loop never terminates
// on its own -- so this is a complete method for *finding* plans and only a
// semi-decision procedure for proving there is none.
//
// [book] Section 2.5.3.
#include <algorithm>
#include <vector>

#include "planning/sat.hpp"

namespace planning {

SatEncoding encodePlanningAsSat(const StripsProblem& problem, int K) {
  SatEncoding encoding;
  encoding.problem = problem;
  encoding.K = K;
  encoding.cnf.numVars = encoding.totalVars();

  const int numAtoms = encoding.numAtoms();
  const int numOps = static_cast<int>(problem.operators.size());
  CnfFormula& cnf = encoding.cnf;

  // 1. Initial state.  Every positive literal of S at stage 1, and the negation
  //    of every positive literal not in S.
  const StripsState start = initialMask(problem);
  for (int a = 0; a < numAtoms; ++a) {
    const int v = encoding.atomVar(a, 1);
    const bool positive = ((start >> a) & StripsState{1}) != 0;
    cnf.addClause({positive ? v : -v});
  }

  // 2. Goal state, tagged with the final stage F = K + 1.
  for (const Literal& l : problem.goal) {
    const int a = problem.atomIndex(l);
    if (a < 0) continue;
    const int v = encoding.atomVar(a, K + 1);
    cnf.addClause({l.positive ? v : -v});
  }

  // 3. Operator encodings, equation (2.33):
  //        !o_k  OR  (p_1 AND ... AND p_m AND e_1 AND ... AND e_n)
  //    Preconditions are read at stage k, effects asserted at stage k + 1.
  //    Distributing the OR over the AND gives one binary clause per literal.
  for (int k = 1; k <= K; ++k) {
    for (int o = 0; o < numOps; ++o) {
      const int ov = encoding.opVar(o, k);
      for (const Literal& pre : problem.operators[o].preconditions) {
        const int a = problem.atomIndex(pre);
        if (a < 0) continue;
        const int pv = encoding.atomVar(a, k);
        cnf.addClause({-ov, pre.positive ? pv : -pv});
      }
      for (const Literal& eff : problem.operators[o].effects) {
        const int a = problem.atomIndex(eff);
        if (a < 0) continue;
        const int ev = encoding.atomVar(a, k + 1);
        cnf.addClause({-ov, eff.positive ? ev : -ev});
      }
    }
  }

  // 4. Frame axioms, equation (2.34).  If a literal changes between stage k and
  //    stage k + 1, some operator at stage k must have had the new value as an
  //    effect.  Two clauses per atom per stage, one for each direction of change.
  for (int k = 1; k <= K; ++k) {
    for (int a = 0; a < numAtoms; ++a) {
      const int now = encoding.atomVar(a, k);
      const int later = encoding.atomVar(a, k + 1);

      std::vector<int> becameFalse{-now, later};  // (l_k AND !l_{k+1}) -> causes
      std::vector<int> becameTrue{now, -later};
      for (int o = 0; o < numOps; ++o) {
        for (const Literal& eff : problem.operators[o].effects) {
          if (problem.atomIndex(eff) != a) continue;
          if (eff.positive) becameTrue.push_back(encoding.opVar(o, k));
          else becameFalse.push_back(encoding.opVar(o, k));
        }
      }
      cnf.addClause(std::move(becameFalse));
      cnf.addClause(std::move(becameTrue));
    }
  }

  // 5. Complete exclusion axiom: at most one operator per stage.
  for (int k = 1; k <= K; ++k)
    for (int o = 0; o < numOps; ++o)
      for (int p = o + 1; p < numOps; ++p)
        cnf.addClause({-encoding.opVar(o, k), -encoding.opVar(p, k)});

  return encoding;
}

namespace {

// value[v] is 1 for true, -1 for false, 0 for unassigned; index 0 is unused.
using Assignment = std::vector<int>;

int literalValue(const Assignment& value, int literal) {
  const int v = literal > 0 ? literal : -literal;
  if (value[v] == 0) return 0;
  return literal > 0 ? value[v] : -value[v];
}

// Repeatedly assigns forced literals.  Returns false on a conflict.
bool unitPropagate(const CnfFormula& formula, Assignment& value) {
  bool changed = true;
  while (changed) {
    changed = false;
    for (const auto& clause : formula.clauses) {
      int unassigned = 0;
      int candidate = 0;
      bool satisfied = false;
      for (int l : clause) {
        const int v = literalValue(value, l);
        if (v == 1) {
          satisfied = true;
          break;
        }
        if (v == 0) {
          ++unassigned;
          candidate = l;
        }
      }
      if (satisfied) continue;
      if (unassigned == 0) return false;  // every literal false: conflict
      if (unassigned == 1) {
        value[candidate > 0 ? candidate : -candidate] = candidate > 0 ? 1 : -1;
        changed = true;
      }
    }
  }
  return true;
}

// A variable that occurs with only one polarity among the still-unsatisfied
// clauses can be set that way without ever hurting.
void pureLiteralElimination(const CnfFormula& formula, Assignment& value) {
  bool changed = true;
  while (changed) {
    changed = false;
    std::vector<char> seenPositive(value.size(), 0);
    std::vector<char> seenNegative(value.size(), 0);
    for (const auto& clause : formula.clauses) {
      bool satisfied = false;
      for (int l : clause)
        if (literalValue(value, l) == 1) {
          satisfied = true;
          break;
        }
      if (satisfied) continue;
      for (int l : clause) {
        if (literalValue(value, l) != 0) continue;
        if (l > 0) seenPositive[l] = 1;
        else seenNegative[-l] = 1;
      }
    }
    for (std::size_t v = 1; v < value.size(); ++v) {
      if (value[v] != 0) continue;
      if (seenPositive[v] && !seenNegative[v]) {
        value[v] = 1;
        changed = true;
      } else if (seenNegative[v] && !seenPositive[v]) {
        value[v] = -1;
        changed = true;
      }
    }
  }
}

bool allClausesSatisfied(const CnfFormula& formula, const Assignment& value) {
  for (const auto& clause : formula.clauses) {
    bool satisfied = false;
    for (int l : clause)
      if (literalValue(value, l) == 1) {
        satisfied = true;
        break;
      }
    if (!satisfied) return false;
  }
  return true;
}

bool search(const CnfFormula& formula, Assignment value, Assignment& out) {
  if (!unitPropagate(formula, value)) return false;
  pureLiteralElimination(formula, value);
  if (!unitPropagate(formula, value)) return false;

  if (allClausesSatisfied(formula, value)) {
    out = value;
    return true;
  }

  // Branch on the first unassigned variable that still matters.
  int branch = 0;
  for (std::size_t v = 1; v < value.size() && branch == 0; ++v)
    if (value[v] == 0) branch = static_cast<int>(v);
  if (branch == 0) return false;  // nothing left to try, yet clauses unsatisfied

  for (int trial : {1, -1}) {
    Assignment next = value;
    next[branch] = trial;
    if (search(formula, next, out)) return true;
  }
  return false;
}

}  // namespace

std::optional<std::vector<bool>> dpll(const CnfFormula& formula) {
  Assignment value(static_cast<std::size_t>(formula.numVars) + 1, 0);
  Assignment solution;
  if (!search(formula, value, solution)) return std::nullopt;

  std::vector<bool> result(static_cast<std::size_t>(formula.numVars), false);
  for (int v = 1; v <= formula.numVars; ++v) result[v - 1] = solution[v] == 1;
  return result;
}

std::vector<int> extractPlan(const SatEncoding& encoding, const std::vector<bool>& assignment) {
  std::vector<int> plan;
  const int numOps = static_cast<int>(encoding.problem.operators.size());
  for (int k = 1; k <= encoding.K; ++k) {
    for (int o = 0; o < numOps; ++o) {
      const int v = encoding.opVar(o, k);
      if (v >= 1 && v <= static_cast<int>(assignment.size()) && assignment[v - 1]) {
        plan.push_back(o);
        break;  // the complete exclusion axiom allows at most one per stage
      }
    }
  }
  return plan;
}

std::optional<std::vector<int>> planAsSatisfiability(const StripsProblem& problem, int maxK) {
  for (int K = 0; K <= maxK; ++K) {
    const SatEncoding encoding = encodePlanningAsSat(problem, K);
    const auto assignment = dpll(encoding.cnf);
    if (assignment) return extractPlan(encoding, *assignment);
  }
  return std::nullopt;
}

}  // namespace planning
