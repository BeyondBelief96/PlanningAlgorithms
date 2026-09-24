// Exercise 08 needs no map: it is pure geometry between two poses.  Every test
// here builds its own candidate, so this file passes as soon as Exercise 08
// does, whatever state the rest of the pipeline is in.
import { describe, expect, it } from 'vitest';
import {
  a320,
  arcPath,
  deg,
  distance,
  maxAbsCurvature,
  pathEndPose,
  pathIsEmpty,
  pathLength,
  type Pose,
  wrapAngle,
} from '../../src/airport/index.js';
import {
  type MergeCandidate,
  type MergeParams,
  type MergePath,
  MERGE_METHODS,
  mergeMethodName,
} from '../../src/capstone/types.js';
import { impl, implName } from './impl.js';

function at(x: number, y: number, headingDegrees: number): MergeCandidate {
  return {
    edge: { edge: -1, forward: true },
    s: 0,
    target: { p: { x, y }, heading: deg(headingDegrees) },
    routeIndex: 0,
    costToGo: 0,
    leadIn: 200,
  };
}

function taxiwayParams(): MergeParams {
  return { ...impl.paramsFor('taxiwayCapture', a320()), step: 1.0 };
}

const at0 = (x: number, y: number, headingDegrees: number): Pose => ({
  p: { x, y },
  heading: deg(headingDegrees),
});

/**
 * Every merge must land exactly on the pose the candidate asked for -- the
 * route is concatenated at that point, and a metre of gap there is a metre the
 * controller has to invent.
 */
function expectLandsOn(merge: MergePath, candidate: MergeCandidate): void {
  expect(merge.found).toBe(true);
  expect(pathIsEmpty(merge.path)).toBe(false);
  const end = pathEndPose(merge.path);
  expect(distance(end.p, candidate.target.p)).toBeLessThan(1e-3);
  expect(Math.abs(wrapAngle(end.heading - candidate.target.heading))).toBeLessThan(1e-3);
}

describe(`ex08 the merge ladder (${implName})`, () => {
  it('changes the parameters with the mode', () => {
    const jet = a320();
    expect(impl.paramsFor('apron', jet).allowHybridAStar).toBe(true);
    expect(impl.paramsFor('stand', jet).allowHybridAStar).toBe(true);
    expect(
      impl.paramsFor('taxiwayCapture', jet).allowHybridAStar,
      'on a taxiway you rejoin the line or you stop',
    ).toBe(false);
    expect(impl.paramsFor('runway', jet).allowHybridAStar).toBe(false);
    expect(impl.paramsFor('apron', jet).preferredRadius).toBeLessThan(
      impl.paramsFor('runway', jet).preferredRadius,
    );
    expect(impl.paramsFor('apron', jet).minRadius).toBeGreaterThanOrEqual(jet.minTurnRadius - 1e-9);
  });

  it('needs no plan at all when sitting on the line', () => {
    const candidate = at(200, 0, 0);
    const merge = impl.planMerge(at0(0, 0, 0), candidate, taxiwayParams());
    expect(merge.found).toBe(true);
    expect(merge.method).toBe('captureWindow');
    expect(pathLength(merge.path)).toBeCloseTo(200, 9);
    expectLandsOn(merge, candidate);
  });

  it('gives the capture window edges', () => {
    const params = taxiwayParams();
    // Just outside the cross-track limit.
    expect(
      impl.planCaptureWindow(
        { p: { x: 0, y: params.captureCrossTrack + 0.5 }, heading: 0 },
        at(200, 0, 0),
        params,
      ).found,
    ).toBe(false);
    // Just outside the heading limit.
    expect(
      impl.planCaptureWindow(
        { p: { x: 0, y: 0 }, heading: params.captureHeading + 0.01 },
        at(200, 0, 0),
        params,
      ).found,
    ).toBe(false);
    // And a merge point behind us is not a capture, it is a mistake.
    expect(impl.planCaptureWindow(at0(300, 0, 0), at(200, 0, 0), params).found).toBe(false);
  });

  it('recovers the geometry straight-then-turn was built from', () => {
    // Drive 100 m straight, then turn left 45 degrees at a radius of 50.  The
    // solver is given only the two end poses and must find that run and radius.
    const arc = arcPath(at0(100, 0, 0), 50, deg(45), 1.0);
    const candidate: MergeCandidate = { ...at(0, 0, 0), target: pathEndPose(arc) };

    const merge = impl.planStraightThenTurn(at0(0, 0, 0), candidate, taxiwayParams());
    expect(merge.found).toBe(true);
    expect(merge.method).toBe('straightThenTurn');
    expect(pathLength(merge.path)).toBeCloseTo(100 + 50 * deg(45), 6);
    expectLandsOn(merge, candidate);
  });

  it('refuses to drive backwards', () => {
    // The same turn, but the target is behind the aircraft: the closed form has
    // a solution with a negative straight, and it is not one you can fly.
    expect(impl.planStraightThenTurn(at0(0, 0, 0), at(-100, 20, 30), taxiwayParams()).found).toBe(
      false,
    );
  });

  it('refuses a radius below the minimum', () => {
    const params = { ...taxiwayParams(), minRadius: 200 };
    const candidate: MergeCandidate = {
      ...at(0, 0, 0),
      target: pathEndPose(arcPath(at0(100, 0, 0), 50, deg(45), 1.0)),
    };
    expect(impl.planStraightThenTurn(at0(0, 0, 0), candidate, params).found).toBe(false);
  });

  it('closes a parallel offset with an S-curve', () => {
    // Six metres left of the line and eight degrees off it -- the taxiway
    // capture case, and exactly what an S-curve is for.  A single arc cannot do
    // it without driving backwards first.
    const start = at0(0, 6, 8);
    const candidate = at(200, 0, 0);
    const params = taxiwayParams();

    expect(impl.planStraightThenTurn(start, candidate, params).found).toBe(false);
    const merge = impl.planSCurve(start, candidate, params);
    expect(merge.found).toBe(true);
    expect(merge.method).toBe('sCurve');
    expectLandsOn(merge, candidate);
    expect(
      maxAbsCurvature(merge.path),
      'the arcs must respect the minimum radius',
    ).toBeLessThanOrEqual(1 / params.minRadius + 1e-9);
    expect(
      impl.planMerge(start, candidate, params).method,
      'the ladder should stop here rather than reach for Dubins',
    ).toBe('sCurve');
  });

  it('only uses an S-curve for roughly parallel lines', () => {
    const params = taxiwayParams();
    const candidate = at(200, 0, 0);
    expect(impl.planSCurve(at0(0, 6, 40), candidate, params).found).toBe(false);
    // And it needs somewhere to go: a target behind the aircraft is not an
    // S-curve either.
    expect(impl.planSCurve(at0(300, 6, 0), candidate, params).found).toBe(false);
  });

  it('wants an intercept for a diverging heading', () => {
    // Forty metres off the line and pointed away from it.  There is no straight
    // then arc, and no S-curve; turning to an intercept angle and running in is
    // what a pilot does.
    const start = at0(0, 40, 40);
    const candidate = at(400, 0, 0);
    const params = taxiwayParams();

    expect(impl.planStraightThenTurn(start, candidate, params).found).toBe(false);
    expect(impl.planSCurve(start, candidate, params).found).toBe(false);
    const merge = impl.planIntercept(start, candidate, params);
    expect(merge.found).toBe(true);
    expect(merge.method).toBe('intercept');
    expectLandsOn(merge, candidate);
  });

  it('keeps Dubins as the last resort, still landing exactly', () => {
    const candidate = at(60, 60, 180);
    const merge = impl.planDubinsMerge(at0(0, 0, 0), candidate, taxiwayParams());
    expect(merge.found).toBe(true);
    expect(merge.method).toBe('dubins');
    expectLandsOn(merge, candidate);
  });

  it('refuses a loop', () => {
    // The merge point is five metres *behind* the aircraft on the same line.
    // Dubins will happily answer with a full circle; a taxiing aeroplane will
    // not, and the loop-rejection filter is what says so.
    const merge = impl.planMerge(at0(0, 0, 0), at(-5, 0, 0), taxiwayParams());
    expect(merge.found, 'the ladder should refuse rather than plan a loop').toBe(false);
  });

  it('prefers the simplest rung that works', () => {
    const params = taxiwayParams();
    // On the line.
    expect(impl.planMerge(at0(0, 0, 0), at(200, 0, 0), params).method).toBe('captureWindow');
    // One turn away.
    const oneTurn: MergeCandidate = {
      ...at(0, 0, 0),
      target: pathEndPose(arcPath(at0(100, 0, 0), 60, deg(30), 1.0)),
    };
    expect(impl.planMerge(at0(0, 0, 0), oneTurn, params).method).toBe('straightThenTurn');
    // Parallel but offset.
    expect(impl.planMerge(at0(0, 5, 0), at(300, 0, 0), params).method).toBe('sCurve');
  });

  it('names every method', () => {
    for (const method of MERGE_METHODS) expect(mergeMethodName(method).length).toBeGreaterThan(1);
  });
});
