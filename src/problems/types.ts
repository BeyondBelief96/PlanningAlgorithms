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
  JobPlan,
  LinkId,
  NodeId,
  TaxiRoute,
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

export interface Problems {
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
