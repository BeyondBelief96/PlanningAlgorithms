// Reference solution -- Problem 15: the table for a fixed number of moves.
//
// Every search so far answered "what should this aeroplane do?".  This answers
// a much better question: "what should an aeroplane at EVERY place do?" -- and
// it does it by filling in a table rather than by searching.
//
// The whole idea is one line:
//
//     stillToGo(place, k moves left) = min over moves of
//                                        [ minutes for the move
//                                          + stillToGo(where it leads, k - 1) ]
//
// started from a boundary row that says: with no moves left, being at the
// holding position costs nothing and being anywhere else is impossible.
//
// One sweep over every place per row, K rows: K x places x moves of work,
// against moves^K for enumerating routes.
//
// Note what the fixed budget does.  There is no "and stop" here, so a route
// must use EXACTLY K moves -- which is why the aeroplane sometimes has to sit
// at the stand burning one.  Problem 17 takes the budget away.
//
// [book] LaValle Section 2.3.1.1, equation (2.11), from G*_F = l_F.

import {
  type MinuteTable,
  refuseSchedule,
  scheduleFromMoves,
  type TaxiNetwork,
  type TaxiSchedule,
  UNREACHABLE_MINUTES,
} from '../chart/index.js';

export function minutesToGo(net: TaxiNetwork, moves: number): MinuteTable {
  const n = net.numPlaces;
  const rows: MinuteTable = [];

  // Row 0 is the boundary: zero where the taxi may finish, infinity elsewhere.
  let current: number[] = [];
  for (let p = 0; p < n; ++p) current.push(net.finalMinutes(p));
  rows.push([...current]);

  // Row r is "r moves left".
  for (let r = 1; r <= moves; ++r) {
    const nextRow = new Array<number>(n).fill(UNREACHABLE_MINUTES);
    for (let p = 0; p < n; ++p) {
      for (const move of net.movesFrom(p)) {
        // Guard the infinity: inf + anything is inf, and inf - inf is where a
        // table quietly fills with NaN.
        if (current[move.to] === UNREACHABLE_MINUTES) continue;
        nextRow[p] = Math.min(nextRow[p]!, move.minutes + current[move.to]!);
      }
    }
    rows.push([...nextRow]);
    current = nextRow;
  }
  return rows;
}

export function scheduleFromTable(net: TaxiNetwork, table: MinuteTable): TaxiSchedule {
  const K = table.length - 1;
  if (K < 0) return refuseSchedule('an empty table implies no taxi');

  const start = net.start;
  const top = table[K]!;
  if (top[start] === UNREACHABLE_MINUTES || top[start] === undefined)
    return refuseSchedule(
      `no taxi of exactly ${K} move(s) from ${net.placeName(start)}`,
    );

  const moves: number[] = [];
  let at = start;
  // At step k the aeroplane needs the row for "K - k moves left".
  for (let k = 1; k <= K; ++k) {
    const nextValues = table[K - k]!;
    let best = UNREACHABLE_MINUTES;
    let choice = -1;
    for (const move of net.movesFrom(at)) {
      const onward = nextValues[move.to];
      if (onward === undefined || onward === UNREACHABLE_MINUTES) continue;
      const candidate = move.minutes + onward;
      if (candidate < best) {
        best = candidate;
        choice = move.index;
      }
    }
    if (choice < 0) return refuseSchedule('the table promised a taxi the moves do not support');
    moves.push(choice);
    at = net.movesFrom(at)[choice]!.to;
  }
  return scheduleFromMoves(net, start, moves);
}
