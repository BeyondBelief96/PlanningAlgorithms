import { describe, expect, it } from 'vitest';
import { a320, b777, reversed } from '../../src/airport/index.js';
import { allowsEdge, blockReason } from '../../src/capstone/types.js';
import { AT_STAND_2, DEPARTURE, Fixture } from './fixture.js';
import { impl, implName } from './impl.js';

describe(`ex05 the graph filter (${implName})`, () => {
  it('keeps an ordinary taxiway edge in both directions', () => {
    const f = new Fixture();
    const east = f.directed('A', { x: 680, y: 200 }, { x: 1000, y: 200 });
    expect(allowsEdge(f.filter, east)).toBe(true);
    expect(allowsEdge(f.filter, reversed(east))).toBe(true);
  });

  it('blocks a one-way taxiway the other way', () => {
    const f = new Fixture();
    const north = f.directed('F', { x: 1000, y: 200 }, { x: 1000, y: 400 });
    expect(allowsEdge(f.filter, north)).toBe(true);
    expect(allowsEdge(f.filter, reversed(north))).toBe(false);
    expect(
      blockReason(f.filter, reversed(north)),
      'every blocked edge needs a reason a human can read',
    ).not.toBe('');
  });

  it('blocks a closed edge both ways', () => {
    const f = new Fixture();
    const west = f.directed('APRON', { x: 170, y: 200 }, { x: 110, y: 200 });
    expect(allowsEdge(f.filter, west)).toBe(false);
    expect(allowsEdge(f.filter, reversed(west))).toBe(false);
  });

  it('blocks a taxiway a wingspan does not fit on, and says which limit', () => {
    const wide = new Fixture(DEPARTURE, AT_STAND_2, b777());
    const east = wide.directed('A', { x: 680, y: 200 }, { x: 1000, y: 200 });
    expect(allowsEdge(wide.filter, east)).toBe(false);
    expect(blockReason(wide.filter, east)).toContain('wingspan');
  });

  it('blocks de-icing unless the mission asks for it', () => {
    const plain = new Fixture();
    const onto = plain.directed('DEICE', { x: 680, y: 235 }, { x: 680, y: 280 });
    expect(allowsEdge(plain.filter, onto)).toBe(false);

    const deiced = new Fixture(
      'TAXI TO RUNWAY 27 VIA A DEICE A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27',
    );
    const open = deiced.directed('DEICE', { x: 680, y: 235 }, { x: 680, y: 280 });
    expect(allowsEdge(deiced.filter, open)).toBe(true);
  });

  it('blocks the way in through an unauthorized hard gate', () => {
    // "Hold short of runway 27": the protected edge beyond the holding position
    // on taxiway E must be unreachable.
    const f = new Fixture();
    const inward = f.directed('E', { x: 2300, y: 425 }, { x: 2300, y: 475 });
    expect(allowsEdge(f.filter, inward)).toBe(false);
    expect(blockReason(f.filter, inward), 'name the gate that stopped it').toContain('crossing');
  });

  it('never blocks the way out through a hard gate', () => {
    // The same gate, travelled the other way.  An aeroplane that has just
    // landed has to be able to leave the runway without asking permission.
    const f = new Fixture();
    const outward = f.directed('E', { x: 2300, y: 475 }, { x: 2300, y: 425 });
    expect(allowsEdge(f.filter, outward)).toBe(true);
  });

  it('opens an authorized crossing in both directions', () => {
    const f = new Fixture();
    const east = f.directed('B', { x: 1525, y: 400 }, { x: 1575, y: 400 });
    expect(allowsEdge(f.filter, east)).toBe(true);
    expect(allowsEdge(f.filter, reversed(east))).toBe(true);
  });

  it('allows a square corner and refuses a reversal', () => {
    const f = new Fixture();
    const jet = a320();
    const alongA = f.directed('A', { x: 1000, y: 200 }, { x: 1400, y: 200 });
    const ontoD = f.directed('D', { x: 1400, y: 200 }, { x: 1400, y: 400 });

    expect(impl.turnIsFeasible(f.gated, alongA, ontoD, jet)).toBe(true);
    expect(
      impl.turnIsFeasible(f.gated, alongA, reversed(alongA), jet),
      'you cannot turn round on the spot',
    ).toBe(false);
    expect(
      impl.turnIsFeasible(f.gated, ontoD, alongA, jet),
      'these do not meet head to tail in this order',
    ).toBe(false);
  });

  it('needs room for the fillet at a corner', () => {
    // The stub of taxiway E between taxiway B and the holding position is
    // twenty-five metres long.  A 20 m turn radius fits a right angle into it
    // (20 * tan 45 = 20 m of straight either side); a 60 m radius does not, and
    // that is a route the aircraft cannot fly.
    const f = new Fixture();
    const alongB = f.directed('B', { x: 1800, y: 400 }, { x: 2300, y: 400 });
    const ontoE = f.directed('E', { x: 2300, y: 400 }, { x: 2300, y: 425 });

    expect(impl.turnIsFeasible(f.gated, alongB, ontoE, { ...a320(), minTurnRadius: 20 })).toBe(true);
    expect(impl.turnIsFeasible(f.gated, alongB, ontoE, { ...a320(), minTurnRadius: 60 })).toBe(false);
  });
});
