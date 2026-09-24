// Problem 20 -- Planning without a planner.
// Brief: docs/taxi/p20-planning-without-a-planner.md

import {
  arrivalState,
  type Cnf,
  emptyCnf,
  factVar,
  holds,
  type JobList,
  jobVar,
  type RampDescription,
  type RampEncoding,
  refuseJobList,
  totalVars,
} from '../chart/index.js';

export function encodeRamp(desc: RampDescription, K: number): RampEncoding {
  // TODO(you): write the turnaround down as one enormous Boolean formula.
  //
  // Every fact gets a variable per step (factVar, steps 1..K+1) and every job
  // gets one per step (jobVar, steps 1..K).  Then five families of clauses:
  //
  //   1  HOW IT STARTS.  Every fact at step 1 is pinned to the value it has on
  //      arrival -- including the FALSE ones.  "Not stated" has to mean "false"
  //      and the formula must say so out loud.
  //
  //   2  HOW IT MUST END.  Each of desc.mustEndWith, at step K + 1.
  //
  //   3  WHAT A JOB MEANS.  If job o runs at step k then everything it needs
  //      holds at k and everything it leaves holds at k + 1.  Distribute the OR
  //      over the AND and you get one two-literal clause per condition.
  //
  //   4  NOTHING CHANGES BY ITSELF.  If a fact differs between k and k + 1,
  //      some job at step k must have left it that way.  Two clauses per fact
  //      per step, one per direction of change.
  //
  //      These are the ones people forget.  A formula without them produces a
  //      "plan" in which the hold door quietly shuts itself.
  //
  //   5  ONE JOB AT A TIME.
  void desc;
  void K;
  void arrivalState;
  void holds;
  void factVar;
  void jobVar;
  void totalVars;
  return { desc, K, cnf: emptyCnf() };
}

export function solveCnf(cnf: Cnf): boolean[] | undefined {
  // TODO(you): Davis-Putnam-Logemann-Loveland, 1962, and still the shape of
  // every serious SAT solver.  Three ideas:
  //
  //   unit propagation   a clause with one unassigned literal left forces it.
  //                      Repeat until nothing more is forced; a clause with
  //                      every literal false is a conflict, and you back out.
  //   pure literals      a variable that only ever appears one way round among
  //                      the still-unsatisfied clauses can be set that way
  //                      without ever regretting it.
  //   branch             when neither applies, guess, and recurse on both
  //                      values.
  //
  // Return undefined when the formula is unsatisfiable.  Note what that means
  // here: not "the turnaround is impossible", only "not in K steps".
  void cnf;
  return undefined;
}

export function jobsFromAssignment(
  encoding: RampEncoding,
  assignment: readonly boolean[],
): number[] {
  // TODO(you): read the job indices out of a satisfying assignment, in step
  // order.  At most one per step, by construction.
  void encoding;
  void assignment;
  return [];
}

export function jobListByFormula(desc: RampDescription, maxK = 8): JobList {
  // TODO(you): try K = 0, 1, 2, ... until the formula is satisfiable.
  //
  // That outer loop is the price of the trick.  You do not know K before you
  // solve the problem, so this is a complete method for FINDING a turnaround
  // and only a semi-decision procedure for proving there is none -- when the
  // answer is "impossible", the loop just keeps going.  Say so when you give up.
  void desc;
  void maxK;
  return refuseJobList('jobListByFormula is not implemented yet');
}
