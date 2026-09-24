// Problem 15 -- The table for a fixed number of moves.
// Brief: docs/taxi/p15-a-fixed-budget.md

import {
  type MinuteTable,
  refuseSchedule,
  scheduleFromMoves,
  type TaxiNetwork,
  type TaxiSchedule,
  UNREACHABLE_MINUTES,
} from '../chart/index.js';

export function minutesToGo(net: TaxiNetwork, moves: number): MinuteTable {
  // TODO(you): fill in a table with one row per move budget and one column per
  // place, from the bottom up.
  //
  //   row 0    the boundary: net.finalMinutes(place) -- zero where the taxi may
  //            finish, infinity everywhere else
  //   row k    for each place, the best over its moves of
  //                move.minutes + row(k-1)[move.to]
  //
  // Return moves + 1 rows.  Row k means "with exactly k moves left".
  //
  // Guard the infinities.  `inf + 2` is inf, which is fine, but a row that
  // quietly fills with NaN is not, and one unguarded subtraction does it.
  //
  // There is no "and stop" here.  A taxi must use EXACTLY the budget, which is
  // why an aeroplane already at the holding position with moves left shows as
  // infinity -- there is no loop of the right length that brings it back.  That
  // is not a bug.  Problem 17 is what fixes it.
  void net;
  void moves;
  void UNREACHABLE_MINUTES;
  return [];
}

export function scheduleFromTable(net: TaxiNetwork, table: MinuteTable): TaxiSchedule {
  // TODO(you): read the taxi out of the table, from net.start.
  //
  // At step k the aeroplane needs the row for "K - k moves left", and takes
  // whichever move minimises move.minutes + thatRow[move.to].  Note that you
  // walk DOWN the rows as you go forwards: the budget is being spent.
  void net;
  void table;
  void scheduleFromMoves;
  return refuseSchedule('scheduleFromTable is not implemented yet');
}
