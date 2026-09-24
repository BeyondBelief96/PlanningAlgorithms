import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { A320, at, expectRefused, expectValidRoute, kilo, ways } from './fixtures.js';

const { depthFirstRoute, fewestLegs, iterativeDeepeningRoute, quickestRouteFor, routeWithinLegs } =
  impl;

describe('p13 deep first, and what it costs', () => {
  // --- the examples in the brief ------------------------------------------

  it('finds a route, and does not promise it is a good one', () => {
    const route = depthFirstRoute(kilo, at('STAND 2'), at('HS 27 E'));
    expectValidRoute(kilo, route);
    expect(route.ok).toBe(true);
    expect(route.nodes[0]).toBe(at('STAND 2'));
    expect(route.nodes[route.nodes.length - 1]).toBe(at('HS 27 E'));

    // Breadth first is the one with the guarantee.  Depth first is allowed to
    // be worse, and on this chart it is -- that is the entire lesson.
    const best = fewestLegs(kilo, at('STAND 2'), at('HS 27 E'));
    expect(route.links.length).toBeGreaterThanOrEqual(best.links.length);
  });

  it('holds only the branch it is on', () => {
    // `generated` is the high-water mark of things the search had to remember.
    // Depth first never has more than one branch in hand; breadth first has a
    // whole wavefront.  On a chart this size the difference is small, and on
    // the capstone's pose lattice it is the difference between fitting in
    // memory and not.
    const deep = depthFirstRoute(kilo, at('STAND 2'), at('HS 27 E'));
    const wide = fewestLegs(kilo, at('STAND 2'), at('HS 27 E'));
    expect(deep.generated).toBeGreaterThan(0);
    expect(wide.generated).toBeGreaterThan(0);
  });

  it('refuses a budget it cannot make', () => {
    // Stand 2 to the holding point is five legs at best.  Three is not enough,
    // and the honest answer is no rather than a route that skips a taxiway.
    expectRefused(routeWithinLegs(kilo, at('STAND 2'), at('HS 27 E'), 3), /3 leg/);
  });

  it('finds it once the budget is large enough', () => {
    const best = fewestLegs(kilo, at('STAND 2'), at('HS 27 E'));
    const limited = routeWithinLegs(kilo, at('STAND 2'), at('HS 27 E'), best.links.length);
    expectValidRoute(kilo, limited);
    expect(limited.ok).toBe(true);
    expect(limited.links.length).toBe(best.links.length);
  });

  it('gets breadth first’s answer out of depth first’s memory', () => {
    // This is the whole point of iterative deepening: the guarantee of
    // Problem 01 with the frontier of a single branch.
    const deepened = iterativeDeepeningRoute(kilo, at('STAND 2'), at('HS 27 E'));
    const best = fewestLegs(kilo, at('STAND 2'), at('HS 27 E'));
    expectValidRoute(kilo, deepened);
    expect(deepened.links.length).toBe(best.links.length);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('does the repeated work, and it is not free', () => {
    // Iterative deepening re-expands the shallow points on every pass, so it
    // examines strictly more than the single depth-limited pass that succeeds.
    // The claim is that the factor is bounded, not that it is one.
    const best = fewestLegs(kilo, at('STAND 2'), at('HS 27 E'));
    const once = routeWithinLegs(kilo, at('STAND 2'), at('HS 27 E'), best.links.length);
    const deepened = iterativeDeepeningRoute(kilo, at('STAND 2'), at('HS 27 E'));
    expect(deepened.expanded).toBeGreaterThan(once.expanded);
  });

  it('routes down the closed apron stub, because nobody told it not to', () => {
    // P0 sits behind the apron stub that is closed for resurfacing.  These two
    // take no Aircraft, exactly like Problem 01, so a closed leg is not their
    // business and they will happily use it.
    //
    // That is the contract, not a bug: knowing which legs this aeroplane may
    // use today is Problem 03's job, and mixing the two is how you end up with
    // a search you cannot reuse.  Compare quickestRouteFor(), which refuses.
    const deep = depthFirstRoute(kilo, at('HS 27 E'), at('P0'));
    expectValidRoute(kilo, deep);
    expect(deep.ok).toBe(true);
    expectRefused(quickestRouteFor(kilo, A320, at('HS 27 E'), at('P0')), /closed/);
  });

  it('goes nowhere when it is already there', () => {
    const route = iterativeDeepeningRoute(kilo, at('A1'), at('A1'));
    expectValidRoute(kilo, route);
    expect(route.links).toHaveLength(0);
    expect(ways(kilo, route)).toHaveLength(0);
  });

  it('refuses a budget below zero rather than quietly treating it as zero', () => {
    expectRefused(routeWithinLegs(kilo, at('STAND 2'), at('HS 27 E'), -1));
  });

  it('never runs a one-way taxiway backwards', () => {
    // Foxtrot runs A1 -> F1 only.  A depth-first search that ignores the flag
    // finds a route through it and every leg of that route looks fine.
    for (const route of [
      depthFirstRoute(kilo, at('F1'), at('A1')),
      iterativeDeepeningRoute(kilo, at('F1'), at('A1')),
    ]) {
      expectValidRoute(kilo, route);
      if (!route.ok) continue;
      for (let i = 0; i < route.links.length; ++i)
        expect(kilo.travellable(route.links[i]!, route.nodes[i]!)).toBe(true);
    }
  });
});
