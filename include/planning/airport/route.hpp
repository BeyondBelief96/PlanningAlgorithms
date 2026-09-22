// route.hpp -- what the planner hands to the controller (Step 10), and the
// explicit failure results of Step 12.
#pragma once

#include <string>
#include <vector>

#include "planning/airport/geometry.hpp"
#include "planning/airport/graph.hpp"

namespace planning::airport {

enum class EventKind {
  Departure,            // the plan starts here
  MergeComplete,        // the off-graph part ends and the graph route begins
  SoftGate,             // ramp-to-ground handoff, stand entry, movement boundary
  HoldShort,            // an unauthorized holding position: there is a stop here
  RunwayCrossingStart,  // passing an authorized hold-short onto a runway
  RunwayCrossingEnd,    // clear of the far hold-short
  HotspotEnter,
  HotspotExit,
  Arrival,
};

const char* toString(EventKind kind);

struct RouteEvent {
  EventKind kind = EventKind::Departure;
  double s = 0.0;  // arclength along Route::path
  std::string message;
};

struct StopPoint {
  double s = 0.0;  // arclength at which the *nose* must be stopped short
  std::string reason;
};

struct SpeedPoint {
  double s = 0.0;
  double v = 0.0;  // m/s
};

struct Route {
  Path path;
  std::vector<DirectedEdge> graphRoute;
  std::vector<RouteEvent> events;
  std::vector<StopPoint> stops;
  std::vector<SpeedPoint> speed;
  double mergeLength = 0.0;  // arclength at which the off-graph part ends
  double cost = 0.0;

  bool empty() const { return path.empty(); }
  // Linear interpolation of the speed profile, clamped to the ends.
  double speedAt(double s) const;
};

// Step 12: every way the planner is allowed to fail, spelled out.  A degraded
// path is never an acceptable answer -- an explicit refusal is.
enum class PlanStatus {
  Success,
  PushbackRequired,          // nose-in stand, no forward exit
  NoForwardExit,             // on a runway with no exit ahead
  NotCleared,                // the clearance does not reach the destination
  BlockedByObstacle,         // every merge candidate fails the sweep check
  NoRoute,                   // the filtered graph does not connect start to goal
  LocalizationInconsistent,  // the footprint straddles zones that cannot coexist
};

const char* toString(PlanStatus status);

struct PlanResult {
  PlanStatus status = PlanStatus::NoRoute;
  Route route;
  std::string detail;

  bool ok() const { return status == PlanStatus::Success; }
  explicit operator bool() const { return ok(); }
};

}  // namespace planning::airport
