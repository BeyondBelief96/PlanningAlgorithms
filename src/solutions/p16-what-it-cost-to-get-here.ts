// Reference solution -- Problem 16: the same table, forwards.
//
// The mirror of Problem 15:
//
//     alreadySpent(place, after k + 1 moves) =
//         min over moves ARRIVING here of
//             [ alreadySpent(where it came from, after k) + minutes for the move ]
//
// Two things change, and both are worth noticing.
//
// The boundary row is now about where the aeroplane IS rather than where it is
// going: zero at the stand, infinity everywhere else.
//
// And the sweep needs movesTo() rather than movesFrom() -- how a place is
// reached, not where it leads.  On a network with one-way moves those are
// different lists, and a forward table built from the wrong one is wrong in a
// way that looks entirely plausible.
//
// The deeper point: this table says nothing whatever about where the aeroplane
// is going.  What it cost to get somewhere depends on the aerodrome and where
// you started, not on the clearance.  Re-clear the aircraft to a different
// destination and every row is unchanged.  That asymmetry is the whole
// difference between this table and Problem 15's, and it is why the backward
// form is the one people reach for.
//
// [book] LaValle Section 2.3.1.2, equation (2.16).

import { type MinuteTable, type TaxiNetwork, UNREACHABLE_MINUTES } from '../chart/index.js';

export function minutesSpent(net: TaxiNetwork, moves: number): MinuteTable {
  const n = net.numPlaces;
  const rows: MinuteTable = [];

  let current = new Array<number>(n).fill(UNREACHABLE_MINUTES);
  current[net.start] = 0;
  rows.push([...current]);

  for (let k = 1; k <= moves; ++k) {
    const nextRow = new Array<number>(n).fill(UNREACHABLE_MINUTES);
    for (let p = 0; p < n; ++p) {
      for (const move of net.movesTo(p)) {
        if (current[move.from] === UNREACHABLE_MINUTES) continue;
        nextRow[p] = Math.min(nextRow[p]!, current[move.from]! + move.minutes);
      }
    }
    rows.push([...nextRow]);
    current = nextRow;
  }
  return rows;
}
