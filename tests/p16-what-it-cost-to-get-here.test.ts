import { describe, expect, it } from 'vitest';
import { bypassTaxi, departureTaxi, UNREACHABLE_MINUTES as INF } from '../src/chart/index.js';
import { expectRow } from './fixtures.js';
import { impl } from './impl.js';

const { minutesSpent, minutesToGo } = impl;

// The same departure taxi, read the other way round: "starting from stand 2,
// what is the cheapest I can be standing at each place after exactly k moves?"
//
// Columns are STAND 2, APRON, TWY A, HS 27 E, RWY 27.
// [book] LaValle Figure 2.12, the cost-to-come tables.
describe('p16 the same table, forwards', () => {
  // --- the examples in the brief ------------------------------------------

  it('fills the table row by row', () => {
    const table = minutesSpent(departureTaxi(), 4);
    expect(table.length).toBe(5);
    expectRow(table[0], [0, INF, INF, INF, INF]); // 0 moves: still on stand
    expectRow(table[1], [2, 2, INF, INF, INF]); //   1 move
    expectRow(table[2], [4, 4, 3, 6, INF]); //       2 moves
    expectRow(table[3], [4, 6, 5, 4, 7]); //         3 moves: holding short for 4
    expectRow(table[4], [6, 6, 5, 6, 5]); //         4 moves
  });

  it('does not care where the aeroplane is going', () => {
    // Re-clear the aircraft to a different destination and every row is
    // unchanged.  What it cost to get somewhere depends on where you started
    // and what the taxiways are, not on the clearance.
    //
    // That asymmetry is the whole difference between this table and Problem
    // 15's, and it is why the backward form is the one people reach for.
    const original = departureTaxi();
    const moved = departureTaxi();
    moved.finishes = [moved.find('APRON')];

    const a = minutesSpent(original, 4);
    const b = minutesSpent(moved, 4);
    expect(a.length).toBe(b.length);
    for (let k = 0; k < a.length; ++k) expectRow(a[k], b[k]!);
  });

  it('agrees with the backward table on the taxi time', () => {
    // The route choice: stand 1 to HS 36 W, four moves through TWY B for ten
    // minutes.  Counting forwards from the stand and counting backwards from
    // the holding point have to land on the same ten.
    //
    // [book] Exercise 1, on Figure 2.21.
    const net = bypassTaxi();
    expect(minutesSpent(net, 4)[4]![net.find('HS 36 W')]).toBe(10);
    expect(minutesToGo(net, 4)[4]![net.find('STAND 1')]).toBe(10);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('starts with a row about where the aeroplane is', () => {
    const net = departureTaxi();
    const table = minutesSpent(net, 0);
    expect(table.length).toBe(1);
    expect(table[0]![net.start]).toBe(0);
    for (let p = 0; p < net.numPlaces; ++p)
      if (p !== net.start) expect(table[0]![p]).toBe(INF);
  });

  it('asks how a place is reached, not where it leads', () => {
    // RWY 27 has no moves out of it, so a backward table never gives it a
    // finite number.  A forward table must: you can get there, you just cannot
    // get back.  Anyone who has built this sweep from movesFrom() instead of
    // movesTo() has a column of infinity here and a plausible-looking table.
    const net = departureTaxi();
    const runway = net.find('RWY 27');
    expect(minutesToGo(net, 4)[4]![runway]).toBe(INF);
    expect(minutesSpent(net, 4)[3]![runway]).toBe(7);
  });

  it('moves the whole table when the aeroplane starts somewhere else', () => {
    const net = departureTaxi();
    net.start = net.find('APRON');
    const table = minutesSpent(net, 2);
    expectRow(table[0], [INF, 0, INF, INF, INF]);
    expectRow(table[1], [INF, INF, 1, 4, INF]);
  });
});
