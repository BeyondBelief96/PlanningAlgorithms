// Exercise 04 -- the clearance and the permission set (Step 4).
//
// Read exercises/capstone/ex04_permissions/README.md first.
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

PermissionSet buildPermissions(const TaxiGraph& gated, const ZoneLayer& layer,
                               const Clearance& clearance) {
  // TODO(you): turn what ATC said into what the search is allowed to do.
  //
  //   routeLabels          straight from clearance.route
  //   enterableRunways     the crossings, plus the destination *only* when the
  //                        clearance says we may enter it
  //   authorizedGates      every hard gate whose `protects` names one of them
  //   mandatoryStops       every other hard gate that has a painted line
  //   goal                 where the mission ends
  //
  // For a runway destination the goal is the holding position on the last
  // taxiway of the cleared route -- or, with a line-up clearance, the runway
  // edge beyond it.  For a stand it is the parking position itself: the end of
  // the stand lead-in line that is inside the stand area.
  //
  // Any hard gate not in authorizedGates gets infinite cost for this mission.
  // The clearance is the only thing in the whole system that can open one.
  (void)gated;
  (void)layer;
  (void)clearance;
  return PermissionSet{};
}

}  // namespace planning::airport
