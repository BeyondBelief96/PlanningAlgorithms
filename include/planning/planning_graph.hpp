// planning_graph.hpp -- How early could this job possibly be finished?
//
// Searching a turnaround description for a plan is expensive.  Often the useful
// question is cheaper: assume every job that *could* run does run, all at once,
// round after round, and keep track only of which pairs of facts cannot
// honestly hold together at the same time.  What comes out is not a plan, it is
// a floor -- "not before the third round, whatever you do" -- and it is usually
// enough to tell the ramp what it needs to know.
//
// [book] LaValle Section 2.5.2, the Blum-Furst planning graph.
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

// An entry in a round: either a real job, or a do-nothing that carries one fact
// forward untouched.  A fact nobody disturbs is still true next round, and the
// graph needs something to point at when it says so.
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

// True when everything the job needs is present in this round and no two of
// those things conflict.  Necessary, not sufficient: it means "not ruled out
// yet", which is exactly the cheap test worth doing before searching.
bool goalPossiblyReachable(const StripsProblem& problem, const PlanningGraph& graph, int layer);

// The smallest layer index for which goalPossiblyReachable() holds, or -1.
int firstGoalLayer(const StripsProblem& problem, const PlanningGraph& graph);

std::string toString(const StripsProblem& problem, const PlanningGraph& graph);

}  // namespace planning
