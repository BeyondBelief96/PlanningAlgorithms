import { describe, expect, it } from 'vitest';
import {
  bypassTaxi,
  departureTaxi,
  NO_MOVE,
  STOP,
  UNREACHABLE_MINUTES as INF,
} from '../src/chart/index.js';
import { expectRow, expectValidSchedule } from './fixtures.js';
import { impl } from './impl.js';

const { scheduleFromAdvice, settleMinutesSpent, settleMinutesToGo } = impl;

// The departure taxi with the move budget removed: an aeroplane that is already
// holding short is allowed to simply stop.  Now each row says "the cheapest
// taxi time from here to holding short of 27, using as many moves as it takes",
// and the rows stop changing once that is settled.
//
// Columns are STAND 2, APRON, TWY A, HS 27 E, RWY 27.
// [book] LaValle Example 2.5 and Figure 2.14, in column order a b c d e.
describe('p17 taking the budget away', () => {
  // --- the examples in the brief ------------------------------------------

  it('settles after three sweeps', () => {
    const settled = settleMinutesToGo(departureTaxi());
    expect(settled.history.length).toBe(4);
    expectRow(settled.history[0], [INF, INF, INF, 0, INF]); // only the hold is free
    expectRow(settled.history[1], [INF, 4, 1, 0, INF]); //     one move out
    expectRow(settled.history[2], [6, 2, 1, 0, INF]); //       two moves out
    expectRow(settled.history[3], [4, 2, 1, 0, INF]); //       settled
    expectRow(settled.minutes, [4, 2, 1, 0, INF]); //  four minutes from the stand
    expect(settled.sweeps).toBe(4);
  });

  it('leaves the runway infinite, because there is no way back', () => {
    // An infinite entry is not a failure of the algorithm.  It is the planner
    // saying, correctly, that from here the clearance cannot be complied with
    // -- and the advice has nothing to offer rather than something bad.
    const net = departureTaxi();
    const settled = settleMinutesToGo(net);
    expect(settled.minutes[net.find('RWY 27')]).toBe(INF);
    expect(settled.advice[net.find('RWY 27')]).toBe(NO_MOVE);
  });

  it('says stop at the holding position', () => {
    // The one instruction the aeroplane must not improvise past.
    const net = departureTaxi();
    expect(settleMinutesToGo(net).advice[net.find('HS 27 E')]).toBe(STOP);
  });

  it('gives the best taxi when the advice is followed from the stand', () => {
    // From STAND 2 the choice is: push back, at 2 + 2 = 4 minutes, or hold at
    // the stand, at 2 + 4 = 6.  Waiting is never free.
    const net = departureTaxi();
    const schedule = scheduleFromAdvice(net, settleMinutesToGo(net));
    expectValidSchedule(net, schedule);
    expect(schedule.ok).toBe(true);
    expect(schedule.minutes).toBe(4);
    expect(schedule.moves.length).toBe(3);
  });

  it('settles forwards too', () => {
    // The same, counted forwards from an aeroplane already on the apron.
    // [book] Figure 2.15, forward value iteration from x_I = b.
    const net = departureTaxi();
    net.start = net.find('APRON');
    const settled = settleMinutesSpent(net);
    expect(settled.history.length).toBe(4);
    expectRow(settled.history[0], [INF, 0, INF, INF, INF]); // where it stands now
    expectRow(settled.history[1], [INF, 0, 1, 4, INF]); //     one move
    expectRow(settled.history[2], [2, 0, 1, 2, 5]); //         two moves
    expectRow(settled.history[3], [2, 0, 1, 2, 3]); //         settled
    expectRow(settled.minutes, [2, 0, 1, 2, 3]);
    expect(settled.sweeps).toBe(4);
  });

  it('meets in the middle on the route choice', () => {
    // The bypass network, both ways to stationarity.  One reads "minutes still
    // to go", the other "minutes already spent", and they must agree.
    // [book] Exercise 1, on Figure 2.21.
    const net = bypassTaxi();
    const backward = settleMinutesToGo(net);
    const forward = settleMinutesSpent(net);

    expectRow(backward.minutes, [10, 8, 4, 1, 0]);
    expectRow(forward.minutes, [0, 2, 6, 9, 10]);
    expect(backward.minutes[net.find('STAND 1')]).toBe(forward.minutes[net.find('HS 36 W')]);

    const schedule = scheduleFromAdvice(net, backward);
    expectValidSchedule(net, schedule);
    expect(schedule.minutes).toBe(10);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('is an answer for every place, not a route from one', () => {
    // This is the whole point.  Start the aeroplane anywhere and the advice is
    // already there -- no search, just a lookup, repeated.  It is what
    // Problem 09 followed and what the capstone replans against.
    const net = departureTaxi();
    const settled = settleMinutesToGo(net);
    for (const place of ['STAND 2', 'APRON', 'TWY A', 'HS 27 E']) {
      const schedule = scheduleFromAdvice(net, settled, net.find(place));
      expectValidSchedule(net, schedule);
      expect(schedule.ok, place).toBe(true);
      expect(schedule.minutes).toBe(settled.minutes[net.find(place)]);
    }
  });

  it('refuses from a place the taxi cannot be completed from', () => {
    const net = departureTaxi();
    const settled = settleMinutesToGo(net);
    expect(scheduleFromAdvice(net, settled, net.find('RWY 27')).ok).toBe(false);
  });

  it('breaks the tie at the holding position towards stopping', () => {
    // HS 27 E can reach itself again for two minutes, via TWY A and back.  Both
    // cost more than nothing, but a naive comparison that prefers a move on a
    // tie sends the aeroplane for a lap of the taxiway before it stops.
    const net = departureTaxi();
    const settled = settleMinutesToGo(net);
    const schedule = scheduleFromAdvice(net, settled, net.find('HS 27 E'));
    expect(schedule.ok).toBe(true);
    expect(schedule.moves).toHaveLength(0);
  });

  it('never lets the budget make things worse', () => {
    // Problem 15's answer from the stand was six minutes with a budget of four.
    // Taking the budget away can only help, and here it takes two minutes off.
    const net = departureTaxi();
    expect(settleMinutesToGo(net).minutes[net.start]).toBe(4);
  });
});
