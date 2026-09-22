// Exercise 12 -- the geofence monitor and replanning (Steps 11 and 12).
//
// Read exercises/capstone/ex12_monitor_and_replan/README.md first.
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

MonitorReport geofenceMonitor(const ZoneLayer& layer, const AircraftModel& aircraft,
                              const VehicleState& state, const PermissionSet& permissions,
                              double horizonSeconds, double stepSeconds) {
  // TODO(you): project the footprint forward at the current speed and steering
  // and command a stop the moment the projection touches an unauthorized
  // runway or protected area, a holding position, or a forbidden zone.
  //
  // Keep it dumb on purpose.  The monitor must not know about the graph, the
  // route, the clearance route labels, the cost function or the merge ladder.
  // It is the safety net; the planner is the performance layer.  A net you can
  // read in one sitting is worth more than a clever one you cannot.
  (void)layer;
  (void)aircraft;
  (void)state;
  (void)permissions;
  (void)horizonSeconds;
  (void)stepSeconds;
  return MonitorReport{};
}

ReplanDecision shouldReplan(const ReplanTriggers& triggers, double speed, double crossTrackLimit,
                            double periodSeconds, double commitSeconds) {
  // TODO(you): replan on a new clearance, a new obstacle, a monitor
  // intervention, a cross-track error past the limit, or the periodic timer --
  // and say which, because "it replanned" is not a log line anybody can use.
  //
  // commitDistance is how much of the current route must survive, so that the
  // path does not jump under the controller.  A monitor intervention is the
  // exception: it has already commanded a stop, so nothing is committed.
  (void)triggers;
  (void)speed;
  (void)crossTrackLimit;
  (void)periodSeconds;
  (void)commitSeconds;
  return ReplanDecision{};
}

Route spliceRoute(const Route& committed, double commitS, const Route& fresh) {
  // TODO(you): keep the first commitS metres of `committed`, then continue
  // with `fresh`, shifting its arclengths -- path samples, events, stops and
  // speed points alike.
  (void)committed;
  (void)commitS;
  (void)fresh;
  return Route{};
}

}  // namespace planning::airport
