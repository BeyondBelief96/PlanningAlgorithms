import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { A320, B777, at, expectRefused, expectValidRoute, kilo, ways } from './fixtures.js';

const { backwardRoute, bidirectionalRoute, fewestLegs, quickestRouteFor } = impl;

describe('p14 from the other end', () => {
  // --- the examples in the brief ------------------------------------------

  it('reaches the same answer as the forward search', () => {
    const forward = quickestRouteFor(kilo, A320, at('STAND 2'), at('HS 27 E'));
    const backward = backwardRoute(kilo, A320, at('STAND 2'), at('HS 27 E'));
    expectValidRoute(kilo, backward);
    expect(backward.ok).toBe(true);
    expect(backward.seconds).toBeCloseTo(forward.seconds, 6);
  });

  it('gets the one-way taxiway the right way round', () => {
    // Foxtrot runs A1 -> F1 only.  Backwards, the question is "could I have
    // arrived here along this leg", and getting that test the wrong way round
    // produces a route that taxis Foxtrot southbound -- and every leg of it
    // validates, because validateRoute checks the route it is given, not the
    // search that produced it.
    const route = backwardRoute(kilo, A320, at('F1'), at('A1'));
    expectValidRoute(kilo, route);
    if (route.ok) expect(ways(kilo, route)).not.toContain('F');
  });

  it('arrives at the same taxi time from either direction', () => {
    // The route may differ -- Foxtrot and Delta cost exactly the same out of
    // the apron, and a forward and a backward search break that tie
    // differently.  The TIME must not differ.
    for (const [from, to] of [
      ['STAND 2', 'HS 27 E'],
      ['STAND 1', 'CR'],
      ['A1', 'E1'],
    ] as const) {
      const forward = quickestRouteFor(kilo, A320, at(from), at(to));
      const backward = backwardRoute(kilo, A320, at(from), at(to));
      expect(backward.ok, `${from} -> ${to}`).toBe(forward.ok);
      if (forward.ok) expect(backward.seconds).toBeCloseTo(forward.seconds, 6);
    }
  });

  it('refuses for the aeroplane, not just for the chart', () => {
    // The 777 does not fit down taxiway D.  A backward search has to apply the
    // same test as a forward one, or it finds a route nobody can taxi.
    expectRefused(backwardRoute(kilo, B777, at('STAND 2'), at('HS 27 E')));
  });

  it('meets in the middle', () => {
    const both = bidirectionalRoute(kilo, at('STAND 2'), at('HS 27 E'));
    const wide = fewestLegs(kilo, at('STAND 2'), at('HS 27 E'));
    expectValidRoute(kilo, both);
    expect(both.ok).toBe(true);
    // Fewest legs, the same as breadth first.  Expanding whole wavefronts
    // rather than one point at a time is what preserves that.
    expect(both.links.length).toBe(wide.links.length);
  });

  it('looks at less of the aerodrome than one search from one end', () => {
    // Two small circles cover far less than one large one.  That is the entire
    // argument for bidirectional search, and it is worth seeing the number.
    const both = bidirectionalRoute(kilo, at('STAND 2'), at('HS 27 E'));
    const wide = fewestLegs(kilo, at('STAND 2'), at('HS 27 E'));
    expect(both.expanded).toBeLessThanOrEqual(wide.expanded);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('goes nowhere when it is already there', () => {
    for (const route of [
      backwardRoute(kilo, A320, at('A1'), at('A1')),
      bidirectionalRoute(kilo, at('A1'), at('A1')),
    ]) {
      expectValidRoute(kilo, route);
      expect(route.links).toHaveLength(0);
    }
  });

  it('refuses a destination behind the closed apron stub', () => {
    // P0 is behind the stub that is closed for resurfacing.  backwardRoute
    // takes an Aircraft and so applies Problem 03's test; bidirectionalRoute
    // does not, exactly like Problem 01, and will route straight down it.
    // Which of the two you want depends on the question, and the signature is
    // what tells you which you have.
    expectRefused(backwardRoute(kilo, A320, at('HS 27 E'), at('P0')));
    expect(bidirectionalRoute(kilo, at('HS 27 E'), at('P0')).ok).toBe(true);
  });

  it('refuses a point that is not on the chart', () => {
    expectRefused(backwardRoute(kilo, A320, at('STAND 2'), -1));
    expectRefused(bidirectionalRoute(kilo, 9999, at('STAND 2')));
  });

  it('never runs a one-way taxiway backwards, either half of it', () => {
    const route = bidirectionalRoute(kilo, at('F1'), at('A1'));
    expectValidRoute(kilo, route);
    if (!route.ok) return;
    for (let i = 0; i < route.links.length; ++i)
      expect(kilo.travellable(route.links[i]!, route.nodes[i]!)).toBe(true);
  });
});
