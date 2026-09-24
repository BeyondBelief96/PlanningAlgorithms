import { describe, expect, it } from 'vitest';
import {
  a320,
  deg,
  distance,
  type EventKind,
  emptyRoute,
  maxAbsCurvature,
  noseTip,
  pathAt,
  pathEndPose,
  pathIsEmpty,
  pathLength,
  pathStartPose,
  policyFor,
  type Pose,
  type Route,
  speedAt,
} from '../../src/airport/index.js';
import { defaultSpeedLimits, type MergePath } from '../../src/capstone/types.js';
import { ARRIVAL, DEPARTURE, Fixture } from './fixture.js';
import { impl, implName } from './impl.js';

const pose = (x: number, y: number, headingDegrees: number): Pose => ({
  p: { x, y },
  heading: deg(headingDegrees),
});

/** Runs the pipeline as far as Exercise 11 and returns the assembled route. */
function routeFor(f: Fixture): { route: Route; merge: MergePath | undefined } {
  const params = impl.paramsFor(f.localization.mode, f.aircraft);
  for (const c of f.candidates()) {
    const merge = impl.planMerge(f.localization.pose, c, params);
    if (!merge.found) continue;
    const graphRoute = impl.extractGraphRoute(f.costToGo, c.edge, c.routeIndex);
    if (graphRoute.length === 0) continue;
    return {
      route: impl.assembleRoute(
        f.gated, f.zones, f.aircraft, merge, graphRoute, f.permissions, defaultSpeedLimits(),
      ),
      merge,
    };
  }
  return { route: emptyRoute(), merge: undefined };
}

const countEvents = (route: Route, kind: EventKind): number =>
  route.events.filter((e) => e.kind === kind).length;

const departure = () => new Fixture(DEPARTURE, pose(290, 95, 90));

describe(`ex11 route assembly (${implName})`, () => {
  it('makes one curve from the start to the stop', () => {
    const { route, merge } = routeFor(departure());
    expect(pathIsEmpty(route.path)).toBe(false);
    expect(pathLength(route.path)).toBeGreaterThan(2000);
    expect(route.mergeLength).toBeCloseTo(pathLength(merge!.path), 6);
    expect(
      distance(pathStartPose(route.path).p, pathStartPose(merge!.path).p),
      'the assembled route must begin where the merge begins',
    ).toBeLessThan(1e-6);
  });

  it('fillets the corners and respects the minimum radius', () => {
    const { route } = routeFor(departure());
    expect(maxAbsCurvature(route.path)).toBeGreaterThan(0);
    expect(
      maxAbsCurvature(route.path),
      'a corner taken tighter than the minimum radius is not a corner you can take',
    ).toBeLessThanOrEqual(1 / a320().minTurnRadius + 1e-6);
  });

  it('turns the soft gates into events', () => {
    const { route } = routeFor(departure());
    // Leaving the stand, and leaving the apron for the movement area.
    expect(countEvents(route, 'softGate')).toBeGreaterThanOrEqual(1);
    const handoff = route.events.some(
      (e) => e.kind === 'softGate' && e.message.includes('ramp'),
    );
    expect(handoff, 'the apron/taxiway boundary is a radio call, not just a line').toBe(true);
  });

  it('announces an authorized crossing at both ends', () => {
    const { route } = routeFor(departure());
    expect(countEvents(route, 'runwayCrossingStart')).toBeGreaterThanOrEqual(1);
    expect(countEvents(route, 'runwayCrossingEnd')).toBeGreaterThanOrEqual(1);
  });

  it('makes the unauthorized holding position the one stop', () => {
    const { route } = routeFor(departure());
    expect(route.stops).toHaveLength(1);
    expect(countEvents(route, 'holdShort')).toBe(1);
    expect(route.stops[0]!.reason, 'name the holding position in the reason').toContain('HS 27 E');
  });

  it('stops the nose short of the line, not the reference point', () => {
    const { route } = routeFor(departure());
    const limits = defaultSpeedLimits();
    const nose = noseTip(a320(), pathEndPose(route.path)).y;
    expect(nose, 'the nose is past the holding position').toBeLessThanOrEqual(425);
    // Within a few centimetres: the path is sampled at one metre, so the stop
    // arclength can only be as exact as the samples it is interpolated from.
    expect(Math.abs(nose - (425 - limits.stopMargin))).toBeLessThan(0.05);
  });

  it('ends the route where the path ends', () => {
    const { route } = routeFor(departure());
    expect(route.stops[0]!.s).toBeCloseTo(pathLength(route.path), 6);
    expect(speedAt(route, pathLength(route.path))).toBeCloseTo(0, 9);
  });

  it('respects the zone limits in the speed profile', () => {
    const f = departure();
    const { route } = routeFor(f);
    expect(route.speed.length).toBeGreaterThan(0);
    for (const p of route.speed) {
      const q = impl.zoneAt(f.zones, pathAt(route.path, p.s).p);
      expect(p.v, `v = ${p.v} on ${q.zone}`).toBeLessThanOrEqual(policyFor(q.zone).speedLimit + 1e-6);
    }
  });

  it('slows for the turns', () => {
    const { route } = routeFor(departure());
    const jet = a320();
    for (const p of route.speed) {
      const curvature = Math.abs(pathAt(route.path, p.s).curvature);
      if (curvature < 1e-6) continue;
      const comfortable = Math.sqrt(jet.maxLateralAccel / curvature);
      expect(p.v, 'v <= sqrt(a_lat * r) is what makes a turn bearable').toBeLessThanOrEqual(
        comfortable + 1e-6,
      );
    }
  });

  it('brakes into the stop', () => {
    const { route } = routeFor(departure());
    const jet = a320();
    const stop = route.stops[0]!.s;
    for (const p of route.speed) {
      if (p.s >= stop) continue;
      expect(p.v, 'v^2 = 2 a d, or you are not going to stop in time').toBeLessThanOrEqual(
        Math.sqrt(2 * jet.maxDecel * (stop - p.s)) + 1e-6,
      );
    }
  });

  it('needs no stop point when arriving at a stand', () => {
    const { route } = routeFor(new Fixture(ARRIVAL, pose(1150, 500, 0)));
    expect(pathIsEmpty(route.path)).toBe(false);
    expect(route.stops).toHaveLength(0);
    expect(countEvents(route, 'arrival')).toBe(1);
    expect(speedAt(route, pathLength(route.path))).toBeCloseTo(0, 9);
  });
});
