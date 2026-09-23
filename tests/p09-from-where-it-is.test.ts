import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { A320, at, expectRefused, expectValidRoute, kilo, ways } from './fixtures.js';

const { followTable, nextInstruction, quickestRouteFor, secondsToGo } = impl;

describe('p09 from where it actually is', () => {
  const table = secondsToGo(kilo, A320, at('HS 27 E'));

  // --- the examples in the brief ------------------------------------------

  it('gives an instruction from a point the plan never mentioned', () => {
    expect(nextInstruction(kilo, table, at('F1'))).toBe('B');
    expect(nextInstruction(kilo, table, at('A2'))).toBe('D');
    expect(nextInstruction(kilo, table, at('STAND 2'))).toBe('STAND 2');
  });

  it('says HOLD POSITION when it is already there', () => {
    expect(nextInstruction(kilo, table, at('HS 27 E'))).toBe('HOLD POSITION');
  });

  it('says UNABLE from the wrong side of the closure', () => {
    const answer = nextInstruction(kilo, table, at('P0'));
    expect(answer).toMatch(/^UNABLE/);
    expect(answer).toMatch(/P0/);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('walks the table into a whole route, from anywhere', () => {
    const route = followTable(kilo, A320, table, at('A1'));
    expectValidRoute(kilo, route);
    expect(route.ok).toBe(true);
    expect(kilo.node(route.nodes[route.nodes.length - 1]!).name).toBe('HS 27 E');
    expect(route.seconds).toBeCloseTo(table.seconds[at('A1')]!, 6);
  });

  it('gets the same answer as searching would, without searching', () => {
    for (const name of ['STAND 1', 'GA', 'F1', 'D1', 'C1']) {
      const walked = followTable(kilo, A320, table, at(name));
      const searched = quickestRouteFor(kilo, A320, at(name), at('HS 27 E'));
      expectValidRoute(kilo, walked);
      expect(walked.seconds).toBeCloseTo(searched.seconds, 6);
    }
  });

  it('may pick a DIFFERENT equal-cost route from the forward search', () => {
    // Foxtrot and Delta both join Alpha to Bravo and both cost exactly 60 s, so
    // there are two best routes out of the apron and no reason to prefer
    // either.  Searching forwards from the stand and backwards from the holding
    // point break that tie differently, and both answers are correct.
    //
    // This is worth knowing before it surprises you: "the optimal route" is
    // usually "an optimal route".
    const walked = followTable(kilo, A320, table, at('STAND 1'));
    const searched = quickestRouteFor(kilo, A320, at('STAND 1'), at('HS 27 E'));
    expect(walked.seconds).toBeCloseTo(searched.seconds, 6);
    for (const route of [walked, searched]) {
      const used = ways(kilo, route);
      expect(used.includes('F') || used.includes('D')).toBe(true);
    }
  });

  it('does no searching at all, and says so in the counters', () => {
    const route = followTable(kilo, A320, table, at('A1'));
    expect(route.expanded).toBe(0);
    expect(route.generated).toBe(0);
  });

  it('refuses to invent a route from an unreachable point', () => {
    expectRefused(followTable(kilo, A320, table, at('P0')), /UNABLE/);
  });

  it('handles a point that is not on the chart', () => {
    expect(nextInstruction(kilo, table, -1)).toMatch(/^UNABLE/);
    expect(followTable(kilo, A320, table, -1).ok).toBe(false);
  });

  it('following from the goal is a route of no legs', () => {
    const route = followTable(kilo, A320, table, at('HS 27 E'));
    expectValidRoute(kilo, route);
    expect(route.ok).toBe(true);
    expect(route.links).toEqual([]);
  });
});
