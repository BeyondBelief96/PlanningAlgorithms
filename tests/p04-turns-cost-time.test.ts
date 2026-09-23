import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { A320, DHC8, at, expectValidRoute, kilo, ways } from './fixtures.js';

const { quickestRouteFor, quickestRouteWithTurns } = impl;

describe('p04 turns cost time', () => {
  // --- the examples in the brief ------------------------------------------

  it('stops routing down the runway, because getting on and off it is two turns', () => {
    const route = quickestRouteWithTurns(kilo, A320, at('STAND 2'), at('HS 27 E'));
    expectValidRoute(kilo, route);
    expect(ways(kilo, route)).toEqual(['STAND 2', 'APRON', 'A', 'D', 'B', 'E']);
    expect(route.seconds).toBeCloseTo(377, 0);
  });

  it('charges a different aeroplane a different amount for the same route', () => {
    const jet = quickestRouteWithTurns(kilo, A320, at('STAND 2'), at('HS 27 E'));
    const prop = quickestRouteWithTurns(kilo, DHC8, at('STAND 2'), at('HS 27 E'));
    expectValidRoute(kilo, prop);
    expect(ways(kilo, prop)).toEqual(ways(kilo, jet));
    expect(prop.seconds).toBeLessThan(jet.seconds);
    expect(prop.seconds).toBeCloseTo(345, 0);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('quotes a time that is MORE than its legs, and validateRoute allows it', () => {
    const route = quickestRouteWithTurns(kilo, A320, at('STAND 2'), at('HS 27 E'));
    expectValidRoute(kilo, route);
    const legsOnly = quickestRouteFor(kilo, A320, at('STAND 2'), at('HS 27 E'));
    expect(route.seconds).toBeGreaterThan(legsOnly.seconds);
  });

  it('never turns the aeroplane round on the spot', () => {
    const route = quickestRouteWithTurns(kilo, A320, at('STAND 2'), at('HS 27 E'));
    for (let i = 1; i < route.links.length; ++i)
      expect(route.links[i]).not.toBe(route.links[i - 1]);
  });

  it('charges nothing for the first leg, because there is no arrival to turn from', () => {
    // One leg straight out of the stand: the turn penalty cannot apply.
    const route = quickestRouteWithTurns(kilo, A320, at('STAND 2'), at('P2'));
    expectValidRoute(kilo, route);
    expect(route.seconds).toBeCloseTo(52.5, 1);
  });

  it('still refuses an impossible request', () => {
    const route = quickestRouteWithTurns(kilo, A320, -1, at('GA'));
    expect(route.ok).toBe(false);
  });

  it('agrees with Problem 03 when the aeroplane has no turn penalty', () => {
    const still = { ...A320, turnPenaltyS: 0 };
    const withTurns = quickestRouteWithTurns(kilo, still, at('STAND 2'), at('HS 27 E'));
    const without = quickestRouteFor(kilo, still, at('STAND 2'), at('HS 27 E'));
    expectValidRoute(kilo, withTurns);
    expect(withTurns.seconds).toBeCloseTo(without.seconds, 3);
  });
});
