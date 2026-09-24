// Reference solution -- Problem 17: taking the budget away.
//
// Letting the aeroplane STOP does all the work.
//
// Stopping keeps it where it is and adds no minutes, so a two-move taxi padded
// out to five moves costs exactly the same.  That makes "best taxi of exactly K
// moves" equal to "best taxi of at most K moves", and once the sweeps stop
// changing anything the budget has effectively become unbounded:
//
//     stillToGo(place) = min( 0 if the taxi may finish here, else infinity,
//                             min over moves of
//                                 [ minutes + stillToGo(where it leads) ] )
//
// What comes out is not a route.  It is an instruction for every place on the
// aerodrome, which is the whole reason this problem exists -- and it is exactly
// what Problem 09 followed and what the capstone replans against.
//
// [book] LaValle Section 2.3.2.  The stop option is the termination action u_T
// and the recurrence is (2.18).

import {
  NO_MOVE,
  refuseSchedule,
  scheduleFromMoves,
  STOP,
  type TaxiNetwork,
  type TaxiSchedule,
  UNREACHABLE_MINUTES,
} from '../chart/index.js';
import type { SettledSpend, SettledTaxi } from '../problems/types.js';

function sameRow(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; ++i) {
    const x = a[i]!;
    const y = b[i]!;
    if (x === UNREACHABLE_MINUTES || y === UNREACHABLE_MINUTES) {
      if (x !== y) return false;
    } else if (Math.abs(x - y) > 1e-12) {
      return false;
    }
  }
  return true;
}

export function settleMinutesToGo(net: TaxiNetwork): SettledTaxi {
  const n = net.numPlaces;
  const history: number[][] = [];

  let current: number[] = [];
  for (let p = 0; p < n; ++p) current.push(net.finalMinutes(p));
  history.push([...current]);

  let sweeps = 0;
  for (;;) {
    const nextRow = new Array<number>(n).fill(UNREACHABLE_MINUTES);
    for (let p = 0; p < n; ++p) {
      // The stop option: finish here and collect the final cost.
      let best = net.finalMinutes(p);
      for (const move of net.movesFrom(p)) {
        if (current[move.to] === UNREACHABLE_MINUTES) continue;
        best = Math.min(best, move.minutes + current[move.to]!);
      }
      nextRow[p] = best;
    }
    ++sweeps;

    if (sameRow(nextRow, current)) break; // settled: do not record a duplicate
    if (sweeps >= 1000)
      throw new RangeError(
        'settleMinutesToGo: the numbers never settled; somewhere a move must cost less than nothing',
      );
    history.push([...nextRow]);
    current = nextRow;
  }

  // Recover the advice.  Ties go to STOP, so a place where the taxi is already
  // finished says stop rather than wandering off and coming back for the same
  // number of minutes.
  const advice = new Array<number>(n).fill(NO_MOVE);
  for (let p = 0; p < n; ++p) {
    if (current[p] === UNREACHABLE_MINUTES) continue;
    let best = net.finalMinutes(p);
    let choice = best === UNREACHABLE_MINUTES ? NO_MOVE : STOP;
    for (const move of net.movesFrom(p)) {
      if (current[move.to] === UNREACHABLE_MINUTES) continue;
      const candidate = move.minutes + current[move.to]!;
      if (candidate < best - 1e-12) {
        best = candidate;
        choice = move.index;
      }
    }
    advice[p] = choice;
  }

  return { minutes: current, advice, sweeps, history };
}

export function settleMinutesSpent(net: TaxiNetwork): SettledSpend {
  const n = net.numPlaces;
  const history: number[][] = [];

  let current = new Array<number>(n).fill(UNREACHABLE_MINUTES);
  current[net.start] = 0;
  history.push([...current]);

  let sweeps = 0;
  for (;;) {
    const nextRow = new Array<number>(n).fill(UNREACHABLE_MINUTES);
    for (let p = 0; p < n; ++p) {
      // Stopping forwards means "we already got here and stayed", so the old
      // value competes with every one-move extension that lands on p.
      let best = current[p]!;
      for (const move of net.movesTo(p)) {
        if (current[move.from] === UNREACHABLE_MINUTES) continue;
        best = Math.min(best, current[move.from]! + move.minutes);
      }
      nextRow[p] = best;
    }
    ++sweeps;

    if (sameRow(nextRow, current)) break;
    if (sweeps >= 1000)
      throw new RangeError(
        'settleMinutesSpent: the numbers never settled; somewhere a move must cost less than nothing',
      );
    history.push([...nextRow]);
    current = nextRow;
  }
  return { minutes: current, sweeps, history };
}

export function scheduleFromAdvice(
  net: TaxiNetwork,
  settled: SettledTaxi,
  from: number = net.start,
): TaxiSchedule {
  if (from < 0 || from >= net.numPlaces)
    return refuseSchedule('that is not a place on this network');
  if (settled.minutes[from] === UNREACHABLE_MINUTES)
    return refuseSchedule(`the taxi cannot be completed from ${net.placeName(from)}`);

  const moves: number[] = [];
  let at = from;
  // An optimal taxi never revisits a place when every move costs something, so
  // numPlaces steps is a generous bound and a cheap loop guard.
  for (let step = 0; step <= net.numPlaces; ++step) {
    const advice = settled.advice[at];
    if (advice === STOP) return scheduleFromMoves(net, from, moves);
    if (advice === undefined || advice === NO_MOVE) break;
    const move = net.movesFrom(at)[advice];
    if (!move) break;
    moves.push(advice);
    at = move.to;
  }
  return refuseSchedule(
    `the advice ran out at ${net.placeName(at)}, which is not where the taxi finishes`,
  );
}
