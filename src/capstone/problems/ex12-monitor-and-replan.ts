// Exercise 12 -- the geofence monitor and replanning (Steps 11 and 12).
// Brief: docs/capstone/ex12-monitor-and-replan.md
//
// Self-contained: the tests build their own vehicle states and their own
// routes, so this one passes on its own.

import {
  advance,
  type AircraftModel,
  boundsOf,
  emptyRoute,
  footprintOf,
  forwardOf,
  pathAt,
  type PermissionSet,
  polygonsOverlap,
  type Route,
  segmentIntersectsPolygon,
  type ZoneLayer,
} from '../../airport/index.js';
import {
  monitorClear,
  type MonitorReport,
  type ReplanDecision,
  type ReplanTriggers,
  type VehicleState,
} from '../types.js';

export function geofenceMonitor(
  layer: ZoneLayer,
  aircraft: AircraftModel,
  state: VehicleState,
  permissions: PermissionSet,
  horizonSeconds = 6.0,
  stepSeconds = 0.25,
): MonitorReport {
  // TODO(you): the safety layer, and the only piece of the capstone that is
  // deliberately stupid.  About a hundred lines.  That is the design, not a
  // shortcut: the argument for trusting it is that you can read all of it.
  //
  // Project the pose forward at the CURRENT speed and the CURRENT steering, in
  // steps of stepSeconds out to horizonSeconds.  Constant speed and constant
  // curvature is the only dead reckoning a monitor is allowed -- but it must be
  // curved, because a monitor that projects a straight line misses a nose wheel
  // that is already over.
  //
  // At each projected pose, test the swept OUTLINE against
  //
  //   any runway or protected area the clearance has not named
  //   any forbidden zone
  //   any holding position the clearance has not named
  //
  // and on the first hit, stop -- naming what it was about to hit and how many
  // seconds away it is.
  //
  // Note what this function does NOT take: the route, the graph, the cost
  // function, the clearance route labels.  It knows the zone layer, the
  // permission set, and where the aircraft is pointed.  Keep it that way.
  void layer;
  void aircraft;
  void state;
  void permissions;
  void horizonSeconds;
  void stepSeconds;
  void advance;
  void boundsOf;
  void footprintOf;
  void forwardOf;
  void polygonsOverlap;
  void segmentIntersectsPolygon;
  return monitorClear();
}

export function shouldReplan(
  triggers: ReplanTriggers,
  speed: number,
  crossTrackLimit = 3.0,
  periodSeconds = 5.0,
  commitSeconds = 3.0,
): ReplanDecision {
  // TODO(you): when to plan again, and how much of the current route must
  // survive.  The triggers in priority order: a monitor intervention, a new
  // clearance, a new obstacle, cross-track error over the limit, and finally
  // the periodic tick.  Name which one fired.
  //
  // The commit distance is what stops the path jumping under the controller:
  // keep the next commitSeconds of travel, and replan only beyond it.  A
  // monitor intervention is the exception -- it has already commanded a stop,
  // so there is nothing to commit to.
  void triggers;
  void speed;
  void crossTrackLimit;
  void periodSeconds;
  void commitSeconds;
  return { replan: false, trigger: '', commitDistance: 0 };
}

export function spliceRoute(committed: Route, commitS: number, fresh: Route): Route {
  // TODO(you): keep the first commitS metres of `committed`, then continue with
  // all of `fresh`, shifting its arclengths by the length of the prefix.
  //
  // Events, stops and speed points come along, but only the ones inside the
  // part of each route that survives -- a committed stop beyond the cut is a
  // stop the new plan has not agreed to.
  void committed;
  void commitS;
  void fresh;
  void pathAt;
  return emptyRoute();
}
