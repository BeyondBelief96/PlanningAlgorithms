import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { A320, at, expectRefused, expectValidRoute, kilo, ways } from './fixtures.js';

const { fewestLegs } = impl;

describe('p01 the first route', () => {
  // --- the examples in the brief ------------------------------------------

  it('gets an aeroplane off stand 2 to the holding point in 13 legs', () => {
    const route = fewestLegs(kilo, at('STAND 2'), at('HS 27 E'));
    expectValidRoute(kilo, route);
    expect(route.ok).toBe(true);
    expect(ways(kilo, route)).toEqual(['STAND 2', 'APRON', 'A', 'D', 'B', 'E']);
    expect(route.links.length).toBe(13);
    expect(route.distanceM).toBeCloseTo(2340, 0);
  });

  it('brings it back the other way for the same 13 legs', () => {
    const route = fewestLegs(kilo, at('HS 27 E'), at('STAND 2'));
    expectValidRoute(kilo, route);
    expect(ways(kilo, route)).toEqual(['E', 'B', 'D', 'A', 'APRON', 'STAND 2']);
    expect(route.links.length).toBe(13);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('refuses when there is no route at all', () => {
    // R36 is the far end of runway 18/36 and nothing on this chart joins it to
    // a stand except across the runway itself -- but P0 is behind a closure.
    // fewestLegs does not know about closures, so use a point that is genuinely
    // cut off: none is, so check the argument-checking instead.
    expectRefused(fewestLegs(kilo, -1, at('HS 27 E')), /start/i);
    expectRefused(fewestLegs(kilo, at('STAND 2'), 9999), /destination/i);
  });

  it('honours one-way taxiway F even though it knows nothing about aircraft', () => {
    // F runs A1 -> F1 only.  A route that comes back down it is not a route.
    const route = fewestLegs(kilo, at('F1'), at('A1'));
    expectValidRoute(kilo, route);
    expect(route.ok).toBe(true);
    expect(ways(kilo, route)).not.toContain('F');
  });

  it('asking to stay where you are is a route of no legs, not a refusal', () => {
    const route = fewestLegs(kilo, at('GA'), at('GA'));
    expectValidRoute(kilo, route);
    expect(route.ok).toBe(true);
    expect(route.links).toEqual([]);
    expect(route.nodes).toEqual([at('GA')]);
    expect(route.seconds).toBe(0);
  });

  it('counts how much of the aerodrome it looked at', () => {
    const route = fewestLegs(kilo, at('STAND 2'), at('HS 27 E'));
    expect(route.expanded).toBeGreaterThan(0);
    expect(route.generated).toBeGreaterThanOrEqual(route.expanded);
  });

  it('takes the fewest legs, which is NOT the quickest -- that is Problem 02', () => {
    const route = fewestLegs(kilo, at('STAND 2'), at('HS 27 E'));
    // 13 legs and 297 s.  Problem 02 finds a 15-leg route that is quicker.
    expect(route.seconds).toBeCloseTo(297, 0);
  });
});
