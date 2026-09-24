import { describe, expect, it } from 'vitest';
import {
  a320,
  b777,
  deg,
  kiloAirport,
  type ZoneLayer,
} from '../../src/airport/index.js';
import { impl, implName } from './impl.js';

const kilo = (): ZoneLayer => kiloAirport().zones;
const { zoneAt, classifyFootprint, configurationSpace } = impl;

describe(`ex01 the zone layer (${implName})`, () => {
  it('reports the obvious places', () => {
    expect(zoneAt(kilo(), { x: 290, y: 95 }).zone).toBe('stand');
    expect(zoneAt(kilo(), { x: 300, y: 200 }).zone).toBe('apron');
    expect(zoneAt(kilo(), { x: 800, y: 200 }).zone).toBe('taxiway');
    expect(zoneAt(kilo(), { x: 1200, y: 500 }).zone).toBe('runway');
    expect(zoneAt(kilo(), { x: 680, y: 280 }).zone).toBe('deicing');
    expect(zoneAt(kilo(), { x: 300, y: 20 }).zone).toBe('forbidden');
    expect(zoneAt(kilo(), { x: 800, y: 220 }).zone).toBe('shoulder');
    expect(zoneAt(kilo(), { x: 5000, y: 5000 }).zone).toBe('unknown');
  });

  it('lets the most restrictive polygon win', () => {
    // Taxiway B runs straight across runway 18/36.  Where they overlap it is a
    // runway, and the protected strip either side is a protected area -- not a
    // taxiway that happens to have a runway drawn on it.
    expect(zoneAt(kilo(), { x: 1450, y: 400 }).zone).toBe('taxiway');
    expect(zoneAt(kilo(), { x: 1550, y: 400 }).zone).toBe('runwayProtected');
    expect(zoneAt(kilo(), { x: 1600, y: 400 }).zone).toBe('runway');
    expect(zoneAt(kilo(), { x: 1650, y: 400 }).zone).toBe('runwayProtected');
    expect(zoneAt(kilo(), { x: 1700, y: 400 }).zone).toBe('taxiway');

    // A taxiway shoulder that runs under taxiway C is still taxiway where C is.
    expect(zoneAt(kilo(), { x: 1800, y: 420 }).zone).toBe('taxiway');
  });

  it('takes flags from overlays and never the zone', () => {
    const hotspot = zoneAt(kilo(), { x: 1000, y: 400 });
    expect(hotspot.zone).toBe('taxiway');
    expect(hotspot.hotspot).toBe(true);
    expect(hotspot.closed).toBe(false);

    const closed = zoneAt(kilo(), { x: 120, y: 200 });
    expect(closed.zone).toBe('apron');
    expect(closed.closed).toBe(true);

    const plain = zoneAt(kilo(), { x: 300, y: 200 });
    expect(plain.hotspot).toBe(false);
    expect(plain.closed).toBe(false);
  });

  it('names the polygon it used', () => {
    const q = zoneAt(kilo(), { x: 290, y: 95 });
    expect(q.polygonId).toBeGreaterThanOrEqual(0);
    expect(kilo().polygon(q.polygonId).name).toBe('STAND 2');
  });

  it('puts a parked aircraft consistently in its stand', () => {
    const f = classifyFootprint(kilo(), a320(), { p: { x: 290, y: 95 }, heading: deg(90) });
    expect(f.gearConsistent).toBe(true);
    expect(f.allGearLoadBearing).toBe(true);
    expect(f.gearZone).toBe('stand');
    expect(f.wingtipViolation).toBe(false);
    expect(f.reference.zone).toBe('stand');
  });

  it('catches with the footprint what the reference point misses', () => {
    // Main gear centre two metres north of the taxiway edge.  The reference
    // point alone says "shoulder", which sounds survivable; the footprint says
    // one tyre is on the taxiway and one is not, which is the real problem.
    const f = classifyFootprint(kilo(), a320(), { p: { x: 800, y: 218 }, heading: 0 });
    expect(f.reference.zone).toBe('shoulder');
    expect(f.gearConsistent).toBe(false);
    expect(f.allGearLoadBearing).toBe(false);
    expect(f.gearZone).toBe('unknown');
  });

  it('lets a wing overhang a shoulder', () => {
    // Eight metres of wing over the shoulder is normal taxiing; shoulders are
    // built for exactly that.  Only structures make a wingtip a violation.
    const f = classifyFootprint(kilo(), a320(), { p: { x: 800, y: 206 }, heading: deg(8) });
    expect(f.gearConsistent).toBe(true);
    expect(f.allGearLoadBearing).toBe(true);
    expect(f.gearZone).toBe('taxiway');
    expect(f.leftWingtip.zone).toBe('shoulder');
    expect(f.wingtipViolation).toBe(false);
  });

  it('shrinks in configuration space what you stand on', () => {
    const cspace = configurationSpace(kilo(), a320());
    // Stand 2 is x in [260, 320]; the error budget is 4 m, so the C-space stand
    // is x in [264, 316].  A point two metres inside the real stand is outside
    // the configuration-space one.
    expect(zoneAt(kilo(), { x: 262, y: 95 }).zone).toBe('stand');
    expect(zoneAt(cspace, { x: 262, y: 95 }).zone).not.toBe('stand');
    expect(zoneAt(cspace, { x: 290, y: 95 }).zone).toBe('stand');
  });

  it('grows in configuration space what you must stay out of', () => {
    const cspace = configurationSpace(kilo(), a320());
    // The terminal ends at y = 40.  Grown by half a wingspan plus the code C
    // separation it reaches y = 62.4, which swallows the south end of stand 2 --
    // correctly, because a reference point there puts a wingtip in the building.
    expect(zoneAt(kilo(), { x: 300, y: 55 }).zone).toBe('stand');
    expect(zoneAt(cspace, { x: 300, y: 55 }).zone).toBe('forbidden');
    expect(zoneAt(cspace, { x: 300, y: 100 }).zone).toBe('stand');
  });

  it('keeps the holding positions where they are', () => {
    const cspace = configurationSpace(kilo(), a320());
    expect(cspace.holdShortLines.length).toBe(kilo().holdShortLines.length);
    expect(cspace.holdShortLines[0]!.segment.a.x).toBeCloseTo(
      kilo().holdShortLines[0]!.segment.a.x,
      9,
    );
  });

  it('collapses a taxiway a wingspan cannot hold', () => {
    // Taxiway A is 30 m wide.  A 777 needs so much margin that the shrunken
    // polygon inverts, and offsetConvex() hands back nothing rather than
    // nonsense -- which is how "this aircraft does not fit here" is spelled.
    const huge = { ...b777(), gearMargin: 20.0 };
    const cspace = configurationSpace(kilo(), huge);
    expect(zoneAt(cspace, { x: 800, y: 200 }).zone).not.toBe('taxiway');
  });
});
