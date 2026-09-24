import { describe, expect, it } from 'vitest';
import { NO_VERTEX } from '../../src/airport/index.js';
import { ARRIVAL, Fixture } from './fixture.js';
import { impl, implName } from './impl.js';

describe(`ex04 the permission set (${implName})`, () => {
  it('passes the route labels through in order', () => {
    const f = new Fixture();
    expect(f.permissions.routeLabels).toEqual(['A', 'D', 'B', 'E']);
  });

  it('opens exactly the runway 36 gates when told to cross 36', () => {
    const f = new Fixture();
    for (const [x, y] of [
      [1525, 400],
      [1575, 400],
      [1625, 400],
      [1675, 400],
    ] as const)
      expect(f.permissions.authorizedGates.has(f.gateNear(x, y))).toBe(true);
    expect(f.permissions.authorizedGates.size).toBe(4);
  });

  it('opens nothing at all for "hold short of 27"', () => {
    const f = new Fixture();
    expect(f.permissions.authorizedGates.has(f.gateNear(2300, 425))).toBe(false);
    expect(f.permissions.authorizedGates.has(f.gateNear(2300, 475))).toBe(false);
    expect(f.permissions.authorizedGates.has(f.gateNear(1800, 425))).toBe(false);
    expect(f.permissions.enterableRunways.has('36')).toBe(true);
    expect(f.permissions.enterableRunways.has('27')).toBe(false);
  });

  it('turns the unauthorized painted lines into mandatory stops', () => {
    const f = new Fixture();
    // The two holding positions for runway 27; the runway *edges* behind them
    // have no painted line and are not somewhere you stop.
    expect(f.permissions.mandatoryStops.size).toBe(2);
    expect(f.permissions.mandatoryStops.has(f.gateNear(2300, 425))).toBe(true);
    expect(f.permissions.mandatoryStops.has(f.gateNear(1800, 425))).toBe(true);
  });

  it('puts the goal on the holding position of the last cleared taxiway', () => {
    const f = new Fixture();
    // "...via A D B E, hold short of runway 27" means the holding position on
    // E, not the one on C, even though both protect runway 27.
    expect(f.permissions.goal).toBe(f.gateNear(2300, 425));
  });

  it('moves the goal onto the runway for a line-up clearance', () => {
    const f = new Fixture('TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 LINE UP AND WAIT');
    expect(f.clearance.clearedToEnterDestination).toBe(true);
    expect(f.permissions.enterableRunways.has('27')).toBe(true);
    expect(f.permissions.goal).toBe(f.gateNear(2300, 475));
    expect(f.permissions.authorizedGates.has(f.gateNear(2300, 425))).toBe(true);
  });

  it('ends a stand clearance at the parking position', () => {
    const f = new Fixture(ARRIVAL);
    expect(f.clearance.destinationIsRunway).toBe(false);
    expect(f.permissions.goal).not.toBe(NO_VERTEX);
    const goal = f.gated.vertex(f.permissions.goal);
    expect(goal.p.x).toBeCloseTo(290, 9);
    expect(goal.p.y).toBeCloseTo(95, 9);
    expect(impl.zoneAt(f.zones, goal.p).zone).toBe('stand');
  });

  it('has no goal when the clearance names nothing reachable', () => {
    const f = new Fixture('TAXI TO RUNWAY 27 VIA A HOLD SHORT RUNWAY 27');
    // There is no holding position for 27 on taxiway A.
    expect(f.permissions.goal).toBe(NO_VERTEX);
    expect(f.permissions.detail, 'say why, so the pipeline can report it').not.toBe('');
  });

  it('only puts de-icing in the mission when the clearance says so', () => {
    expect(new Fixture().permissions.deIcingInMission).toBe(false);
    const deiced = new Fixture(
      'TAXI TO RUNWAY 27 VIA A DEICE A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27',
    );
    expect(deiced.permissions.deIcingInMission).toBe(true);
  });
});
