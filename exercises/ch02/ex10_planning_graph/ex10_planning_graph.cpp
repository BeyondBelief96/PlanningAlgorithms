// Exercise 10 -- The planning graph (Section 2.5.2).
//
// Read exercises/ch02/ex10_planning_graph/README.md first.
#include <algorithm>
#include <vector>

#include "planning/planning_graph.hpp"

namespace planning {

PlanningGraph buildPlanningGraph(const StripsProblem& problem, int maxLayers) {
  // TODO(you): build (L_1, O_1, L_2, O_2, ..., L_{k+1}) layer by layer.
  //
  //   L_1   every positive literal of S, plus the negation of every positive
  //         literal not in S.
  //   O_i   every operator whose preconditions are a subset of L_i, PLUS one
  //         trivial operator per literal of L_i, whose only precondition and
  //         only effect is that literal.  Those trivial operators are the
  //         planning-graph counterpart of the termination action u_T, and
  //         without them the graph never levels off.
  //   L_i+1 the union of the effects of everything in O_i.
  //
  // Then the mutex relations, computed layer by layer because each one depends
  // on the one before it.
  //
  //   Two operators are mutex if any of:
  //     1. inconsistent effects -- an effect of one negates an effect of the other
  //     2. interference        -- an effect of one negates a precondition of the
  //                               other (check both directions)
  //     3. competing needs     -- one precondition of each are mutex in L_i
  //
  //   Two literals in L_{i+1} are mutex if either of:
  //     1. they are a complementary pair
  //     2. inconsistent support -- every pair of operators in O_i achieving them
  //        is mutex.  If a single operator achieves both, this is false
  //        immediately, whatever the other pairs do.
  //
  // Stop when the graph levels off.  Section 2.5.2 words the condition as
  // O_{i+1} = O_i and L_{i+1} = L_i; since O_i depends only on L_i, comparing
  // the literal layers is enough.  Set levelledOffAt to that layer index.
  //
  // For flashlightProblem() you should get 4 literal layers and 3 operator
  // layers, levelling off at index 3 -- exactly Figure 2.20.
  (void)problem;
  (void)maxLayers;
  return PlanningGraph{};
}

bool goalPossiblyReachable(const StripsProblem& problem, const PlanningGraph& graph, int layer) {
  // TODO(you): every literal of G appears in L[layer] and no two of them are
  // mutex there.  This is the cheap test GraphPlan runs before it even tries
  // to extract a plan.
  //
  // Necessary, not sufficient: the planning graph over-approximates.
  (void)problem;
  (void)graph;
  (void)layer;
  return false;
}

int firstGoalLayer(const StripsProblem& problem, const PlanningGraph& graph) {
  // TODO(you): the smallest layer index passing the test above, or -1.
  (void)problem;
  (void)graph;
  return -1;
}

}  // namespace planning
