import { describe, expect, it } from 'vitest';
import {
  a320,
  type AircraftModel,
  deg,
  kiloAirport,
  PI,
  type Pose,
  type TaxiGraph,
} from '../../src/airport/index.js';
import { type Localization, START_MODES, startModeName } from '../../src/capstone/types.js';
import { impl, implName } from './impl.js';

let cachedGated: TaxiGraph | undefined;

function at(pose: Pose, model: AircraftModel = a320(), previous?: Localization): Localization {
  const airport = kiloAirport();
  cachedGated ??= impl.buildGatedGraph(airport.graph, airport.zones);
  return impl.localize(airport.zones, cachedGated, model, pose, previous);
}

const pose = (x: number, y: number, headingDegrees: number): Pose => ({
  p: { x, y },
  heading: deg(headingDegrees),
});

describe(`ex03 localization and start mode (${implName})`, () => {
  it('maps each zone to its own start mode', () => {
    expect(at(pose(290, 95, 90)).mode).toBe('stand');
    expect(at(pose(350, 240, 45)).mode).toBe('apron');
    expect(at(pose(800, 206, 8)).mode).toBe('taxiwayCapture');
    expect(at(pose(1150, 500, 0)).mode).toBe('runway');
  });

  it('treats a protected area as runway', () => {
    // No free-space planning between the holding position and the runway edge.
    const loc = at(pose(1550, 400, 0));
    expect(loc.zone).toBe('runwayProtected');
    expect(loc.mode).toBe('runway');
  });

  it('calls a footprint off the pavement a fault, and says why', () => {
    const loc = at(pose(800, 228, 0));
    expect(loc.mode).toBe('fault');
    expect(loc.detail, 'a refusal nobody can read is not much of a refusal').not.toBe('');
  });

  it('calls a footprint straddling two zones a fault', () => {
    // Half on taxiway A, half on the shoulder: the tyres disagree.
    const loc = at(pose(800, 218, 0));
    expect(loc.mode).toBe('fault');
    expect(loc.footprint.gearConsistent).toBe(false);
  });

  it('signs cross-track and heading error from the line', () => {
    // Six metres north of the centreline of taxiway A, pointed eight degrees
    // left of it.  North is left when you are heading east, so both are positive.
    const loc = at(pose(800, 206, 8));
    expect(loc.crossTrack).toBeCloseTo(6.0, 9);
    expect(Math.abs(loc.headingError - deg(8))).toBeLessThan(1e-6);
    expect(loc.onGuidanceLine).toBe(false);
    expect(loc.nearestEdge.edge).toBeGreaterThanOrEqual(0);
  });

  it('puts an aircraft sitting on the line inside the capture window', () => {
    const loc = at(pose(1150, 500, 0));
    expect(loc.crossTrack).toBeCloseTo(0, 9);
    expect(loc.headingError).toBeCloseTo(0, 9);
    expect(loc.onGuidanceLine).toBe(true);
  });

  it('shows a nose-in stand as a heading error of 180 degrees', () => {
    // The lead-out line runs north, out of the stand.  Parked facing the
    // terminal, the aircraft is pointed exactly the wrong way -- and that, not
    // a separate flag, is how the pipeline knows to ask for a pushback.
    const pushed = at(pose(290, 95, 90));
    expect(pushed.mode).toBe('stand');
    expect(Math.abs(pushed.headingError)).toBeLessThan(1e-6);

    const noseIn = at(pose(410, 95, -90));
    expect(noseIn.mode).toBe('stand');
    expect(
      Math.abs(noseIn.headingError),
      'the stand lead-out direction must not depend on which way the aircraft faces',
    ).toBeGreaterThan(0.5 * PI);
  });

  it('holds the mode across a boundary with hysteresis', () => {
    // One metre onto the taxiway, having been on the apron a moment ago.  With
    // no history this is a taxiway; with history it is still the apron, because
    // a metre of position noise must not flip the planner into capture mode.
    const justInside = pose(502, 200, 0);
    expect(at(justInside).mode).toBe('taxiwayCapture');

    const previous = at(pose(470, 200, 0));
    expect(previous.mode).toBe('apron');
    expect(at(justInside, a320(), previous).mode).toBe('apron');
  });

  it('gives way once the aircraft is properly across', () => {
    const previous = at(pose(470, 200, 0));
    expect(previous.mode).toBe('apron');
    // Well inside taxiway A now: the mode must follow.
    expect(at(pose(600, 200, 0), a320(), previous).mode).toBe('taxiwayCapture');
  });

  it('names every mode', () => {
    for (const mode of START_MODES) expect(startModeName(mode).length).toBeGreaterThan(1);
  });
});
