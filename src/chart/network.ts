// The taxi as a handful of places and the minutes between them.
//
// Part of the *given* library.
//
// Problems 01 to 10 taxi around Kilo Field, where a leg is metres of concrete
// and a cost is seconds of arithmetic.  Problems 15 to 17 need something
// smaller: a sketch you can check by eye, with whole minutes on it, and with
// the two things a real chart does not have --
//
//   a move that leaves you where you are (holding at the stand, engines
//   running, burning a minute), and
//
//   a place you cannot leave (a runway you have entered: there is no legal
//   move that puts you back at the holding position).
//
// Both are what make the cost tables in those problems interesting, and both
// are perfectly real.  A chart of thirty thousand metres of pavement would
// obscure them.
//
// These two networks are LaValle's Figures 2.8 and 2.21 relabelled, edge for
// edge and cost for cost, so every number the book prints is a number your code
// still has to produce.

export const UNREACHABLE_MINUTES = Number.POSITIVE_INFINITY;

/** There is nothing legal to do here at all. */
export const NO_MOVE = -1;
/**
 * Stop: the taxi is finished at this place.  This is the one "action" that is
 * not a move, and Problem 17 is where it earns its keep -- without it, a table
 * has to spend its whole budget and an aeroplane already holding short is
 * obliged to drive off and come back.
 *
 * [book] the termination action u_T of Formulation 2.3.
 */
export const STOP = -2;

/** One thing the aeroplane can do from where it is. */
export interface TaxiMove {
  /** Its position in movesFrom(), which is how a plan names it. */
  readonly index: number;
  readonly from: number;
  readonly to: number;
  readonly minutes: number;
  /** What the crew would say they were doing.  "push back and start the taxi" */
  readonly says: string;
}

/** A move is named by the place it starts at and its index there. */
export interface ArrivingMove {
  readonly move: TaxiMove;
}

export class TaxiNetwork {
  readonly name: string;
  private readonly placeList: string[] = [];
  private readonly out: TaxiMove[][] = [];
  private readonly into: TaxiMove[][] = [];
  private startPlace = 0;
  private finishList: number[] = [];

  constructor(name: string, places: readonly string[], start: string, finishes: readonly string[]) {
    this.name = name;
    for (const p of places) {
      this.placeList.push(p);
      this.out.push([]);
      this.into.push([]);
    }
    this.startPlace = this.find(start);
    this.finishList = finishes.map((f) => this.find(f));
  }

  /** Adds a move.  Both names must already be places. */
  addMove(from: string, to: string, minutes: number, says: string): void {
    const a = this.find(from);
    const b = this.find(to);
    if (a < 0 || b < 0) throw new RangeError(`no such place on ${this.name}: ${from} -> ${to}`);
    const move: TaxiMove = { index: this.out[a]!.length, from: a, to: b, minutes, says };
    this.out[a]!.push(move);
    this.into[b]!.push(move);
  }

  get numPlaces(): number {
    return this.placeList.length;
  }

  get places(): readonly string[] {
    return this.placeList;
  }

  /** -1 when the name is not on this network. */
  find(name: string): number {
    return this.placeList.indexOf(name);
  }

  placeName(i: number): string {
    return this.placeList[i] ?? '?';
  }

  /** Where the aeroplane is now. */
  get start(): number {
    return this.startPlace;
  }

  set start(place: number) {
    this.startPlace = place;
  }

  /** Where the taxi is finished.  A departure taxi ends holding short. */
  get finishes(): readonly number[] {
    return this.finishList;
  }

  set finishes(places: readonly number[]) {
    this.finishList = [...places];
  }

  isFinished(place: number): boolean {
    return this.finishList.includes(place);
  }

  /**
   * Zero where the taxi may stop, infinity everywhere else.  This is the
   * boundary row of every table in Problems 15 to 17.
   */
  finalMinutes(place: number): number {
    return this.isFinished(place) ? 0 : UNREACHABLE_MINUTES;
  }

  /** What the aeroplane can do from here, in a fixed order. */
  movesFrom(place: number): readonly TaxiMove[] {
    return this.out[place] ?? [];
  }

  /**
   * Every move that ENDS here.  Note that this is a different question, and it
   * is the one a backward sweep asks: not "where can I go" but "how could I
   * have arrived".
   */
  movesTo(place: number): readonly TaxiMove[] {
    return this.into[place] ?? [];
  }

  move(place: number, index: number): TaxiMove | undefined {
    return this.out[place]?.[index];
  }
}

/**
 * The departure taxi.  An aeroplane on stand 2 has to reach the holding
 * position short of runway 27 at taxiway E.
 *
 *   STAND 2 --(2)-> STAND 2   hold at the stand, engines running
 *   STAND 2 --(2)-> APRON     push back and start the taxi
 *   APRON   --(1)-> TWY A     turn onto the parallel taxiway
 *   APRON   --(4)-> HS 27 E   the long way round, on the apron lanes
 *   TWY A   --(1)-> HS 27 E   up to the holding position
 *   TWY A   --(1)-> STAND 2   give up and go back to the stand
 *   HS 27 E --(1)-> TWY A     abandon the crossing, back onto A
 *   HS 27 E --(1)-> RWY 27    line up, once cleared
 *
 * RWY 27 has no moves out of it.  An aeroplane that has entered the runway has
 * left the taxi problem, and there is no legal move that brings it back to the
 * holding position -- which is why every table here has an infinite column.
 *
 * [book] LaValle Figure 2.8, with a b c d e renamed in that order.
 */
export function departureTaxi(): TaxiNetwork {
  const n = new TaxiNetwork(
    'the departure taxi',
    ['STAND 2', 'APRON', 'TWY A', 'HS 27 E', 'RWY 27'],
    'STAND 2',
    ['HS 27 E'],
  );
  n.addMove('STAND 2', 'STAND 2', 2, 'hold at the stand, engines running');
  n.addMove('STAND 2', 'APRON', 2, 'push back and start the taxi');
  n.addMove('APRON', 'TWY A', 1, 'turn onto the parallel taxiway');
  n.addMove('APRON', 'HS 27 E', 4, 'the long way round, on the apron lanes');
  n.addMove('TWY A', 'HS 27 E', 1, 'up to the holding position');
  n.addMove('TWY A', 'STAND 2', 1, 'give up and go back to the stand');
  n.addMove('HS 27 E', 'TWY A', 1, 'abandon the crossing, back onto A');
  n.addMove('HS 27 E', 'RWY 27', 1, 'line up, once cleared');
  return n;
}

/**
 * The route choice.  Stand 1 to the holding position short of runway 36 at the
 * west side, where the obvious route is not the quick one.
 *
 *   STAND 1 --(2)-> APRON
 *   APRON   --(1)-> STAND 1   return to stand
 *   APRON   --(4)-> TWY A
 *   TWY A   --(3)-> TWY B     cut north on the connector
 *   TWY A   --(7)-> HS 36 W   stay on A, all the way round the field
 *   TWY B   --(1)-> TWY A
 *   TWY B   --(1)-> TWY B     hold on B
 *   TWY B   --(1)-> HS 36 W
 *
 * Staying on A is three legs and thirteen minutes.  Cutting north through B is
 * four legs and ten.  Fewest turns is not quickest, and this network is built
 * to make an algorithm choose.
 *
 * [book] LaValle Figure 2.21, the graph of book Exercise 1.
 */
export function bypassTaxi(): TaxiNetwork {
  const n = new TaxiNetwork(
    'the route choice',
    ['STAND 1', 'APRON', 'TWY A', 'TWY B', 'HS 36 W'],
    'STAND 1',
    ['HS 36 W'],
  );
  n.addMove('STAND 1', 'APRON', 2, 'push back');
  n.addMove('APRON', 'STAND 1', 1, 'return to stand');
  n.addMove('APRON', 'TWY A', 4, 'out to the parallel taxiway');
  n.addMove('TWY A', 'TWY B', 3, 'cut north on the connector');
  n.addMove('TWY A', 'HS 36 W', 7, 'stay on A, all the way round the field');
  n.addMove('TWY B', 'TWY A', 1, 'back onto A');
  n.addMove('TWY B', 'TWY B', 1, 'hold on B');
  n.addMove('TWY B', 'HS 36 W', 1, 'up to the holding position');
  return n;
}

// --- what a plan over a network looks like ----------------------------------

/**
 * The same shape as TaxiRoute, for the same reason: either a taxi, or a reason
 * there is not one.
 */
export interface TaxiSchedule {
  ok: boolean;
  refusal: string;
  /** places.length === moves.length + 1 for a schedule of at least one move. */
  places: number[];
  /** The index of the move taken at each place. */
  moves: number[];
  minutes: number;
  expanded: number;
  generated: number;
}

export function emptySchedule(): TaxiSchedule {
  return { ok: false, refusal: '', places: [], moves: [], minutes: 0, expanded: 0, generated: 0 };
}

export function refuseSchedule(why: string): TaxiSchedule {
  const s = emptySchedule();
  s.refusal = why.trim() || 'refused, no reason given';
  return s;
}

/** Hand it the places it passes through and the moves it takes between them. */
export function scheduleFromMoves(net: TaxiNetwork, from: number, moves: readonly number[]): TaxiSchedule {
  const s = emptySchedule();
  s.ok = true;
  s.places.push(from);
  let at = from;
  for (const index of moves) {
    const move = net.move(at, index);
    if (!move) return refuseSchedule(`no move ${index} at ${net.placeName(at)}`);
    s.moves.push(index);
    s.places.push(move.to);
    s.minutes += move.minutes;
    at = move.to;
  }
  return s;
}

/**
 * Re-flies the schedule move by move: every move really was available where it
 * was used, the places really join up, and the quoted minutes really are the
 * sum.  Returns "" when it holds up.
 */
export function validateSchedule(net: TaxiNetwork, schedule: TaxiSchedule): string {
  if (!schedule.ok) return schedule.refusal ? '' : 'schedule is not ok but carries no reason';
  if (schedule.refusal) return 'schedule is ok but carries a refusal reason';
  if (schedule.places.length === 0) return 'an ok schedule must name at least where it starts';
  if (schedule.places.length !== schedule.moves.length + 1)
    return `places (${schedule.places.length}) must be moves + 1 (${schedule.moves.length + 1})`;

  let minutes = 0;
  for (let i = 0; i < schedule.moves.length; ++i) {
    const at = schedule.places[i]!;
    const move = net.move(at, schedule.moves[i]!);
    if (!move) return `move ${i} is not available at ${net.placeName(at)}`;
    if (move.to !== schedule.places[i + 1])
      return `move ${i} leads to ${net.placeName(move.to)}, not ${net.placeName(schedule.places[i + 1]!)}`;
    minutes += move.minutes;
  }
  if (Math.abs(minutes - schedule.minutes) > 1e-9)
    return `minutes is ${schedule.minutes} but the moves add up to ${minutes}`;
  return '';
}

/** One line, for printing. */
export function describeSchedule(net: TaxiNetwork, schedule: TaxiSchedule): string {
  if (!schedule.ok) return `REFUSED: ${schedule.refusal}`;
  const names = schedule.places.map((p) => net.placeName(p));
  return `${names.join(' > ')}  (${schedule.minutes} min, ${schedule.moves.length} moves)`;
}

/** One row per sweep, one column per place.  [book] the layout of Figures 2.9, 2.12 and 2.14. */
export type MinuteTable = number[][];

/** Prints a table the way the book does, so you can compare column by column. */
export function formatTable(
  net: TaxiNetwork,
  rowLabels: readonly string[],
  rows: MinuteTable,
): string {
  const width = Math.max(8, ...net.places.map((p) => p.length + 2));
  const label = Math.max(6, ...rowLabels.map((r) => r.length));
  let out = ' '.repeat(label) + net.places.map((p) => p.padStart(width)).join('') + '\n';
  for (let i = 0; i < rows.length; ++i) {
    out += (rowLabels[i] ?? `${i}`).padEnd(label);
    for (const v of rows[i]!) out += (v === UNREACHABLE_MINUTES ? 'inf' : String(v)).padStart(width);
    out += '\n';
  }
  return out;
}
