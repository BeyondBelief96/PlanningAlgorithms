// The whole capstone, end to end, on all eight scenarios.
//
// There is no thirteenth exercise: planTaxi() is given.  What this file checks
// is that the twelve fit together, and -- more to the point -- that the four
// scenarios which are supposed to FAIL still fail, and fail for the right
// reason.  A planner that returns a path for all eight is worse than one that
// returns a path for four.

import { describe, expect, it } from 'vitest';
import {
  allScenarios,
  kiloAirport,
  parseClearance,
  pathIsEmpty,
  type PlanStatus,
  scenarioByName,
} from '../../src/airport/index.js';
import { planTaxi } from '../../src/capstone/pipeline.js';
import { impl, implName } from './impl.js';

function plan(name: string) {
  const s = scenarioByName(name);
  const airport = kiloAirport();
  return planTaxi(
    impl,
    airport.zones,
    airport.graph,
    s.aircraft,
    s.start,
    parseClearance(s.clearance),
  );
}

const EXPECTED: Readonly<Record<string, PlanStatus>> = {
  'stand-departure': 'success',
  'nose-in-stand': 'pushbackRequired',
  'apron-off-line': 'success',
  'taxiway-capture': 'success',
  'landing-rollout': 'success',
  'landing-no-exit': 'noForwardExit',
  'inside-protected': 'noForwardExit',
  oversize: 'noRoute',
};

describe(`the pipeline (${implName})`, () => {
  it('has eight scenarios, and four of them refuse', () => {
    const names = allScenarios().map((s) => s.name);
    expect(names).toEqual(Object.keys(EXPECTED));
    expect(Object.values(EXPECTED).filter((s) => s !== 'success')).toHaveLength(4);
  });

  for (const [name, status] of Object.entries(EXPECTED)) {
    it(`${name} -> ${status}`, () => {
      const result = plan(name);
      expect(result.status, result.detail).toBe(status);
      if (status === 'success') {
        expect(pathIsEmpty(result.route.path)).toBe(false);
        expect(result.route.graphRoute.length).toBeGreaterThan(0);
      } else {
        // A refusal nobody can read is not much of a refusal.
        expect(result.detail).not.toBe('');
        expect(pathIsEmpty(result.route.path)).toBe(true);
      }
    });
  }

  it('stops the departure short of the holding position it was told to hold at', () => {
    const result = plan('stand-departure');
    expect(result.route.stops).toHaveLength(1);
    expect(result.route.stops[0]!.reason).toContain('HS 27 E');
  });

  it('crosses runway 36 on the way, because the clearance said so', () => {
    const result = plan('stand-departure');
    const crossings = result.route.events.filter((e) => e.kind === 'runwayCrossingStart');
    expect(crossings.length).toBeGreaterThanOrEqual(1);
  });

  it('needs no free-space search to rejoin taxiway A', () => {
    // The taxiway-capture scenario is six metres off the centreline.  The whole
    // point of the merge ladder is that this is an S-curve, not a search.
    const result = plan('taxiway-capture');
    expect(result.status).toBe('success');
    expect(result.detail).toContain('S-curve');
  });

  it('refuses the 777 for the reason a human would give', () => {
    const result = plan('oversize');
    expect(result.detail).toContain('wingspan');
  });
});
