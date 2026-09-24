import { describe, expect, it } from 'vitest';
import { bypassTaxi, departureTaxi, UNREACHABLE_MINUTES as INF } from '../src/chart/index.js';
import { expectRow, expectValidSchedule } from './fixtures.js';
import { impl } from './impl.js';

const { minutesToGo, scheduleFromTable } = impl;

// The departure taxi with a hard four-move budget.  Read a row as "if I have
// exactly this many moves left, what is the cheapest I can be holding short
// for, starting from each place?"  Infinity means "not from there, not in that
// many moves".
//
// Columns are STAND 2, APRON, TWY A, HS 27 E, RWY 27.
// [book] These rows are LaValle Figure 2.9, in column order a b c d e.
describe('p15 the table for a fixed number of moves', () => {
  // --- the examples in the brief ------------------------------------------

  it('fills the table row by row', () => {
    const table = minutesToGo(departureTaxi(), 4);
    expect(table.length).toBe(5);
    expectRow(table[0], [INF, INF, INF, 0, INF]); // 0 left: only HS 27 E will do
    expectRow(table[1], [INF, 4, 1, INF, INF]); //   1 move left
    expectRow(table[2], [6, 2, INF, 2, INF]); //      2 moves left
    expectRow(table[3], [4, 6, 3, INF, INF]); //      3 moves left
    expectRow(table[4], [6, 4, 5, 4, INF]); //        4 moves left: the one we use
  });

  it('is worthless to be where you want to be if you still owe four moves', () => {
    // With a fixed budget there is no "and stop".  An aeroplane already holding
    // short of 27 with one move left has to spend it, and nothing it can do
    // brings it back to the holding position -- there is no loop through
    // HS 27 E of the right length.  Hence infinity in a column that contains
    // the destination.  Problem 17 is what fixes this.
    const net = departureTaxi();
    const table = minutesToGo(net, 4);
    const hold = net.find('HS 27 E');
    expect(table[0]![hold]).toBe(0);
    expect(table[1]![hold]).toBe(INF);
  });

  it('spends exactly the budget', () => {
    const net = departureTaxi();
    const schedule = scheduleFromTable(net, minutesToGo(net, 4));
    expectValidSchedule(net, schedule);
    expect(schedule.ok).toBe(true);
    expect(schedule.moves.length).toBe(4);
    // Six minutes, not four.  The quick way out is three moves, so to spend a
    // budget of exactly four the aeroplane holds at the stand for two minutes
    // first and then taxis.  Padding is not free, which is the honest reason
    // nobody plans a taxi with a fixed move count.
    expect(schedule.minutes).toBe(6);
  });

  it('refuses a budget too small to make', () => {
    const net = departureTaxi();
    expect(scheduleFromTable(net, minutesToGo(net, 1)).ok).toBe(false);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('has a boundary row that is just "where may I stop"', () => {
    const net = departureTaxi();
    const table = minutesToGo(net, 0);
    expect(table.length).toBe(1);
    for (let p = 0; p < net.numPlaces; ++p) expect(table[0]![p]).toBe(net.finalMinutes(p));
  });

  it('never lets an infinity leak into the arithmetic', () => {
    // RWY 27 has no moves out of it, so every entry in its column is infinity
    // for ever.  One unguarded addition or subtraction turns the whole table
    // into NaN, and NaN compares false against everything -- so the table looks
    // plausible and every route it produces is wrong.
    const net = departureTaxi();
    const runway = net.find('RWY 27');
    for (const row of minutesToGo(net, 6)) {
      expect(row[runway]).toBe(INF);
      for (const v of row) expect(Number.isNaN(v)).toBe(false);
    }
  });

  it('agrees with the other end on the route choice', () => {
    // The bypass network: stand 1 to HS 36 W, four moves through TWY B for ten
    // minutes.  [book] Exercise 1, on Figure 2.21.
    const net = bypassTaxi();
    expect(minutesToGo(net, 4)[4]![net.find('STAND 1')]).toBe(10);
  });

  it('gets more expensive, not cheaper, when the budget is too large', () => {
    // A bigger budget cannot help: the aeroplane still has to spend it.  On the
    // bypass network five moves costs more than four, which is exactly the
    // thing Problem 17 removes.
    const net = bypassTaxi();
    const four = minutesToGo(net, 4)[4]![net.find('STAND 1')]!;
    const five = minutesToGo(net, 5)[5]![net.find('STAND 1')]!;
    expect(five).toBeGreaterThan(four);
  });
});
