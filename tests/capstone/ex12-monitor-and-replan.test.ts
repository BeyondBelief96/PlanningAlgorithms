import { describe, expect, it } from 'vitest';
import {
  a320,
  deg,
  emptyRoute,
  kiloAirport,
  parseClearance,
  pathLength,
  type PermissionSet,
  type Pose,
  type Route,
  straightPath,
  type TaxiGraph,
} from '../../src/airport/index.js';
import type { MonitorReport, ReplanTriggers } from '../../src/capstone/types.js';
import { impl, implName } from './impl.js';

const HOLD_SHORT = 'TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27';
const LINE_UP = 'TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 LINE UP AND WAIT';

let cachedGated: TaxiGraph | undefined;

function permissionsFor(text: string): PermissionSet {
  const airport = kiloAirport();
  cachedGated ??= impl.buildGatedGraph(airport.graph, airport.zones);
  return impl.buildPermissions(cachedGated, airport.zones, parseClearance(text));
}

function watch(pose: Pose, speed: number, curvature: number, clearance: string): MonitorReport {
  return impl.geofenceMonitor(
    kiloAirport().zones,
    a320(),
    { pose, speed, curvature },
    permissionsFor(clearance),
  );
}

const at = (x: number, y: number, headingDegrees: number): Pose => ({
  p: { x, y },
  heading: deg(headingDegrees),
});

function straightRoute(length: number, stops: number): Route {
  const r = emptyRoute();
  r.path = straightPath({ p: { x: 0, y: 0 }, heading: 0 }, length);
  r.events = [
    { kind: 'departure', s: 0, message: 'start' },
    { kind: 'arrival', s: length, message: 'end' },
  ];
  for (let i = 0; i < stops; ++i) r.stops.push({ s: length, reason: 'stop' });
  r.speed = [
    { s: 0, v: 5 },
    { s: length, v: 0 },
  ];
  return r;
}

describe(`ex12 the monitor and replanning (${implName})`, () => {
  it('clears a stationary aircraft in the middle of a taxiway', () => {
    const report = watch(at(800, 200, 0), 0, 0, HOLD_SHORT);
    expect(report.verdict).toBe('clear');
  });

  it('stops an aircraft rolling at an unauthorized holding position', () => {
    // Forty metres short of the runway 27 holding position on taxiway E, at
    // taxi speed.  In six seconds the nose is over the line.
    const report = watch(at(2300, 385, 90), 8, 0, HOLD_SHORT);
    expect(report.verdict).toBe('stop');
    expect(report.timeToViolation).toBeLessThan(6);
    expect(report.reason, 'name what it was about to hit').toContain('27');
  });

  it('makes the same projection legal under a clearance to enter', () => {
    expect(watch(at(2300, 385, 90), 8, 0, LINE_UP).verdict).toBe('clear');
  });

  it('uses the horizon to make it a warning and not a collision report', () => {
    // Same place, stopped.  Nothing is projected anywhere, so nothing fires.
    expect(watch(at(2300, 385, 90), 0, 0, HOLD_SHORT).verdict).toBe('clear');
    // Same place, crawling: the line is still outside the six-second horizon.
    expect(watch(at(2300, 385, 90), 0.5, 0, HOLD_SHORT).verdict).toBe('clear');
  });

  it('makes steering part of the projection', () => {
    // On taxiway A, rolling east, but with the nose wheel over: in a few
    // seconds this is off the pavement and across the service road.  A monitor
    // that projected a straight line would miss it entirely.
    expect(
      watch(at(880, 200, 0), 12, 1 / 30, HOLD_SHORT).verdict,
      'a curved projection is the whole point of carrying the steering',
    ).toBe('stop');
    expect(
      watch(at(880, 200, 0), 12, 0, HOLD_SHORT).verdict,
      'the same speed, straight ahead, is perfectly ordinary taxiing',
    ).toBe('clear');
  });

  it('stops you at a forbidden zone just as at a runway', () => {
    // Straight at the terminal building.
    const report = watch(at(300, 110, -90), 12, 0, HOLD_SHORT);
    expect(report.verdict).toBe('stop');
    expect(report.reason, 'name the zone').toContain('TERMINAL');
  });

  it('does not fire on an authorized crossing', () => {
    // Rolling east on taxiway B toward runway 36, which the clearance permits.
    expect(watch(at(1480, 400, 0), 8, 0, HOLD_SHORT).verdict).toBe('clear');
    // ...and without that authorization it does.
    expect(
      watch(at(1480, 400, 0), 8, 0, 'TAXI TO RUNWAY 27 VIA B E HOLD SHORT RUNWAY 27').verdict,
    ).toBe('stop');
  });

  it('replans on every trigger and says which one it was', () => {
    expect(impl.shouldReplan({}, 5).replan).toBe(false);

    const check = (triggers: ReplanTriggers, trigger: string): void => {
      const d = impl.shouldReplan(triggers, 5);
      expect(d.replan).toBe(true);
      expect(d.trigger).toBe(trigger);
    };
    check({ secondsSinceLastPlan: 6 }, 'periodic');
    check({ crossTrackError: -4 }, 'cross-track error');
    check({ newClearance: true }, 'new clearance');
    check({ newObstacle: true }, 'new obstacle');
  });

  it('commits a prefix so the path does not jump', () => {
    const triggers: ReplanTriggers = { secondsSinceLastPlan: 6 };
    const rolling = impl.shouldReplan(triggers, 10);
    expect(rolling.replan).toBe(true);
    expect(rolling.commitDistance).toBeCloseTo(30, 9);
    expect(impl.shouldReplan(triggers, 0).commitDistance).toBeCloseTo(0, 9);
  });

  it('commits nothing after a monitor intervention', () => {
    const decision = impl.shouldReplan({ monitorIntervened: true, newClearance: true }, 10);
    expect(decision.replan).toBe(true);
    expect(decision.trigger).toBe('monitor intervention');
    expect(
      decision.commitDistance,
      'the monitor has already commanded a stop; there is nothing to commit to',
    ).toBe(0);
  });

  it('keeps the prefix and continues with the new plan when splicing', () => {
    const spliced = impl.spliceRoute(straightRoute(100, 1), 40, straightRoute(60, 1));
    expect(pathLength(spliced.path)).toBeCloseTo(100, 9);
    expect(
      spliced.stops.length,
      'the committed stop was beyond the cut and must not survive',
    ).toBe(1);
    expect(spliced.stops[0]!.s).toBeCloseTo(100, 9);
  });

  it('splices nothing into just the new plan', () => {
    const spliced = impl.spliceRoute(straightRoute(100, 1), 0, straightRoute(60, 0));
    expect(pathLength(spliced.path)).toBeCloseTo(60, 9);
    expect(spliced.stops).toHaveLength(0);
  });
});
