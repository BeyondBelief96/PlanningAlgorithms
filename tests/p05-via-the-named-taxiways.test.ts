import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { A320, B777, at, expectRefused, expectValidRoute, kilo, ways } from './fixtures.js';
import {
  arrivalToStand1,
  standDeparture,
  unreachableVia,
  viaDeicing,
} from '../src/chart/index.js';

const { routeUnderClearance } = impl;

describe('p05 via the named taxiways', () => {
  // --- the examples in the brief ------------------------------------------

  it('taxis stand 2 to the 27 holding point via Alpha Delta Bravo Echo', () => {
    const route = routeUnderClearance(kilo, A320, at('STAND 2'), standDeparture());
    expectValidRoute(kilo, route);
    expect(route.ok).toBe(true);
    expect(ways(kilo, route)).toEqual(['STAND 2', 'APRON', 'A', 'D', 'B', 'E']);
    expect(kilo.node(route.nodes[route.nodes.length - 1]!).name).toBe('HS 27 E');
  });

  it('will not take the runway shortcut, because the clearance did not name it', () => {
    // Problem 02 found a quicker route down runway 09/27.  It does not comply,
    // so it is not an answer to this question.
    const route = routeUnderClearance(kilo, A320, at('STAND 2'), standDeparture());
    expect(ways(kilo, route)).not.toContain('RWY 09/27');
    expect(ways(kilo, route)).not.toContain('C');
  });

  it('refuses a clearance that does not reach where it says it does', () => {
    const route = routeUnderClearance(kilo, A320, at('STAND 2'), unreachableVia());
    expectRefused(route, /UNABLE/);
    // And it refuses it as a ROUTING problem, not as "there is no route" --
    // because there is one, just not that way.
    expect(route.refusal).toMatch(/via|routing/i);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('tells the two kinds of failure apart', () => {
    const routingProblem = routeUnderClearance(kilo, A320, at('STAND 2'), unreachableVia());
    const noRouteAtAll = routeUnderClearance(kilo, B777, at('STAND 2'), standDeparture());
    expectRefused(routingProblem);
    expectRefused(noRouteAtAll);
    expect(routingProblem.refusal).not.toBe(noRouteAtAll.refusal);
    expect(noRouteAtAll.refusal).toMatch(/no route/i);
  });

  it('handles an arrival, which is a different set of taxiways in a different order', () => {
    const route = routeUnderClearance(kilo, A320, at('CR'), arrivalToStand1());
    expectValidRoute(kilo, route);
    expect(ways(kilo, route)).toEqual(['C', 'B', 'D', 'A', 'APRON', 'STAND 1']);
  });

  it('routes to the de-icing pad when told to', () => {
    const route = routeUnderClearance(kilo, A320, at('STAND 2'), viaDeicing());
    expectValidRoute(kilo, route);
    expect(ways(kilo, route)).toEqual(['STAND 2', 'APRON', 'A', 'DEICE']);
    expect(route.seconds).toBeCloseTo(152.5, 1);
  });

  it('treats an empty via list as "by any route"', () => {
    const anyRoute = { ...standDeparture(), via: [] };
    const route = routeUnderClearance(kilo, A320, at('STAND 2'), anyRoute);
    expectValidRoute(kilo, route);
    expect(route.ok).toBe(true);
  });

  it('refuses a destination that is not on the aerodrome', () => {
    const nonsense = { ...standDeparture(), destination: 'HOLDING POINT ZULU' };
    expectRefused(routeUnderClearance(kilo, A320, at('STAND 2'), nonsense), /UNABLE/);
  });

  it('follows the named taxiways in ORDER, not merely uses them', () => {
    // Reversing the via list describes a route that does not exist, even though
    // every taxiway in it is one the complying route uses.
    const backwards = { ...standDeparture(), via: ['E', 'B', 'D', 'A'] };
    expectRefused(routeUnderClearance(kilo, A320, at('STAND 2'), backwards));
  });
});
