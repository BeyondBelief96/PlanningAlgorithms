import { describe, expect, it } from 'vitest';
import { alongTrack, deg, type Pose } from '../../src/airport/index.js';
import {
  JUNCTION_EXCLUSION,
  MIN_LEAD_IN,
} from '../../src/capstone/types.js';
import { DEPARTURE, Fixture } from './fixture.js';
import { impl, implName } from './impl.js';

const pose = (x: number, y: number, headingDegrees: number): Pose => ({
  p: { x, y },
  heading: deg(headingDegrees),
});

describe(`ex07 merge candidates (${implName})`, () => {
  it('looks only at stand and apron lines from a stand start', () => {
    const f = new Fixture(DEPARTURE, pose(290, 95, 90));
    expect(f.localization.mode).toBe('stand');
    const candidates = f.candidates();
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      const zone = f.gated.edge(c.edge.edge).zone;
      expect(['stand', 'apron'], `a stand start produced a candidate on ${zone}`).toContain(zone);
    }
  });

  it('never aims at a taxiway from an apron start', () => {
    const f = new Fixture(DEPARTURE, pose(350, 240, 45));
    expect(f.localization.mode).toBe('apron');
    for (const c of f.candidates()) expect(f.gated.edge(c.edge.edge).zone).toBe('apron');
  });

  it('never produces a runway candidate from off a runway', () => {
    for (const start of [pose(290, 95, 90), pose(350, 240, 45), pose(800, 206, 8)]) {
      const f = new Fixture(DEPARTURE, start);
      for (const c of f.candidates()) {
        const zone = f.gated.edge(c.edge.edge).zone;
        expect(zone).not.toBe('runway');
        expect(zone).not.toBe('runwayProtected');
      }
    }
  });

  it('puts no candidate across a holding position', () => {
    // On taxiway B, 75 m short of the runway 36 holding position, and cleared
    // to cross it.  Even so, the *free-space* half of the plan may not reach
    // past the line: the crossing happens on the graph, at the gate, or not at
    // all.
    const f = new Fixture(
      'TAXI TO RUNWAY 27 VIA B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27',
      pose(1450, 400, 0),
    );
    expect(f.localization.mode).toBe('taxiwayCapture');
    const candidates = f.candidates();
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates)
      expect(c.target.p.x, 'a candidate was generated beyond HS 36 W').toBeLessThan(1525);
  });

  it('finds nowhere legal to go inside the protected area', () => {
    // Between the two holding positions for runway 36, with no crossing
    // clearance.  Nothing ahead is reachable and nothing behind is a candidate.
    const f = new Fixture('TAXI TO RUNWAY 27 VIA B E HOLD SHORT RUNWAY 27', pose(1550, 400, 0));
    expect(f.localization.mode).toBe('runway');
    expect(f.candidates()).toHaveLength(0);
  });

  it('puts every candidate ahead when on a runway', () => {
    const f = new Fixture('TAXI TO STAND 2 VIA C B D A CROSS RUNWAY 36', pose(1150, 500, 0));
    expect(f.localization.mode).toBe('runway');
    const candidates = f.candidates();
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(
        alongTrack(f.localization.pose, c.target.p),
        'forward only: you cannot pick an exit behind you',
      ).toBeGreaterThan(0);
      expect(f.gated.edge(c.edge.edge).zone).toBe('runway');
    }
  });

  it('keeps clear of junctions and leaves room to settle', () => {
    const f = new Fixture(DEPARTURE, pose(800, 206, 8));
    const candidates = f.candidates();
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      const length = f.gated.length(c.edge.edge);
      expect(c.s).toBeGreaterThanOrEqual(JUNCTION_EXCLUSION - 1e-9);
      expect(c.s).toBeLessThanOrEqual(length - JUNCTION_EXCLUSION + 1e-9);
      expect(c.leadIn).toBeGreaterThanOrEqual(MIN_LEAD_IN - 1e-9);
    }
  });

  it('follows collinear edges across junctions for the lead-in', () => {
    // Taxiway A is cut in three by the de-icing junction and the F junction, so
    // an edge-by-edge lead-in would understate it badly.  Merging 25 m into the
    // 400 m stretch from A1 to A2 leaves 375 m of A, and nothing after it is
    // collinear, so that is the answer.
    const f = new Fixture(DEPARTURE, pose(1050, 206, 0));
    const candidates = f.candidates();
    expect(candidates.length).toBeGreaterThan(0);
    const best = Math.max(...candidates.map((c) => c.leadIn));
    expect(best, 'the lead-in should run to the end of taxiway A').toBeGreaterThan(200);
  });

  it('arrives cheapest first', () => {
    const f = new Fixture(DEPARTURE, pose(350, 240, 45));
    const candidates = f.candidates();
    expect(candidates.length).toBeGreaterThan(1);
    const rate = impl.zoneCostRate(f.localization.zone);
    let previous = -1;
    for (const c of candidates) {
      const dx = f.localization.pose.p.x - c.target.p.x;
      const dy = f.localization.pose.p.y - c.target.p.y;
      const score = c.costToGo + Math.hypot(dx, dy) * rate;
      expect(score).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = score;
    }
  });

  it('gives every candidate a usable route index', () => {
    const f = new Fixture(DEPARTURE, pose(290, 95, 90));
    for (const c of f.candidates()) {
      expect(c.routeIndex).toBeGreaterThanOrEqual(0);
      expect(c.routeIndex).toBe(
        impl.advanceRouteIndex(f.gated.edge(c.edge.edge), 0, f.permissions.routeLabels),
      );
      expect(impl.costToGoReachable(f.costToGo, c.edge, c.routeIndex)).toBe(true);
    }
  });

  it('produces nothing at all from a fault', () => {
    const f = new Fixture(DEPARTURE, pose(800, 228, 0));
    expect(f.localization.mode).toBe('fault');
    expect(f.candidates()).toHaveLength(0);
  });
});
