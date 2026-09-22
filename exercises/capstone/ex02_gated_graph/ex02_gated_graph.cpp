// Exercise 02 -- gated boundaries in the graph (Step 2).
//
// Read exercises/capstone/ex02_gated_graph/README.md first.
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

TaxiGraph buildGatedGraph(const TaxiGraph& raw, const ZoneLayer& layer) {
  // TODO(you): three passes.
  //
  // 1. Copy every raw vertex into the new graph, unchanged.
  //
  // 2. For each raw edge, walk it in steps of kZoneScanStep asking zoneAt()
  //    for the class.  Wherever the class changes, bisect to
  //    kZoneSplitTolerance and insert a new vertex there.  Give each resulting
  //    sub-edge the zone of its own midpoint, and carry over oneWay,
  //    maxWingspan and maxWeightTonnes from the parent.  The hotspot and
  //    closed flags are true if *any* sample of the sub-edge is inside one --
  //    a midpoint test misses a hotspot the edge only clips.
  //
  // 3. Call build(), then look at every vertex.  If its incident edges do not
  //    all agree on the zone class, it is a gate:
  //
  //      innerZone   the least restrictive class, by zonePriority()
  //      outerZone   the most restrictive
  //      gate        Hard when policyFor(outerZone).requiresClearance,
  //                  otherwise Soft
  //      protects    the idents of the zone polygon on the outer side
  //      holdShortId a holding position within half a metre, if there is one;
  //                  when there is, the vertex takes that line's name
  //
  // The directional part -- that a hard gate stops you going *in* and never
  // coming *out* -- is Exercise 05, and it is innerZone that makes it possible.
  (void)raw;
  (void)layer;
  return TaxiGraph{};
}

}  // namespace planning::airport
