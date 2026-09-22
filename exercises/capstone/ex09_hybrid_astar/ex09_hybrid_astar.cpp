// Exercise 09 -- hybrid A* clipped to the start zone (Step 8, last rung).
//
// Read exercises/capstone/ex09_hybrid_astar/README.md first.
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

MergePath planHybridAStar(const ZoneLayer& cspace, const Pose& start,
                          const MergeCandidate& candidate,
                          const std::vector<ZoneClass>& allowedZones,
                          const HybridAStarParams& params) {
  // TODO(you): Chapter 2 Exercise 03 again -- the same priority queue, the
  // same stale-entry discard, the same admissible heuristic -- run over poses
  // instead of integers.  Two things make it a *motion* planner:
  //
  //   * the successors are motion primitives the aircraft can fly (straight,
  //     and one arc each way at params.radius, each params.primitiveLength
  //     long), so every edge of the search tree is a feasible piece of path;
  //   * the search is clipped to `allowedZones` on the configuration-space
  //     layer, which is what makes it physically unable to wander into
  //     another zone.
  //
  // Poses are continuous, so the "dead" set is a lattice: discretise to
  // params.positionResolution and params.headingBins and keep the best cost
  // seen per cell.  Euclidean distance to the goal never overestimates the
  // arclength that remains, so A* stays optimal on that lattice.
  //
  // Finish with an *analytic expansion*: at every popped node try a Dubins
  // curve straight to the target, and if it is collision-free you are done.
  // That is what makes the result land exactly on the merge pose instead of
  // somewhere within a tolerance of it.
  (void)cspace;
  (void)start;
  (void)candidate;
  (void)allowedZones;
  (void)params;
  return MergePath{};
}

}  // namespace planning::airport
