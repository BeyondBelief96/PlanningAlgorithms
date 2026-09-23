// Exercise 10 -- How early could it finish?
//
// A cheaper question than "what is the plan?".  Assume every job that could run
// does run, all at once, round after round, and track only which pairs of facts
// cannot honestly hold together.  What comes out is a floor -- "not before the
// third round, whatever you do" -- which for a turnaround is usually the number
// the ramp actually wants.
//
// [book] LaValle Section 2.5.2, the Blum-Furst planning graph.
//
// Read exercises/ch02/ex10_planning_graph/README.md first.
#include <algorithm>
#include <vector>

#include "planning/planning_graph.hpp"

namespace planning {

PlanningGraph buildPlanningGraph(const StripsProblem& problem, int maxLayers) {
  // TODO(you): build the rounds -- facts, jobs, facts, jobs, ... -- one at a
  // time.
  //
  //   first fact layer   every fact true when the aeroplane parks, plus the
  //                      negation of every positive fact not listed.
  //   a job layer        every job whose preconditions are all present in the
  //                      fact layer below it, PLUS one do-nothing job per fact,
  //                      whose only precondition and only effect is that fact.
  //                      The do-nothings are not an implementation detail: a
  //                      fact nobody disturbs is still true next round, and
  //                      without something to point at, the graph never
  //                      settles.  Same idea as the stop option in Exercise 08.
  //   next fact layer    everything the jobs below it make true.
  //
  // Then the conflicts, computed round by round because each depends on the one
  // below it.
  //
  //   Two jobs conflict if any of:
  //     1. opposite effects -- one makes a fact true and the other false
  //     2. interference     -- one's effect negates the other's precondition
  //                            (check both directions).  Shutting the door
  //                            interferes with loading, which needs it open.
  //     3. competing needs  -- a precondition of each conflict below
  //
  //   Two facts conflict if either of:
  //     1. they are a fact and its own negation
  //     2. every pair of jobs below achieving one and the other is itself a
  //        conflicting pair.  BUT if a single job achieves both, this is false
  //        immediately, whatever the other pairs do.  That escape clause is
  //        easy to miss and it changes answers.
  //
  // Stop when a round produces the same facts and the same jobs as the round
  // before.  Since the jobs are determined entirely by the facts, comparing the
  // fact layers is enough.  Set levelledOffAt to that index.
  //
  // For cargoHoldProblem() you should get 4 fact layers and 3 job layers,
  // settling at index 3.
  //
  // [book] the layers are (L_1, O_1, ..., L_{k+1}); conflicting pairs are mutex
  // pairs; the levelling-off condition is O_{i+1} = O_i and L_{i+1} = L_i; the
  // worked example is Figure 2.20.
  (void)problem;
  (void)maxLayers;
  return PlanningGraph{};
}

bool goalPossiblyReachable(const StripsProblem& problem, const PlanningGraph& graph, int layer) {
  // TODO(you): everything the goal needs is present in this round, and no two
  // of those things conflict.  This is the cheap test GraphPlan runs before it
  // even tries to extract a plan.
  //
  // Necessary, not sufficient: the structure over-approximates, so what this
  // really says is "not ruled out yet".
  (void)problem;
  (void)graph;
  (void)layer;
  return false;
}

int firstGoalLayer(const StripsProblem& problem, const PlanningGraph& graph) {
  // TODO(you): the smallest round index passing the test above, or -1.  That
  // number is the answer -- the earliest the turnaround could possibly be
  // finished, arrived at without searching anything.
  (void)problem;
  (void)graph;
  return -1;
}

}  // namespace planning
