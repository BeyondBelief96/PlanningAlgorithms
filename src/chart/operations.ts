// The turnaround described instead of drawn.
//
// Part of the *given* library.
//
// Problems 11 and 12 scheduled a turnaround whose jobs were a list with a
// precedence order: this before that, so many minutes, so many crew.  That
// works because somebody had already worked out the order and written it down.
//
// Problems 18 to 20 are about the case where nobody has.  You are given the
// FACTS -- is the hold door shut, is ULD1 loaded, is the aeroplane on its own
// battery -- and the JOBS, each of which needs certain facts to hold and leaves
// certain facts changed.  The order is not given; finding one is the problem.
//
// The reason to describe rather than draw: three facts is eight states, ten
// facts about a real turnaround is a thousand, and thirty is a billion.  The
// description stays small while the thing it names does not.
//
// [book] LaValle Section 2.4, Formulation 2.4.  A fact is a complementary pair
// of literals, a job is a ground STRIPS operator.

/** "the hold door is shut" holding, or not holding. */
export interface Condition {
  /** Index into RampDescription.facts. */
  readonly fact: number;
  /** True for "this is so", false for "this is not so". */
  readonly holds: boolean;
}

export function isSo(fact: number): Condition {
  return { fact, holds: true };
}

export function notSo(fact: number): Condition {
  return { fact, holds: false };
}

/**
 * One job on the ramp.  `needs` must all hold before it starts; `leaves` is
 * what is true afterwards.  Every fact the job does not mention is left exactly
 * as it was -- which is the whole trick, and the reason the description stays
 * short.
 */
export interface GroundJob {
  readonly name: string;
  readonly needs: readonly Condition[];
  readonly leaves: readonly Condition[];
}

export interface RampDescription {
  readonly name: string;
  /** Every fact this turnaround is about, in a fixed order. */
  readonly facts: readonly string[];
  readonly jobs: readonly GroundJob[];
  /** What is already true when the aeroplane arrives. */
  readonly onArrival: readonly Condition[];
  /** What must be true before it can push.  May name a fact that must be FALSE. */
  readonly mustEndWith: readonly Condition[];
}

/**
 * One yes-or-no answer for every fact, packed into the bits of a number.
 * Bit i is set exactly when facts[i] holds.
 *
 * [book] Section 2.4.2 calls this the binary string representation.
 */
export type RampState = number;

export function holds(state: RampState, fact: number): boolean {
  return (state & (1 << fact)) !== 0;
}

export function withFact(state: RampState, fact: number, value: boolean): RampState {
  return value ? state | (1 << fact) : state & ~(1 << fact);
}

/** Every fact that is not said to be true on arrival is false. */
export function arrivalState(desc: RampDescription): RampState {
  let state = 0;
  for (const c of desc.onArrival) if (c.holds) state = withFact(state, c.fact, true);
  return state;
}

/** How many states the description names.  Small numbers here get big fast. */
export function numRampStates(desc: RampDescription): number {
  return 1 << desc.facts.length;
}

export function describeState(desc: RampDescription, state: RampState): string {
  const on = desc.facts.filter((_, i) => holds(state, i));
  return `{${on.join(', ')}}`;
}

export function describeCondition(desc: RampDescription, c: Condition): string {
  return `${c.holds ? '' : 'NOT '}${desc.facts[c.fact] ?? '?'}`;
}

export function describeJob(desc: RampDescription, job: GroundJob): string {
  const list = (cs: readonly Condition[]): string =>
    cs.map((c) => describeCondition(desc, c)).join(', ') || '(nothing)';
  return `${job.name}\n    needs:  ${list(job.needs)}\n    leaves: ${list(job.leaves)}`;
}

export function findJobByName(desc: RampDescription, name: string): number {
  return desc.jobs.findIndex((j) => j.name === name);
}

// --- the two descriptions the problems share --------------------------------

/**
 * Loading the hold.  Two containers to go in, and the door has to end up shut.
 *
 *   facts:  the hold door is shut, ULD1 is loaded, ULD2 is loaded
 *   jobs:   shut the door, open the door, load ULD1, load ULD2
 *   arrival:  the door is shut
 *   must end: the door is shut AND both containers are loaded
 *
 * The shortest job list is (open the door, load ULD1, load ULD2, shut the
 * door): four jobs, and the FIRST of them undoes part of the goal.  A planner
 * that refuses to move away from what it is aiming at never solves this, which
 * is the entire reason this example is here.
 *
 * A ULD is a unit load device -- the container an aeroplane's hold is loaded in.
 *
 * [book] LaValle Example 2.6, the flashlight, relabelled fact for fact:
 * On(Cap) -> the hold door is shut, In(Battery_i) -> ULD_i is loaded.
 */
export function cargoHold(): RampDescription {
  const DOOR_SHUT = 0;
  const ULD1_LOADED = 1;
  const ULD2_LOADED = 2;
  return {
    name: 'loading the hold',
    facts: ['the hold door is shut', 'ULD1 is loaded', 'ULD2 is loaded'],
    jobs: [
      { name: 'shut the door', needs: [notSo(DOOR_SHUT)], leaves: [isSo(DOOR_SHUT)] },
      { name: 'open the door', needs: [isSo(DOOR_SHUT)], leaves: [notSo(DOOR_SHUT)] },
      {
        name: 'load ULD1',
        needs: [notSo(DOOR_SHUT), notSo(ULD1_LOADED)],
        leaves: [isSo(ULD1_LOADED)],
      },
      {
        name: 'load ULD2',
        needs: [notSo(DOOR_SHUT), notSo(ULD2_LOADED)],
        leaves: [isSo(ULD2_LOADED)],
      },
    ],
    onArrival: [isSo(DOOR_SHUT)],
    mustEndWith: [isSo(DOOR_SHUT), isSo(ULD1_LOADED), isSo(ULD2_LOADED)],
  };
}

/**
 * Ground power.  The aeroplane is running off its own battery, and somebody has
 * to walk to the panel before they can connect the ground power unit.
 *
 *   facts:  the crew is at the panel, the GPU is connected,
 *           the aeroplane is on its own battery
 *   jobs:   walk to the panel, walk away, connect the GPU, disconnect the GPU
 *   arrival:  on its own battery
 *   must end: the GPU is connected AND it is NOT on its own battery
 *
 * Small enough to trace by hand -- the answer is (walk to the panel, connect
 * the GPU).  Note that the goal names a fact that must be FALSE, which the
 * cargo hold does not; that difference matters in Problem 20.
 *
 * [book] LaValle book Exercise 14, the light switch, relabelled fact for fact.
 */
export function groundPower(): RampDescription {
  const AT_PANEL = 0;
  const CONNECTED = 1;
  const ON_BATTERY = 2;
  return {
    name: 'ground power',
    facts: [
      'the crew is at the panel',
      'the GPU is connected',
      'the aeroplane is on its own battery',
    ],
    jobs: [
      { name: 'walk to the panel', needs: [notSo(AT_PANEL)], leaves: [isSo(AT_PANEL)] },
      { name: 'walk away', needs: [isSo(AT_PANEL)], leaves: [notSo(AT_PANEL)] },
      {
        name: 'connect the GPU',
        needs: [isSo(AT_PANEL), notSo(CONNECTED)],
        leaves: [isSo(CONNECTED), notSo(ON_BATTERY)],
      },
      {
        name: 'disconnect the GPU',
        needs: [isSo(AT_PANEL), isSo(CONNECTED)],
        leaves: [notSo(CONNECTED), isSo(ON_BATTERY)],
      },
    ],
    onArrival: [isSo(ON_BATTERY)],
    mustEndWith: [isSo(CONNECTED), notSo(ON_BATTERY)],
  };
}

// --- the shapes Problems 18 to 20 produce -----------------------------------

/** A list of job names, in the order they are to be worked.  Or a refusal. */
export interface JobList {
  ok: boolean;
  refusal: string;
  /** Indices into RampDescription.jobs. */
  jobs: number[];
  expanded: number;
  generated: number;
}

export function emptyJobList(): JobList {
  return { ok: false, refusal: '', jobs: [], expanded: 0, generated: 0 };
}

export function refuseJobList(why: string): JobList {
  const l = emptyJobList();
  l.refusal = why.trim() || 'refused, no reason given';
  return l;
}

export function jobNames(desc: RampDescription, list: JobList): string[] {
  return list.jobs.map((j) => desc.jobs[j]?.name ?? '?');
}

/**
 * Re-works the list job by job: every job was possible when it was started, and
 * the turnaround really is finished at the end.  Returns "" when it holds up.
 */
export function validateJobList(desc: RampDescription, list: JobList): string {
  if (!list.ok) return list.refusal ? '' : 'job list is not ok but carries no reason';
  if (list.refusal) return 'job list is ok but carries a refusal reason';

  let state = arrivalState(desc);
  for (let i = 0; i < list.jobs.length; ++i) {
    const job = desc.jobs[list.jobs[i]!];
    if (!job) return `job ${i} is not in this description`;
    for (const need of job.needs)
      if (holds(state, need.fact) !== need.holds)
        return `${job.name} was started but ${describeCondition(desc, need)} did not hold`;
    for (const leave of job.leaves) state = withFact(state, leave.fact, leave.holds);
  }
  for (const end of desc.mustEndWith)
    if (holds(state, end.fact) !== end.holds)
      return `the turnaround finished but ${describeCondition(desc, end)} did not hold`;
  return '';
}

// --- Problem 19: the rounds ------------------------------------------------

/**
 * A condition appearing in a round of the planning graph.  Same shape as a
 * Condition, kept separate because a round is about what COULD be true rather
 * than what is.
 */
export type RoundFact = Condition;

/**
 * An entry in a round: either a real job, or a do-nothing that carries one fact
 * forward untouched.  A fact nobody disturbs is still true next round, and the
 * graph needs something to point at when it says so.
 */
export interface RoundEntry {
  /** Index into RampDescription.jobs, or -1 for a do-nothing. */
  readonly job: number;
  /** For a do-nothing, the fact it carries forward. */
  readonly carries: RoundFact | undefined;
}

/** A pair of positions in a layer that cannot honestly hold together. */
export type ConflictSet = ReadonlySet<string>;

export function conflictKey(i: number, j: number): string {
  return i < j ? `${i},${j}` : `${j},${i}`;
}

export interface RoundGraph {
  /** What could be true at the start of round 1, 2, ... */
  factRounds: RoundFact[][];
  /** What could run in round 1, 2, ... */
  jobRounds: RoundEntry[][];
  /** Pairs of facts, by position in factRounds[r], that conflict. */
  factConflicts: Set<string>[];
  /** Pairs of jobs, by position in jobRounds[r], that conflict. */
  jobConflicts: Set<string>[];
  /**
   * The first round at which the graph stopped changing, or -1 if it never did
   * within the budget.
   */
  levelledOffAt: number;
}

export function emptyRoundGraph(): RoundGraph {
  return {
    factRounds: [],
    jobRounds: [],
    factConflicts: [],
    jobConflicts: [],
    levelledOffAt: -1,
  };
}

export function sameFact(a: RoundFact, b: RoundFact): boolean {
  return a.fact === b.fact && a.holds === b.holds;
}

export function oppositeFact(a: RoundFact, b: RoundFact): boolean {
  return a.fact === b.fact && a.holds !== b.holds;
}

// --- Problem 20: the formula -----------------------------------------------

/**
 * Conjunctive normal form, in the usual DIMACS convention: variables are
 * numbered from 1, a literal is +v or -v, and a clause is a disjunction.
 */
export interface Cnf {
  numVars: number;
  clauses: number[][];
}

export function emptyCnf(): Cnf {
  return { numVars: 0, clauses: [] };
}

export function toDimacs(cnf: Cnf): string {
  let out = `p cnf ${cnf.numVars} ${cnf.clauses.length}\n`;
  for (const clause of cnf.clauses) out += `${clause.join(' ')} 0\n`;
  return out;
}

export function satisfiedBy(cnf: Cnf, assignment: readonly boolean[]): boolean {
  for (const clause of cnf.clauses) {
    let ok = false;
    for (const l of clause) {
      const v = Math.abs(l);
      if (v < 1 || v > assignment.length) continue;
      if (assignment[v - 1] === l > 0) {
        ok = true;
        break;
      }
    }
    if (!ok) return false;
  }
  return true;
}

/**
 * The variable layout for a K-step encoding.  Steps run 1..K+1 for facts and
 * 1..K for jobs.  This bookkeeping is given so that the tests can look inside
 * your formula.
 */
export interface RampEncoding {
  readonly desc: RampDescription;
  readonly K: number;
  cnf: Cnf;
}

/** Variable for "fact `fact` holds at step k", k in [1, K + 1]. */
export function factVar(encoding: { desc: RampDescription; K: number }, fact: number, k: number): number {
  return (k - 1) * encoding.desc.facts.length + fact + 1;
}

/** Variable for "job `job` is worked at step k", k in [1, K]. */
export function jobVar(encoding: { desc: RampDescription; K: number }, job: number, k: number): number {
  return (
    (encoding.K + 1) * encoding.desc.facts.length + (k - 1) * encoding.desc.jobs.length + job + 1
  );
}

export function totalVars(encoding: { desc: RampDescription; K: number }): number {
  return (encoding.K + 1) * encoding.desc.facts.length + encoding.K * encoding.desc.jobs.length;
}
