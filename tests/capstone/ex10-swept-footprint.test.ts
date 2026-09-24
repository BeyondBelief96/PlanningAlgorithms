import { describe, expect, it } from 'vitest';
import {
  a320,
  EMPTY_PATH,
  kiloAirport,
  parseClearance,
  pathEndPose,
  type PermissionSet,
  PI,
  straightPath,
  type TaxiGraph,
} from '../../src/airport/index.js';
import type { SweepResult, SweepViolationKind } from '../../src/capstone/types.js';
import { SWEEP_VIOLATION_KINDS, violationName } from '../../src/capstone/types.js';
import { DEPARTURE } from './fixture.js';
import { impl, implName } from './impl.js';

let cachedGated: TaxiGraph | undefined;

function permissionsFor(text: string): PermissionSet {
  const airport = kiloAirport();
  cachedGated ??= impl.buildGatedGraph(airport.graph, airport.zones);
  return impl.buildPermissions(cachedGated, airport.zones, parseClearance(text));
}

function has(result: SweepResult, kind: SweepViolationKind): boolean {
  return result.violations.some((v) => v.kind === kind);
}

const zones = () => kiloAirport().zones;
const why = (r: SweepResult): string => r.violations[0]?.what ?? '';

describe(`ex10 the swept footprint (${implName})`, () => {
  it('passes an empty path', () => {
    // A capture-window merge plans no motion, and there is nothing to sweep.
    const result = impl.validateSweep(
      zones(), a320(), EMPTY_PATH, 'taxiway', permissionsFor(DEPARTURE), true,
    );
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('finds taxiing down the centreline clean', () => {
    const path = straightPath({ p: { x: 600, y: 200 }, heading: 0 }, 300);
    const result = impl.validateSweep(
      zones(), a320(), path, 'taxiway', permissionsFor(DEPARTURE), false,
    );
    expect(result.ok, why(result)).toBe(true);
  });

  it('reports a tyre on the shoulder as such', () => {
    // Thirteen metres left of the centreline: the wing was always over the
    // shoulder, but the left main gear is now on it too, and a shoulder does
    // not carry weight.
    const path = straightPath({ p: { x: 600, y: 213 }, heading: 0 }, 200);
    const result = impl.validateSweep(
      zones(), a320(), path, 'taxiway', permissionsFor(DEPARTURE), false,
    );
    expect(result.ok).toBe(false);
    expect(has(result, 'gearOnShoulder')).toBe(true);
  });

  it('reports a tyre off the pavement differently', () => {
    const path = straightPath({ p: { x: 600, y: 235 }, heading: 0 }, 200);
    const result = impl.validateSweep(
      zones(), a320(), path, 'taxiway', permissionsFor(DEPARTURE), false,
    );
    expect(result.ok).toBe(false);
    expect(has(result, 'gearOffPavement')).toBe(true);
  });

  it('hard-rejects an outline crossing a holding position', () => {
    // Up taxiway E toward runway 27, which this clearance says to hold short of.
    const path = straightPath({ p: { x: 2300, y: 390 }, heading: 0.5 * PI }, 60);
    const result = impl.validateSweep(
      zones(), a320(), path, 'taxiway', permissionsFor(DEPARTURE), false,
    );
    expect(result.ok).toBe(false);
    expect(has(result, 'holdShortCrossed')).toBe(true);
  });

  it('catches an outline past the line while the centreline is clear', () => {
    // The path stops ten metres short of the line.  The reference point never
    // reaches it -- but the nose is 12.6 m ahead of the reference point, and
    // the nose is what matters.
    const path = straightPath({ p: { x: 2300, y: 395 }, heading: 0.5 * PI }, 20);
    expect(pathEndPose(path).p.y).toBeLessThan(425);
    const result = impl.validateSweep(
      zones(), a320(), path, 'taxiway', permissionsFor(DEPARTURE), false,
    );
    expect(result.ok, 'testing the centreline instead of the outline misses this').toBe(false);
    expect(has(result, 'holdShortCrossed')).toBe(true);
  });

  it('opens exactly the runway a clearance to cross names', () => {
    // Straight across runway 36 on taxiway B.  With the crossing cleared this
    // is fine; without it, it is the worst thing the planner could produce.
    const path = straightPath({ p: { x: 1450, y: 400 }, heading: 0 }, 300);

    const cleared = impl.validateSweep(
      zones(), a320(), path, 'taxiway', permissionsFor(DEPARTURE), false,
    );
    expect(cleared.ok, why(cleared)).toBe(true);

    const uncleared = impl.validateSweep(
      zones(), a320(), path, 'taxiway',
      permissionsFor('TAXI TO RUNWAY 27 VIA B E HOLD SHORT RUNWAY 27'), false,
    );
    expect(uncleared.ok).toBe(false);
    expect(has(uncleared, 'holdShortCrossed') || has(uncleared, 'runwayEntered')).toBe(true);
  });

  it('forbids off-graph motion from changing zone', () => {
    // Out of the apron and onto taxiway A.  As an on-graph route that is
    // ordinary; as free-space motion it is the thing the whole design forbids.
    const path = straightPath({ p: { x: 420, y: 200 }, heading: 0 }, 200);

    const onGraph = impl.validateSweep(
      zones(), a320(), path, 'apron', permissionsFor(DEPARTURE), false,
    );
    expect(onGraph.ok).toBe(true);

    const offGraph = impl.validateSweep(
      zones(), a320(), path, 'apron', permissionsFor(DEPARTURE), true,
    );
    expect(offGraph.ok).toBe(false);
    expect(has(offGraph, 'leftStartZone')).toBe(true);
  });

  it('permits stand to apron, the one free-space transition', () => {
    const path = straightPath({ p: { x: 290, y: 95 }, heading: 0.5 * PI }, 80);
    const result = impl.validateSweep(
      zones(), a320(), path, 'stand', permissionsFor(DEPARTURE), true,
    );
    expect(result.ok, why(result)).toBe(true);
  });

  it('flags a wingtip too close to a structure', () => {
    // Taxiing along the front of the terminal at the south edge of stand 2.
    // The gear is on pavement the whole way; the wing is not.
    const path = straightPath({ p: { x: 200, y: 47 }, heading: 0 }, 200);
    const result = impl.validateSweep(
      zones(), a320(), path, 'stand', permissionsFor(DEPARTURE), true,
    );
    expect(result.ok).toBe(false);
    expect(has(result, 'wingtipConflict')).toBe(true);
  });

  it('reports once per problem, not once per sample', () => {
    const path = straightPath({ p: { x: 600, y: 235 }, heading: 0 }, 400);
    const result = impl.validateSweep(
      zones(), a320(), path, 'taxiway', permissionsFor(DEPARTURE), false,
    );
    expect(result.ok).toBe(false);
    expect(
      result.violations.length,
      'four hundred identical violations are not four hundred pieces of information',
    ).toBeLessThan(10);
  });

  it('names every violation', () => {
    for (const kind of SWEEP_VIOLATION_KINDS) expect(violationName(kind).length).toBeGreaterThan(1);
  });
});
