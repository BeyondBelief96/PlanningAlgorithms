import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { A320, at, expectRefused, expectValidRoute, kilo, ways } from './fixtures.js';

const { fewestLegs, quickestRoute } = impl;

describe('p02 the quickest taxi', () => {
  // --- the examples in the brief ------------------------------------------

  it('beats the fewest-legs route on time, and loses on legs', () => {
    const quick = quickestRoute(kilo, A320, at('STAND 2'), at('HS 27 E'));
    const few = fewestLegs(kilo, at('STAND 2'), at('HS 27 E'));
    expectValidRoute(kilo, quick);

    expect(quick.seconds).toBeLessThan(few.seconds);
    expect(quick.links.length).toBeGreaterThan(few.links.length);
    expect(quick.seconds).toBeCloseTo(295.33, 1);
  });

  it('is the one that taxis down runway 09/27, and that is the point', () => {
    // A runway is the fastest pavement on the aerodrome, so a planner that is
    // only counting seconds will use one.  This route is correct and
    // completely unacceptable.  Problem 06 is where that gets fixed.
    const route = quickestRoute(kilo, A320, at('STAND 2'), at('HS 27 E'));
    expect(ways(kilo, route)).toContain('RWY 09/27');
    expect(ways(kilo, route)).toEqual([
      'STAND 2', 'APRON', 'A', 'F', 'B', 'C', 'RWY 09/27', 'E',
    ]);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('is symmetric where the chart is, and not where it is not', () => {
    const out = quickestRoute(kilo, A320, at('STAND 2'), at('HS 27 E'));
    const back = quickestRoute(kilo, A320, at('HS 27 E'), at('STAND 2'));
    expectValidRoute(kilo, back);
    // Coming back it cannot use F, which is one-way northbound.
    expect(ways(kilo, out)).toContain('F');
    expect(ways(kilo, back)).not.toContain('F');
  });

  it('never returns a route whose quoted time is less than its legs', () => {
    const route = quickestRoute(kilo, A320, at('STAND 3'), at('DEICE PAD'));
    expectValidRoute(kilo, route);
    expect(route.ok).toBe(true);
  });

  it('refuses rather than guesses when an argument is not on the chart', () => {
    expectRefused(quickestRoute(kilo, A320, -1, at('GA')));
    expectRefused(quickestRoute(kilo, A320, at('GA'), 9999));
  });

  it('staying put costs nothing', () => {
    const route = quickestRoute(kilo, A320, at('A1'), at('A1'));
    expectValidRoute(kilo, route);
    expect(route.seconds).toBe(0);
    expect(route.links).toEqual([]);
  });

  it('is optimal, so no other route it could have found is quicker', () => {
    // The cheapest route to every point it settled is final.  Spot-check one:
    // there is no way to reach the de-icing pad in under 152.5 s.
    const route = quickestRoute(kilo, A320, at('STAND 2'), at('DEICE PAD'));
    expectValidRoute(kilo, route);
    expect(route.seconds).toBeCloseTo(152.5, 1);
  });
});
