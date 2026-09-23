import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { A320, B777, DHC8, at, expectRefused, expectValidRoute, kilo, ways } from './fixtures.js';

const { unusableReason, quickestRouteFor } = impl;

const legOf = (taxiway: string) => kilo.links.find((l) => l.taxiway === taxiway)!.id;
const apronStub = kilo.links.find(
  (l) => l.taxiway === 'APRON' && kilo.node(l.from).name === 'P0',
)!.id;

describe('p03 will it fit', () => {
  // --- the examples in the brief ------------------------------------------

  it('says why a 777 cannot use taxiway D, and names the number', () => {
    const why = unusableReason(kilo, legOf('D'), B777);
    expect(why).not.toBe('');
    expect(why).toMatch(/36/);
    expect(why).toMatch(/64\.8/);
    expect(why).toMatch(/D/);
  });

  it('lets an A320 down taxiway D by twenty centimetres', () => {
    expect(unusableReason(kilo, legOf('D'), A320)).toBe('');
    expect(unusableReason(kilo, legOf('D'), DHC8)).toBe('');
  });

  it('refuses a 777 on stand 3 for the apron, not for the stand', () => {
    // Stand 3 is a code E stand, so it gets off the stand.  The apron beyond it
    // is code D, and that is where the refusal actually lands.
    const route = quickestRouteFor(kilo, B777, at('STAND 3'), at('HS 27 E'));
    expectRefused(route, /APRON/);
    expect(route.refusal).toMatch(/64\.8/);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('says CLOSED about a closed leg, not TOO WIDE', () => {
    // The apron stub west of stand 1 is closed.  It is closed to everybody, and
    // calling it too narrow would be a lie.
    const why = unusableReason(kilo, apronStub, A320);
    expect(why).toMatch(/closed/i);
    expect(why).not.toMatch(/wingspan/i);
    expect(unusableReason(kilo, apronStub, DHC8)).toMatch(/closed/i);
  });

  it('refuses a 777 on stand 2 at the stand itself', () => {
    expectRefused(quickestRouteFor(kilo, B777, at('STAND 2'), at('HS 27 E')), /STAND 2/);
  });

  it('routes an A320 around the closed apron stub rather than through it', () => {
    const route = quickestRouteFor(kilo, A320, at('STAND 1'), at('GA'));
    expectValidRoute(kilo, route);
    expect(route.ok).toBe(true);
    expect(route.nodes).not.toContain(at('P0'));
  });

  it('filters while searching, not afterwards', () => {
    // If you filtered a finished route you would refuse this one, because the
    // unrestricted best route for an arrival uses D -- which is fine for the
    // DHC8 and would be refused for something wider.  Both must get a route.
    for (const ac of [A320, DHC8]) {
      const route = quickestRouteFor(kilo, ac, at('CR'), at('STAND 1'));
      expectValidRoute(kilo, route);
      expect(route.ok).toBe(true);
    }
  });

  it('gives a reason a human can act on when there is no route', () => {
    const route = quickestRouteFor(kilo, B777, at('STAND 2'), at('HS 27 E'));
    expectRefused(route);
    expect(route.refusal.length).toBeGreaterThan(30);
    expect(route.refusal).toMatch(/B777/);
  });

  it('is still the quickest route, for an aircraft that fits everywhere', () => {
    const route = quickestRouteFor(kilo, DHC8, at('STAND 2'), at('HS 27 E'));
    expectValidRoute(kilo, route);
    expect(route.seconds).toBeCloseTo(295.33, 1);
    expect(ways(kilo, route)).toContain('RWY 09/27');
  });
});
