import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { A320, DHC8, at, expectValidRoute, kilo, ways } from './fixtures.js';
import { UNREACHABLE } from '../src/chart/index.js';

const { closureCost, quickestRouteFor, withTaxiwayClosed } = impl;

describe('p10 Bravo is closed', () => {
  // --- the examples in the brief ------------------------------------------

  it('closing Delta costs an A320 nothing, because Foxtrot goes the same way', () => {
    const d = closureCost(kilo, A320, at('STAND 2'), at('HS 27 E'), 'D');
    expect(d.before.ok).toBe(true);
    expect(d.after.ok).toBe(true);
    expectValidRoute(kilo, d.after);
    expect(d.delaySeconds).toBeCloseTo(0, 6);
    expect(ways(kilo, d.after)).not.toContain('D');
  });

  it('closing Bravo costs it everything', () => {
    const d = closureCost(kilo, A320, at('STAND 2'), at('HS 27 E'), 'B');
    expect(d.before.ok).toBe(true);
    expect(d.after.ok).toBe(false);
    expect(d.delaySeconds).toBe(UNREACHABLE);
  });

  it('closing Foxtrot AND Delta strands the A320, and the reason names Delta', () => {
    const withoutF = withTaxiwayClosed(kilo, 'F');
    const d = closureCost(withoutF, A320, at('STAND 2'), at('HS 27 E'), 'D');
    expect(d.after.ok).toBe(false);
    expect(d.after.refusal).toMatch(/D/);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('leaves the original chart alone', () => {
    // The tests close a taxiway and then keep using the chart.  A withTaxiwayClosed
    // that mutates its argument breaks every test after it, in ways that look
    // like a bug in something else entirely.
    withTaxiwayClosed(kilo, 'B');
    withTaxiwayClosed(kilo, 'F');
    const route = quickestRouteFor(kilo, A320, at('STAND 2'), at('HS 27 E'));
    expect(route.ok).toBe(true);
    expect(kilo.links.filter((l) => l.closed).length).toBe(1); // only the apron stub
  });

  it('closes every leg of the taxiway, not just the first', () => {
    const closed = withTaxiwayClosed(kilo, 'B');
    for (const l of closed.links) if (l.taxiway === 'B') expect(l.closed).toBe(true);
  });

  it('a closure that changes nothing is reported as no delay, not as a refusal', () => {
    const d = closureCost(kilo, A320, at('STAND 2'), at('DEICE PAD'), 'E');
    expect(d.after.ok).toBe(true);
    expect(d.delaySeconds).toBeCloseTo(0, 6);
  });

  it('closing a taxiway that does not exist changes nothing', () => {
    const d = closureCost(kilo, A320, at('STAND 2'), at('HS 27 E'), 'ZULU');
    expect(d.after.ok).toBe(true);
    expect(d.delaySeconds).toBeCloseTo(0, 6);
  });

  it('reports the same closure differently for a different aeroplane', () => {
    // Both are stranded by F-and-D here, but the DHC8's refusal names its own
    // type -- the message has to be about the aeroplane that asked.
    const withoutF = withTaxiwayClosed(kilo, 'F');
    const jet = closureCost(withoutF, A320, at('STAND 2'), at('HS 27 E'), 'D');
    const prop = closureCost(withoutF, DHC8, at('STAND 2'), at('HS 27 E'), 'D');
    expect(jet.after.refusal).toMatch(/A320/);
    expect(prop.after.refusal).toMatch(/DHC8/);
  });
});
