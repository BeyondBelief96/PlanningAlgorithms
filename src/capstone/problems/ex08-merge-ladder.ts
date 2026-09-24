// Exercise 08 -- the merge ladder, simplest first (Step 8).
// Brief: docs/capstone/ex08-merge-ladder.md
//
// This one needs no map.  It is pure geometry between two poses, and its tests
// build their own candidates, so it passes on its own whatever state the rest
// of the pipeline is in.  If you want to start somewhere other than the
// beginning, start here.

import {
  type AircraftModel,
  alongTrack,
  arcPath,
  concatenatePaths,
  cross,
  crossTrack,
  dubinsShortestPath,
  forwardOf,
  type Pose,
  renderDubins,
  straightPath,
  totalTurning,
  wrapAngle,
} from '../../airport/index.js';
import {
  defaultMergeParams,
  type MergeCandidate,
  type MergeParams,
  type MergePath,
  noMerge,
  type StartMode,
} from '../types.js';

export function paramsFor(mode: StartMode, aircraft: AircraftModel): MergeParams {
  // TODO(you): the same ladder, tuned per start mode.  Two things matter more
  // than the numbers:
  //
  //   allowHybridAStar is true on the apron and at a stand, and false on a
  //   taxiway and on a runway.  On a taxiway you rejoin the line or you stop.
  //
  //   the preferred radius is small in tight quarters and large on a runway,
  //   where a high-speed exit is a long gentle curve.
  void mode;
  void aircraft;
  return defaultMergeParams();
}

export function planCaptureWindow(
  start: Pose,
  candidate: MergeCandidate,
  params: MergeParams,
): MergePath {
  // TODO(you): rung one.  Already tracking the line, within captureCrossTrack
  // and captureHeading?  Then there is nothing to plan: hand the controller the
  // line itself, starting from where the aircraft projects onto it.
  //
  // A merge point BEHIND the aircraft is not a capture, it is a mistake.
  void start;
  void candidate;
  void params;
  void crossTrack;
  void alongTrack;
  void forwardOf;
  void straightPath;
  return noMerge();
}

export function planStraightThenTurn(
  start: Pose,
  candidate: MergeCandidate,
  params: MergeParams,
): MergePath {
  // TODO(you): rung two, and the one worth doing properly -- get this and
  // three of the others fall out of it.
  //
  // One straight run, then one arc that lands exactly on the target pose.  An
  // arc of signed radius R through `sweep` displaces the aircraft by
  //
  //     R * (sin psi1 - sin psi0,  cos psi0 - cos psi1)
  //
  // so  delta = run * u0 + R * w  is two equations in the two unknowns run and
  // R.  Solve them with cross products.
  //
  // Then refuse the solutions you cannot fly: a negative straight (the target
  // is behind you), an arc that turns the wrong way for the heading change, and
  // a radius below params.minRadius.
  void start;
  void candidate;
  void params;
  void cross;
  void arcPath;
  void concatenatePaths;
  return noMerge();
}

export function planSCurve(
  start: Pose,
  candidate: MergeCandidate,
  params: MergeParams,
): MergePath {
  // TODO(you): rung three.  Roughly parallel to the line but offset from it --
  // the taxiway capture case.  Turn toward the line, then back, then run
  // straight to the merge point.
  //
  // In the line frame, with offset e and initial heading error phi, the heading
  // after the first arc of radius R1 satisfies
  //
  //     cos(alpha) = (e / R1 + cos phi + 1) / 2
  //
  // and the trailing straight closes whatever is left along the line.  Refuse
  // when |phi| is above sCurveHeadingTolerance, when the merge point is behind,
  // and when there is no offset to close (that is a capture).
  void start;
  void candidate;
  void params;
  return noMerge();
}

export function planIntercept(
  start: Pose,
  candidate: MergeCandidate,
  params: MergeParams,
): MergePath {
  // TODO(you): rung four.  Well off the line and pointed away from it: turn to
  // params.interceptAngle, run straight until the closing arc can take up
  // exactly what is left, roll out onto the line, then track it in.
  //
  // The subtlety is step two.  Rolling out of a turn of alpha at radius r moves
  // you r * (1 - cos alpha) toward the line all by itself, so that much of the
  // offset is already spoken for and the straight must only cover the rest.
  void start;
  void candidate;
  void params;
  return noMerge();
}

export function planDubinsMerge(
  start: Pose,
  candidate: MergeCandidate,
  params: MergeParams,
): MergePath {
  // TODO(you): rung five, and the general answer: the shortest curve between
  // two poses at a bounded radius.  dubinsShortestPath() and renderDubins() are
  // given, so this rung is mostly about rejecting what comes back.
  //
  // Try the preferred radius first and the minimum second.  A Dubins solution
  // is allowed to wind round twice; a taxi manoeuvre is not, so reject anything
  // that turns more than params.maxTotalTurning in total.
  void start;
  void candidate;
  void params;
  void dubinsShortestPath;
  void renderDubins;
  void totalTurning;
  void wrapAngle;
  return noMerge();
}

export function planMerge(
  start: Pose,
  candidate: MergeCandidate,
  params: MergeParams,
): MergePath {
  // TODO(you): try the five above in order and return the first that succeeds.
  //
  // The ORDER is the design, not an optimisation.  A planner that reaches for
  // Dubins first produces paths that are valid and look nothing like taxiing,
  // and a pilot watching from the flight deck cannot tell what the aeroplane is
  // about to do.
  void start;
  void candidate;
  void params;
  return noMerge();
}
