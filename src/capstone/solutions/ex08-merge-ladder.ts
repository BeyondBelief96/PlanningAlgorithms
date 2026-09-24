// Reference solution -- Exercise 08: the merge ladder (Step 8).
//
// Five ways to get from a pose onto a line, ordered the way a pilot would reach
// for them.  The first four are closed form; only the last is a search.  The
// ordering is the point: a planner that reaches for Dubins first produces paths
// that are valid and look nothing like taxiing.

import {
  add,
  type AircraftModel,
  alongTrack,
  arcPath,
  concatenatePaths,
  cross,
  crossTrack,
  dubinsShortestPath,
  forwardOf,
  type Path,
  pathEndPose,
  pathIsEmpty,
  pathLength,
  PI,
  type Pose,
  renderDubins,
  scale,
  straightPath,
  sub,
  totalTurning,
  type Vec2,
  wrapAngle,
} from '../../airport/index.js';
import {
  defaultMergeParams,
  type MergeCandidate,
  type MergeMethod,
  type MergeParams,
  type MergePath,
  noMerge,
  type StartMode,
} from '../types.js';

function fail(): MergePath {
  return noMerge();
}

function succeed(
  method: MergeMethod,
  path: Path,
  params: MergeParams,
  detail: string,
): MergePath {
  if (pathIsEmpty(path) && method !== 'captureWindow') return fail();
  if (totalTurning(path) > params.maxTotalTurning) return fail(); // a loop, not a merge
  return {
    found: true,
    method,
    path,
    cost: pathLength(path) + 20.0 * totalTurning(path),
    detail,
  };
}

export function paramsFor(mode: StartMode, aircraft: AircraftModel): MergeParams {
  const p = defaultMergeParams();
  p.minRadius = aircraft.minTurnRadius;
  p.preferredRadius = aircraft.preferredRadius;
  switch (mode) {
    case 'stand':
    case 'apron':
      // Tight quarters and slow speeds: smaller radii, and the free-space
      // search is available because the apron is where off-graph motion lives.
      p.preferredRadius = Math.max(aircraft.minTurnRadius * 1.2, 25.0);
      p.captureCrossTrack = 1.5;
      p.allowHybridAStar = true;
      break;
    case 'taxiwayCapture':
      // On a taxiway you rejoin the line or you stop.  No free-space search.
      p.allowHybridAStar = false;
      break;
    case 'runway':
      p.preferredRadius = Math.max(aircraft.preferredRadius, 60.0);
      p.captureCrossTrack = 3.0;
      p.allowHybridAStar = false;
      break;
    case 'fault':
      break;
  }
  return p;
}

export function planCaptureWindow(
  start: Pose,
  candidate: MergeCandidate,
  params: MergeParams,
): MergePath {
  const line = candidate.target;
  if (Math.abs(crossTrack(line, start.p)) > params.captureCrossTrack) return fail();
  if (Math.abs(wrapAngle(start.heading - line.heading)) > params.captureHeading) return fail();

  // Already tracking the line: there is nothing to plan.  Hand the controller
  // the line itself, starting from where the aircraft projects onto it.
  const along = alongTrack(line, start.p);
  if (along > 0) return fail(); // the merge point is behind us
  const entry: Pose = { p: add(line.p, scale(forwardOf(line), along)), heading: line.heading };
  return succeed(
    'captureWindow',
    straightPath(entry, -along, params.step),
    params,
    'already inside the capture window',
  );
}

export function planStraightThenTurn(
  start: Pose,
  candidate: MergeCandidate,
  params: MergeParams,
): MergePath {
  const target = candidate.target;
  const delta = sub(target.p, start.p);
  const sweep = wrapAngle(target.heading - start.heading);
  const u0 = forwardOf(start);

  if (Math.abs(sweep) < 1e-6) {
    // No turn at all: the target must lie straight ahead.
    if (Math.abs(cross(u0, delta)) > 0.05) return fail();
    const run = u0.x * delta.x + u0.y * delta.y;
    if (run < 0) return fail();
    return succeed(
      'straightThenTurn',
      straightPath(start, run, params.step),
      params,
      'straight run, no turn needed',
    );
  }

  // An arc of signed radius R through `sweep` displaces the aircraft by
  //     R * (sin psi1 - sin psi0,  cos psi0 - cos psi1)
  // so  delta = run * u0 + R * w  is two equations in the two unknowns.
  const w: Vec2 = {
    x: Math.sin(target.heading) - Math.sin(start.heading),
    y: Math.cos(start.heading) - Math.cos(target.heading),
  };
  const den = cross(u0, w);
  if (Math.abs(den) < 1e-9) return fail();
  const run = cross(delta, w) / den;
  const radius = cross(u0, delta) / den;

  if (run < -1e-6) return fail(); //                     the straight goes backwards
  if (radius > 0 !== sweep > 0) return fail(); //        turning the wrong way
  if (Math.abs(radius) < params.minRadius - 1e-6) return fail();

  const corner: Pose = { p: add(start.p, scale(u0, Math.max(run, 0))), heading: start.heading };
  const path = concatenatePaths([
    straightPath(start, Math.max(run, 0), params.step),
    arcPath(corner, radius, sweep, params.step),
  ]);
  return succeed(
    'straightThenTurn',
    path,
    params,
    `straight then one arc of radius ${Math.abs(radius).toFixed(1)}`,
  );
}

export function planSCurve(
  start: Pose,
  candidate: MergeCandidate,
  params: MergeParams,
): MergePath {
  const line = candidate.target;
  const phi = wrapAngle(start.heading - line.heading);
  if (Math.abs(phi) > params.sCurveHeadingTolerance) return fail();

  const e = crossTrack(line, start.p); //    offset from the line, left positive
  const run = -alongTrack(line, start.p); // distance still to cover along the line
  if (run <= 0) return fail();
  if (Math.abs(e) < 1e-9) return fail(); //  nothing to correct: that is a capture

  // Turn toward the line first, then back.  Working in the line frame, the
  // heading after the first arc satisfies
  //     cos(alpha) = (e / R1 + cos phi + 1) / 2
  // and the trailing straight closes whatever is left along the line.
  const r = Math.max(params.preferredRadius, params.minRadius);
  const first = e > 0 ? -r : r;
  const c = (e / first + Math.cos(phi) + 1) * 0.5;
  if (c < -1 || c > 1) return fail();
  const alpha = (first > 0 ? 1 : -1) * Math.acos(c);
  const sweep1 = alpha - phi;
  const sweep2 = -alpha;
  if (sweep1 > 0 !== first > 0) return fail();
  if (Math.abs(sweep1) < 1e-9 || Math.abs(sweep2) < 1e-9) return fail();

  const tail = run - 2 * first * Math.sin(alpha) + first * Math.sin(phi);
  if (tail < -1e-6) return fail();

  const a1 = arcPath(start, first, sweep1, params.step);
  if (pathIsEmpty(a1)) return fail();
  const a2 = arcPath(pathEndPose(a1), -first, sweep2, params.step);
  if (pathIsEmpty(a2)) return fail();
  const straight = straightPath(pathEndPose(a2), Math.max(tail, 0), params.step);
  return succeed(
    'sCurve',
    concatenatePaths([a1, a2, straight]),
    params,
    `two opposite arcs closing ${Math.abs(e).toFixed(1)} m of offset`,
  );
}

export function planIntercept(
  start: Pose,
  candidate: MergeCandidate,
  params: MergeParams,
): MergePath {
  const line = candidate.target;
  const offset = crossTrack(line, start.p);
  if (Math.abs(offset) < 1e-6) return fail();

  const r = Math.max(params.preferredRadius, params.minRadius);
  const alpha = params.interceptAngle;
  const toward = offset > 0 ? -1 : 1;

  // 1. Turn to a 30-45 degree intercept, on the side the line is.
  const sweep1 = wrapAngle(line.heading + toward * alpha - start.heading);
  let turnIn: Path = { samples: [] };
  let q = start;
  if (Math.abs(sweep1) > 1e-9) {
    turnIn = arcPath(start, sweep1 > 0 ? r : -r, sweep1, params.step);
    if (pathIsEmpty(turnIn)) return fail();
    q = pathEndPose(turnIn);
  }

  // 2. Run straight until the closing arc can take up exactly what is left.
  //    Rolling out of a turn of alpha at radius r moves you r (1 - cos alpha)
  //    toward the line all by itself, so that much is already spoken for.
  const here = crossTrack(line, q.p);
  if (here > 0 !== offset > 0) return fail(); // the first turn overshot
  const remaining = Math.abs(here) - r * (1 - Math.cos(alpha));
  if (remaining < -1e-6) return fail(); //      too close to intercept at all
  const run = straightPath(q, Math.max(0, remaining) / Math.sin(alpha), params.step);
  const beforeRollout = pathIsEmpty(run) ? q : pathEndPose(run);

  // 3. Roll out onto the line...
  const sweep2 = wrapAngle(line.heading - beforeRollout.heading);
  const rollout = arcPath(beforeRollout, sweep2 > 0 ? r : -r, sweep2, params.step);
  if (pathIsEmpty(rollout)) return fail();
  const onLine = pathEndPose(rollout);
  if (Math.abs(crossTrack(line, onLine.p)) > 0.05) return fail();

  // 4. ...and track it to the merge point.
  const tail = -alongTrack(line, onLine.p);
  if (tail < -1e-6) return fail();
  const finish = straightPath(onLine, Math.max(0, tail), params.step);

  return succeed(
    'intercept',
    concatenatePaths([turnIn, run, rollout, finish]),
    params,
    `intercept at ${((alpha * 180) / PI).toFixed(0)} degrees`,
  );
}

export function planDubinsMerge(
  start: Pose,
  candidate: MergeCandidate,
  params: MergeParams,
): MergePath {
  for (const radius of [Math.max(params.preferredRadius, params.minRadius), params.minRadius]) {
    const dubins = dubinsShortestPath(start, candidate.target, radius);
    if (!dubins.found) continue;
    const path = renderDubins(start, dubins, params.step);
    if (pathIsEmpty(path)) continue;
    // Loop rejection.  A Dubins solution is allowed to wind round twice; a taxi
    // manoeuvre is not.
    if (totalTurning(path) > params.maxTotalTurning) continue;
    const out = succeed('dubins', path, params, `Dubins word ${dubins.word}`);
    if (out.found) return out;
  }
  return fail();
}

export function planMerge(
  start: Pose,
  candidate: MergeCandidate,
  params: MergeParams,
): MergePath {
  // Simplest first.  The order is the design.
  const ladder = [
    planCaptureWindow,
    planStraightThenTurn,
    planSCurve,
    planIntercept,
    planDubinsMerge,
  ];
  for (const plan of ladder) {
    const result = plan(start, candidate, params);
    if (result.found) return result;
  }
  return fail();
}
