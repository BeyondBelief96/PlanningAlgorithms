import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { A320, at, expectValidRoute, kilo } from './fixtures.js';
import { busyHub } from '../src/chart/index.js';

const { quickestRouteGuided, quickestRouteWithTurns } = impl;
const hub = busyHub();
const hubAt = (name: string) => {
  const id = hub.find(name);
  if (id < 0) throw new Error(`${name} is not on the busy hub`);
  return id;
};

describe('p07 a chart the size of a real one', () => {
  // --- the examples in the brief ------------------------------------------

  it('gets exactly the same answer as Problem 04', () => {
    const blind = quickestRouteWithTurns(hub, A320, hubAt('STAND 1'), hubAt('STAND 15'));
    const guided = quickestRouteGuided(hub, A320, hubAt('STAND 1'), hubAt('STAND 15'));
    expectValidRoute(hub, guided);
    expect(guided.seconds).toBeCloseTo(blind.seconds, 6);
    expect(guided.seconds).toBeCloseTo(410, 0);
  });

  it('looks at a fraction of the aerodrome to get it', () => {
    const blind = quickestRouteWithTurns(hub, A320, hubAt('STAND 1'), hubAt('STAND 15'));
    const guided = quickestRouteGuided(hub, A320, hubAt('STAND 1'), hubAt('STAND 15'));
    expect(guided.expanded).toBeLessThan(blind.expanded / 2);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('is optimal on the hard diagonal too, where the guess helps least', () => {
    // Corner to far corner: the lattice offers hundreds of equal-cost routes
    // and the estimate has much less to say.  It must still be exact.
    const blind = quickestRouteWithTurns(hub, A320, hubAt('STAND 1'), hubAt('I15'));
    const guided = quickestRouteGuided(hub, A320, hubAt('STAND 1'), hubAt('I15'));
    expectValidRoute(hub, guided);
    expect(guided.seconds).toBeCloseTo(blind.seconds, 6);
    expect(guided.expanded).toBeLessThanOrEqual(blind.expanded);
  });

  it('agrees with Problem 04 on the small chart as well', () => {
    const blind = quickestRouteWithTurns(kilo, A320, at('STAND 2'), at('HS 27 E'));
    const guided = quickestRouteGuided(kilo, A320, at('STAND 2'), at('HS 27 E'));
    expectValidRoute(kilo, guided);
    expect(guided.seconds).toBeCloseTo(blind.seconds, 6);
    expect(guided.seconds).toBeCloseTo(377, 0);
  });

  it('still refuses what cannot be done', () => {
    expect(quickestRouteGuided(kilo, A320, -1, at('GA')).ok).toBe(false);
    expect(quickestRouteGuided(kilo, A320, at('GA'), 9999).ok).toBe(false);
  });

  it('staying put is free and instant', () => {
    const route = quickestRouteGuided(hub, A320, hubAt('E8'), hubAt('E8'));
    expectValidRoute(hub, route);
    expect(route.seconds).toBe(0);
  });
});
