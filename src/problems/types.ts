// The twelve things you write, as a type.
//
// Both `src/problems` (your stubs) and `src/solutions` (the reference) export a
// module that satisfies this interface, and the tests are run against each in
// turn.  If you change a signature here, both sides stop compiling -- which is
// the point.
//
// Read the brief in docs/taxi/pNN-*.md before each one.

import type {
  Aircraft,
  Chart,
  Clearance,
  Cnf,
  JobList,
  JobPlan,
  LinkId,
  MinuteTable,
  NodeId,
  RampDescription,
  RampEncoding,
  RampState,
  RoundGraph,
  TaxiNetwork,
  TaxiRoute,
  TaxiSchedule,
  Turnaround,
} from '../chart/index.js';

/**
 * For every point on the chart: how long the taxi still is from there, and
 * which leg to take next.  This is the object a planner keeps, rather than a
 * route, because an aeroplane is routinely not where the plan said.
 */
export interface CostToGo {
  goal: NodeId;
  /** UNREACHABLE where there is no route. */
  seconds: number[];
  /** NO_LINK at the goal and wherever there is no route. */
  next: LinkId[];
}

/** What a closure cost.  See Problem 10. */
export interface Disruption {
  before: TaxiRoute;
  after: TaxiRoute;
  /** How much longer the new route is, or UNREACHABLE when there is none. */
  delaySeconds: number;
}

export interface Problems extends ProblemsPart1b {
  // --- Problem 01: the first route -----------------------------------------
  /** Fewest legs from one point to another, ignoring the aeroplane entirely. */
  fewestLegs(chart: Chart, from: NodeId, to: NodeId): TaxiRoute;

  // --- Problem 02: the quickest taxi ---------------------------------------
  /** Least time, using legSeconds() as the cost of a leg. */
  quickestRoute(chart: Chart, ac: Aircraft, from: NodeId, to: NodeId): TaxiRoute;

  // --- Problem 03: will it fit? --------------------------------------------
  /** Why this aeroplane may not use this leg today, or "" if it may. */
  unusableReason(chart: Chart, e: LinkId, ac: Aircraft): string;
  /** The quickest route over legs this aeroplane is actually allowed on. */
  quickestRouteFor(chart: Chart, ac: Aircraft, from: NodeId, to: NodeId): TaxiRoute;

  // --- Problem 04: turns cost time -----------------------------------------
  /** As Problem 03, but a turn of more than 30 degrees costs ac.turnPenaltyS. */
  quickestRouteWithTurns(chart: Chart, ac: Aircraft, from: NodeId, to: NodeId): TaxiRoute;

  // --- Problem 05: via the named taxiways ----------------------------------
  /** The quickest route that complies with the clearance as spoken. */
  routeUnderClearance(chart: Chart, ac: Aircraft, from: NodeId, clr: Clearance): TaxiRoute;

  // --- Problem 06: hold short ----------------------------------------------
  /** Every runway this route crosses or enters, in order, without repeats. */
  runwaysCrossed(chart: Chart, route: TaxiRoute): string[];
  /** The whole departure: obey the clearance, cross only what it permits, stop. */
  planDeparture(chart: Chart, ac: Aircraft, from: NodeId, clr: Clearance): TaxiRoute;

  // --- Problem 07: a chart the size of a real one --------------------------
  /** Problem 04's answer, arrived at after looking at less of the aerodrome. */
  quickestRouteGuided(chart: Chart, ac: Aircraft, from: NodeId, to: NodeId): TaxiRoute;

  // --- Problem 08: minutes to go -------------------------------------------
  secondsToGo(chart: Chart, ac: Aircraft, goal: NodeId): CostToGo;

  // --- Problem 09: from where it actually is -------------------------------
  /**
   * What to tell the crew, from a point the plan never mentioned, with no
   * search at all.  A taxiway name, "HOLD POSITION", or "UNABLE: ...".
   */
  nextInstruction(chart: Chart, table: CostToGo, at: NodeId): string;
  /** The whole route the table implies, from anywhere. */
  followTable(chart: Chart, ac: Aircraft, table: CostToGo, at: NodeId): TaxiRoute;

  // --- Problem 10: Bravo is closed -----------------------------------------
  /** A copy of the chart with every leg of one taxiway closed. */
  withTaxiwayClosed(chart: Chart, taxiway: string): Chart;
  closureCost(
    chart: Chart,
    ac: Aircraft,
    from: NodeId,
    to: NodeId,
    taxiway: string,
  ): Disruption;

  // --- Problem 11: before pushback -----------------------------------------
  /** An order the ground crew could work to, one job at a time. */
  pushbackOrder(t: Turnaround): JobPlan;

  // --- Problem 12: earliest off-block --------------------------------------
  /** The earliest it can push, letting independent jobs run at the same time. */
  earliestOffBlock(t: Turnaround, crewAvailable?: number): JobPlan;
  /** The jobs with no slack: delay one by a minute and the whole thing slips. */
  criticalPath(t: Turnaround): string[];
}

// ===========================================================================
// Part 1b -- the rest of the discrete-planning chapter
//
// Problems 01 to 12 cover breadth-first search, Dijkstra, A*, a backward
// cost-to-go table and two scheduling problems.  Problems 13 to 20 are the
// methods the book presents alongside those, in the order it presents them,
// and on the same aerodrome.
// ===========================================================================

/**
 * The settled answer of Problem 17: how long the taxi still is from every
 * place, and what to do when you are standing there.
 */
export interface SettledTaxi {
  /** One per place.  UNREACHABLE_MINUTES where the taxi cannot be completed. */
  minutes: number[];
  /**
   * One per place: the index of the move to take, STOP where the taxi is
   * already finished, NO_MOVE where there is nothing legal to do at all.
   */
  advice: number[];
  /** How many sweeps before the numbers stopped moving. */
  sweeps: number;
  /** Every sweep, in order, so you can watch it settle. */
  history: MinuteTable;
}

/** The same, counted forwards.  There is no advice here; see Problem 16. */
export interface SettledSpend {
  minutes: number[];
  sweeps: number;
  history: MinuteTable;
}

export interface ProblemsPart1b {
  // --- Problem 13: deep first, and what it costs ---------------------------
  /** A route, found by following one branch as far as it goes. */
  depthFirstRoute(chart: Chart, from: NodeId, to: NodeId): TaxiRoute;
  /** The same, but refusing to go more than `maxLegs` deep. */
  routeWithinLegs(chart: Chart, from: NodeId, to: NodeId, maxLegs: number): TaxiRoute;
  /** Depth first's memory with breadth first's guarantee, by throwing work away. */
  iterativeDeepeningRoute(chart: Chart, from: NodeId, to: NodeId): TaxiRoute;

  // --- Problem 14: from the other end --------------------------------------
  /** The quickest route, searched backwards from the destination. */
  backwardRoute(chart: Chart, ac: Aircraft, from: NodeId, to: NodeId): TaxiRoute;
  /** Both ends at once, stopping when the two wavefronts touch. */
  bidirectionalRoute(chart: Chart, from: NodeId, to: NodeId): TaxiRoute;

  // --- Problem 15: the table for a fixed number of moves -------------------
  /** Row k: with exactly k moves left, the cheapest finish from each place. */
  minutesToGo(net: TaxiNetwork, moves: number): MinuteTable;
  /** The route the table implies, using exactly the whole budget. */
  scheduleFromTable(net: TaxiNetwork, table: MinuteTable): TaxiSchedule;

  // --- Problem 16: the same table, forwards --------------------------------
  /** Row k: after exactly k moves, the cheapest way to be standing at each place. */
  minutesSpent(net: TaxiNetwork, moves: number): MinuteTable;

  // --- Problem 17: taking the budget away ----------------------------------
  settleMinutesToGo(net: TaxiNetwork): SettledTaxi;
  settleMinutesSpent(net: TaxiNetwork): SettledSpend;
  /** Follow the advice from wherever the aeroplane is, until it says stop. */
  scheduleFromAdvice(net: TaxiNetwork, settled: SettledTaxi, from?: number): TaxiSchedule;

  // --- Problem 18: describing the turnaround instead of drawing it ---------
  jobIsPossible(desc: RampDescription, state: RampState, job: number): boolean;
  afterJob(desc: RampDescription, state: RampState, job: number): RampState;
  turnaroundIsDone(desc: RampDescription, state: RampState): boolean;
  /** The fewest jobs that get the aeroplane ready.  Searched, not scheduled. */
  shortestJobList(desc: RampDescription): JobList;

  // --- Problem 19: how early could it possibly finish? ---------------------
  buildRoundGraph(desc: RampDescription, maxRounds?: number): RoundGraph;
  /** Could the turnaround be finished by this round?  Necessary, not sufficient. */
  couldBeDoneBy(desc: RampDescription, graph: RoundGraph, round: number): boolean;
  /** The first round for which that holds, or -1. */
  earliestRound(desc: RampDescription, graph: RoundGraph): number;

  // --- Problem 20: planning without a planner ------------------------------
  encodeRamp(desc: RampDescription, K: number): RampEncoding;
  /** Davis-Putnam-Logemann-Loveland.  undefined when the formula is unsatisfiable. */
  solveCnf(cnf: Cnf): boolean[] | undefined;
  jobsFromAssignment(encoding: RampEncoding, assignment: readonly boolean[]): number[];
  /** Try K = 0, 1, 2, ... until the formula is satisfiable. */
  jobListByFormula(desc: RampDescription, maxK?: number): JobList;
}
