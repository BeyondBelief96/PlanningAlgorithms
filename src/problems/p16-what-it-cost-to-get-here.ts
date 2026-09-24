// Problem 16 -- The same table, forwards.
// Brief: docs/taxi/p16-what-it-cost-to-get-here.md

import { type MinuteTable, type TaxiNetwork, UNREACHABLE_MINUTES } from '../chart/index.js';

export function minutesSpent(net: TaxiNetwork, moves: number): MinuteTable {
  // TODO(you): the mirror of Problem 15.
  //
  //   row 0    zero where the aeroplane is now, infinity everywhere else
  //   row k    for each place, the best over the moves ARRIVING there of
  //                row(k-1)[move.from] + move.minutes
  //
  // Two things change from Problem 15, and both are worth noticing.
  //
  // The boundary row is about where the aeroplane IS, not where it is going.
  //
  // And the sweep needs net.movesTo() rather than net.movesFrom().  On a
  // network with a one-way move those are different lists, and a forward table
  // built from the wrong one is wrong in a way that looks entirely plausible.
  //
  // The deeper point, and the thing the test checks: this table says nothing
  // whatever about the destination.  Re-clear the aircraft somewhere else and
  // every row is identical.
  void net;
  void moves;
  void UNREACHABLE_MINUTES;
  return [];
}
