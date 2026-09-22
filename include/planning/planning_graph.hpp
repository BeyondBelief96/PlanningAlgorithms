// planning_graph.hpp -- Section 2.5.2, the Blum-Furst planning graph.
#pragma once

#include <set>
#include <string>
#include <utility>
#include <vector>

#include "planning/strips.hpp"

namespace planning {

// A literal in a layer, encoded so that it fits in an int:
//   +(a + 1) is the positive literal of atom a
//   -(a + 1) is its negation
using SignedLit = int;

inline SignedLit makeLit(int atom, bool positive) {
  return positive ? (atom + 1) : -(atom + 1);
}
inline int litAtom(SignedLit l) { return (l > 0 ? l : -l) - 1; }
inline bool litPositive(SignedLit l) { return l > 0; }

// An entry in an operator layer.  Either a real operator from O, or one of the
// "trivial" maintenance operators that carry a literal forward unchanged --
// the planning-graph counterpart of the termination action u_T.
struct GraphOp {
  int op = -1;            // index into StripsProblem::operators, or -1
  SignedLit maintain = 0; // nonzero for a trivial operator, giving the literal it maintains

  bool trivial() const { return op < 0; }
};

// Mutex pairs are stored as index pairs (i, j) with i < j, referring to
// positions inside the corresponding layer vector.
using MutexSet = std::set<std::pair<int, int>>;

struct PlanningGraph {
  std::vector<std::vector<SignedLit>> L;  // L_1, L_2, ..., L_{k+1}
  std::vector<std::vector<GraphOp>> O;    // O_1, ..., O_k
  std::vector<MutexSet> literalMutex;     // one per literal layer
  std::vector<MutexSet> operatorMutex;    // one per operator layer

  // The first layer index at which the graph levelled off (same literals, same
  // operators and same mutexes as the layer before it), or -1 if it never did
  // within the layer budget.
  int levelledOffAt = -1;

  int numLayers() const { return static_cast<int>(L.size()); }

  // Convenience lookups; return false when the pair is not mutex (or absent).
  bool literalsMutex(int layer, SignedLit a, SignedLit b) const;
  bool operatorsMutex(int layer, int i, int j) const;
};

// --- Exercise 10 -----------------------------------------------------------

// Builds the planning graph layer by layer until it levels off or maxLayers
// literal layers have been produced.
PlanningGraph buildPlanningGraph(const StripsProblem& problem, int maxLayers = 16);

// True when every literal of G appears in layer `layer` with no two of them
// mutex -- the necessary (but not sufficient) condition the GraphPlan search
// tests before it tries to extract a plan.
bool goalPossiblyReachable(const StripsProblem& problem, const PlanningGraph& graph, int layer);

// The smallest layer index for which goalPossiblyReachable() holds, or -1.
int firstGoalLayer(const StripsProblem& problem, const PlanningGraph& graph);

std::string toString(const StripsProblem& problem, const PlanningGraph& graph);

}  // namespace planning
