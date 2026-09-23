import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { A320, B777, at, kilo } from './fixtures.js';
import { NO_LINK, UNREACHABLE } from '../src/chart/index.js';

const { quickestRouteFor, secondsToGo } = impl;

describe('p08 minutes to go', () => {
  // --- the examples in the brief ------------------------------------------

  it('gives a number for every point on the aerodrome', () => {
    const table = secondsToGo(kilo, A320, at('HS 27 E'));
    expect(table.goal).toBe(at('HS 27 E'));
    expect(table.seconds.length).toBe(kilo.numNodes);
    expect(table.next.length).toBe(kilo.numNodes);

    expect(table.seconds[at('HS 27 E')]).toBe(0);
    expect(table.seconds[at('STAND 2')]).toBeCloseTo(295.33, 1);
    expect(table.seconds[at('A2')]).toBeCloseTo(110.83, 1);
    expect(table.seconds[at('D1')]).toBeCloseTo(90.83, 1);
  });

  it('marks the closed-off corner of the apron unreachable', () => {
    // P0 sits behind the closed apron stub.  That is a real answer, not a gap.
    const table = secondsToGo(kilo, A320, at('HS 27 E'));
    expect(table.seconds[at('P0')]).toBe(UNREACHABLE);
    expect(table.next[at('P0')]).toBe(NO_LINK);
  });

  it('has nothing to do once it is there', () => {
    const table = secondsToGo(kilo, A320, at('HS 27 E'));
    expect(table.next[at('HS 27 E')]).toBe(NO_LINK);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('gets the one-way taxiway the right way round', () => {
    // F runs A1 -> F1.  So F is a way of REACHING B and never a way of leaving
    // it.  A table that says otherwise routes arrivals the wrong way down a
    // one-way taxiway, and every route it produces looks fine.
    const toStand = secondsToGo(kilo, A320, at('STAND 1'));
    const fromF1 = toStand.next[at('F1')];
    expect(fromF1).not.toBe(NO_LINK);
    expect(kilo.link(fromF1!).taxiway).not.toBe('F');
  });

  it('agrees with Problem 03 about the cost, from several points', () => {
    const table = secondsToGo(kilo, A320, at('HS 27 E'));
    for (const name of ['STAND 2', 'A1', 'D1', 'C1', 'GA']) {
      const route = quickestRouteFor(kilo, A320, at(name), at('HS 27 E'));
      expect(route.ok, `no route from ${name}`).toBe(true);
      expect(table.seconds[at(name)]).toBeCloseTo(route.seconds, 6);
    }
  });

  it('respects the aeroplane: a 777 can reach nothing from a code C stand', () => {
    const table = secondsToGo(kilo, B777, at('HS 27 E'));
    expect(table.seconds[at('STAND 2')]).toBe(UNREACHABLE);
  });

  it('returns a table of the right shape even for a goal that is not on the chart', () => {
    const table = secondsToGo(kilo, A320, -1);
    expect(table.seconds.length).toBe(kilo.numNodes);
    expect(table.seconds.every((s) => s === UNREACHABLE)).toBe(true);
  });

  it('every step of the table strictly reduces the time remaining', () => {
    // Which is what guarantees that following it terminates.
    const table = secondsToGo(kilo, A320, at('HS 27 E'));
    for (let v = 0; v < kilo.numNodes; ++v) {
      const e = table.next[v]!;
      if (e === NO_LINK) continue;
      const next = kilo.other(e, v);
      expect(table.seconds[next]!).toBeLessThan(table.seconds[v]!);
    }
  });
});
