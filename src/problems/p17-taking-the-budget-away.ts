// Problem 17 -- Taking the budget away.
// Brief: docs/taxi/p17-taking-the-budget-away.md

import {
  NO_MOVE,
  refuseSchedule,
  scheduleFromMoves,
  STOP,
  type TaxiNetwork,
  type TaxiSchedule,
  UNREACHABLE_MINUTES,
} from '../chart/index.js';
import type { SettledSpend, SettledTaxi } from './types.js';

export function settleMinutesToGo(net: TaxiNetwork): SettledTaxi {
  // TODO(you): Problem 15's sweep, with ONE thing added and then repeated until
  // nothing changes.
  //
  // The thing added is STOP: an aeroplane that is already where it needs to be
  // may simply finish.  Stopping costs nothing and keeps it where it is, so a
  // two-move taxi padded out to five costs exactly the same -- which makes
  // "best taxi of exactly K moves" equal to "best taxi of at MOST K moves", and
  // once the sweeps settle the budget has effectively gone away.
  //
  //   minutes(place) = min( net.finalMinutes(place),
  //                         min over moves of
  //                             move.minutes + minutes(move.to) )
  //
  // Sweep until a whole row comes back identical, and report how many sweeps
  // that took.  Record every row in `history` -- watching it settle is most of
  // the value.  Throw if it never settles: on a taxi network that means a move
  // costs less than nothing.
  //
  // Then recover the ADVICE: at each place, the move that achieves the settled
  // number, STOP where finishing is at least as good, and NO_MOVE where there
  // is nothing legal to do at all.  Break ties towards STOP, or a place where
  // the taxi is already finished will wander off and come back for the same
  // number of minutes.
  //
  // What you have at the end is not a route.  It is an instruction for every
  // place on the aerodrome, which is the whole reason this problem exists.
  void net;
  void UNREACHABLE_MINUTES;
  void STOP;
  void NO_MOVE;
  return { minutes: [], advice: [], sweeps: 0, history: [] };
}

export function settleMinutesSpent(net: TaxiNetwork): SettledSpend {
  // TODO(you): the same treatment for Problem 16's forward table.  Stopping
  // forwards means "we already got here and stayed", so the current value
  // competes with every one-move extension that lands on the place.
  //
  // There is no advice to recover here.  Ask yourself why not before reading
  // the brief: it is the same asymmetry Problem 16 was about.
  void net;
  return { minutes: [], sweeps: 0, history: [] };
}

export function scheduleFromAdvice(
  net: TaxiNetwork,
  settled: SettledTaxi,
  from: number = net.start,
): TaxiSchedule {
  // TODO(you): follow the advice from `from` until it says STOP.  No search at
  // all -- this is a lookup, repeated.
  //
  // Bound the loop.  An optimal taxi never revisits a place when every move
  // costs something, so numPlaces steps is generous; a mistake in the sweep
  // above otherwise hangs the test run.
  //
  // If the advice runs out somewhere that is not where the taxi finishes, that
  // is a refusal, not a short route.
  void net;
  void settled;
  void from;
  void scheduleFromMoves;
  return refuseSchedule('scheduleFromAdvice is not implemented yet');
}
