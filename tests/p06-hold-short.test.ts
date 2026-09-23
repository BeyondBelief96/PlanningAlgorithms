import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { A320, at, expectRefused, expectValidRoute, kilo, ways } from './fixtures.js';
import {
  arrivalToStand1,
  noCrossingClearance,
  NO_NODE,
  standDeparture,
} from '../src/chart/index.js';

const { planDeparture, quickestRoute, runwaysCrossed } = impl;

describe('p06 hold short', () => {
  // --- the examples in the brief ------------------------------------------

  it('plans the departure and stops it at the holding point', () => {
    const route = planDeparture(kilo, A320, at('STAND 2'), standDeparture());
    expectValidRoute(kilo, route);
    expect(route.ok).toBe(true);
    expect(ways(kilo, route)).toEqual(['STAND 2', 'APRON', 'A', 'D', 'B', 'E']);
    expect(route.stopAt).not.toBe(NO_NODE);
    expect(kilo.node(route.stopAt).name).toBe('HS 27 E');
  });

  it('notices that the route crosses 18/36, which the clearance permits', () => {
    const route = planDeparture(kilo, A320, at('STAND 2'), standDeparture());
    expect(runwaysCrossed(kilo, route)).toEqual(['18/36']);
  });

  it('refuses the same taxi without the crossing, and says how far it CAN go', () => {
    const route = planDeparture(kilo, A320, at('STAND 2'), noCrossingClearance());
    expectRefused(route, /18\/36/);
    expect(route.refusal).toMatch(/HS 36 W/);
    expect(route.refusal).toMatch(/UNABLE/);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('counts a runway the route taxis ALONG, not only one it crosses', () => {
    // Problem 02's route runs 500 m down 09/27.  runwaysCrossed has to see it.
    const shortcut = quickestRoute(kilo, A320, at('STAND 2'), at('HS 27 E'));
    expect(runwaysCrossed(kilo, shortcut)).toContain('09/27');
  });

  it('does not count the runway the aeroplane is already standing on', () => {
    // An aircraft that has just landed is ON the runway.  It is not crossing
    // it, and a planner that says otherwise refuses every arrival.
    const route = planDeparture(kilo, A320, at('CR'), arrivalToStand1());
    expectValidRoute(kilo, route);
    expect(route.ok).toBe(true);
    expect(runwaysCrossed(kilo, route)).toEqual(['18/36']);
  });

  it('an arrival to a stand does not get a stop point', () => {
    const route = planDeparture(kilo, A320, at('CR'), arrivalToStand1());
    expect(route.stopAt).toBe(NO_NODE);
  });

  it('passes a refusal from Problem 05 straight through', () => {
    const nonsense = { ...standDeparture(), destination: 'HOLDING POINT ZULU' };
    expectRefused(planDeparture(kilo, A320, at('STAND 2'), nonsense));
  });

  it('reports nothing crossed for a route that stays on the taxiways', () => {
    const route = planDeparture(kilo, A320, at('STAND 2'), {
      text: 'taxi to the de-icing pad via Alpha',
      destination: 'DEICE PAD',
      via: ['A', 'DEICE'],
      mayCross: [],
    });
    expectValidRoute(kilo, route);
    expect(runwaysCrossed(kilo, route)).toEqual([]);
    expect(route.stopAt).toBe(NO_NODE);
  });
});
