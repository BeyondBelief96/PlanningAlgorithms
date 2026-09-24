// Reference solution -- Problem 20: planning without a planner.
//
// A third way at the same turnaround, and the strangest.
//
// Fix a number of steps K.  Give every fact one true/false variable per step,
// and every job one per step.  Then write down, as clauses, what it means for a
// turnaround to work: this is how it starts, this is how it must end, a job
// runs only if what it needs holds, a job's effects hold afterwards, nothing
// changes unless a job changed it, and only one job runs at a time.
//
// The formula is satisfiable exactly when a K-step turnaround exists.  So a
// general SAT solver -- which has never heard of an aeroplane, a hold door or a
// ground power unit -- plans the turnaround for you.  A good deal of industrial
// planning is still done this way.
//
// The cost of the trick is that fixed K.  You do not know it before you solve
// the problem, so the outer loop tries K = 0, 1, 2, ... and gives up.  That
// makes this a complete method for FINDING a turnaround and only a
// semi-decision procedure for proving there is none.
//
// [book] LaValle Section 2.5.3, equations (2.33) and (2.34).

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
  const encoding: RampEncoding = { desc, K, cnf: emptyCnf() };
  const cnf = encoding.cnf;
  cnf.numVars = totalVars(encoding);

  const numFacts = desc.facts.length;
  const numJobs = desc.jobs.length;

  // 1. How it starts.  Every fact at step 1 is pinned to the value it has when
  //    the aeroplane arrives -- including the ones that are false, because
  //    "not stated" has to mean "false" and the formula must say so.
  const start = arrivalState(desc);
  for (let f = 0; f < numFacts; ++f) {
    const v = factVar(encoding, f, 1);
    cnf.clauses.push([holds(start, f) ? v : -v]);
  }

  // 2. How it must end, at the final step K + 1.
  for (const end of desc.mustEndWith) {
    const v = factVar(encoding, end.fact, K + 1);
    cnf.clauses.push([end.holds ? v : -v]);
  }

  // 3. What a job means.  "If job o runs at step k then everything it needs
  //    holds at k and everything it leaves holds at k + 1" -- which, once the
  //    OR is distributed over the AND, is one two-literal clause per condition.
  for (let k = 1; k <= K; ++k) {
    for (let o = 0; o < numJobs; ++o) {
      const ov = jobVar(encoding, o, k);
      const job = desc.jobs[o]!;
      for (const need of job.needs) {
        const pv = factVar(encoding, need.fact, k);
        cnf.clauses.push([-ov, need.holds ? pv : -pv]);
      }
      for (const leave of job.leaves) {
        const ev = factVar(encoding, leave.fact, k + 1);
        cnf.clauses.push([-ov, leave.holds ? ev : -ev]);
      }
    }
  }

  // 4. Nothing changes by itself.  If a fact is different at k + 1 from what it
  //    was at k, some job at step k must have left it that way.  Two clauses
  //    per fact per step, one for each direction of change.
  //
  //    These are the clauses people forget, and a formula without them produces
  //    a "plan" in which the hold door quietly shuts itself.
  for (let k = 1; k <= K; ++k) {
    for (let f = 0; f < numFacts; ++f) {
      const now = factVar(encoding, f, k);
      const later = factVar(encoding, f, k + 1);
      const becameFalse = [-now, later];
      const becameTrue = [now, -later];
      for (let o = 0; o < numJobs; ++o) {
        for (const leave of desc.jobs[o]!.leaves) {
          if (leave.fact !== f) continue;
          if (leave.holds) becameTrue.push(jobVar(encoding, o, k));
          else becameFalse.push(jobVar(encoding, o, k));
        }
      }
      cnf.clauses.push(becameFalse);
      cnf.clauses.push(becameTrue);
    }
  }

  // 5. One job at a time.
  for (let k = 1; k <= K; ++k)
    for (let o = 0; o < numJobs; ++o)
      for (let p = o + 1; p < numJobs; ++p)
        cnf.clauses.push([-jobVar(encoding, o, k), -jobVar(encoding, p, k)]);

  return encoding;
}

// --- the solver -------------------------------------------------------------
//
// Davis-Putnam-Logemann-Loveland, 1962, and still the shape of every serious
// SAT solver.  Three ideas: a clause with one unassigned literal left forces
// it; a variable that only ever appears one way round can be set that way
// without regret; and when neither applies, guess and recurse.

/** value[v] is 1 for true, -1 for false, 0 for unassigned.  Index 0 is unused. */
type Assignment = number[];

function literalValue(value: Assignment, literal: number): number {
  const v = Math.abs(literal);
  if (value[v] === 0) return 0;
  return literal > 0 ? value[v]! : -value[v]!;
}

/** Repeatedly assigns forced literals.  False on a conflict. */
function unitPropagate(cnf: Cnf, value: Assignment): boolean {
  let changed = true;
  while (changed) {
    changed = false;
    for (const clause of cnf.clauses) {
      let unassigned = 0;
      let candidate = 0;
      let satisfied = false;
      for (const l of clause) {
        const v = literalValue(value, l);
        if (v === 1) {
          satisfied = true;
          break;
        }
        if (v === 0) {
          ++unassigned;
          candidate = l;
        }
      }
      if (satisfied) continue;
      if (unassigned === 0) return false; // every literal false: conflict
      if (unassigned === 1) {
        value[Math.abs(candidate)] = candidate > 0 ? 1 : -1;
        changed = true;
      }
    }
  }
  return true;
}

/**
 * A variable that occurs with only one polarity among the clauses that are
 * still unsatisfied can be set that way without ever hurting.
 */
function pureLiterals(cnf: Cnf, value: Assignment): void {
  let changed = true;
  while (changed) {
    changed = false;
    const seenPositive = new Array<boolean>(value.length).fill(false);
    const seenNegative = new Array<boolean>(value.length).fill(false);
    for (const clause of cnf.clauses) {
      if (clause.some((l) => literalValue(value, l) === 1)) continue;
      for (const l of clause) {
        if (literalValue(value, l) !== 0) continue;
        if (l > 0) seenPositive[l] = true;
        else seenNegative[-l] = true;
      }
    }
    for (let v = 1; v < value.length; ++v) {
      if (value[v] !== 0) continue;
      if (seenPositive[v] && !seenNegative[v]) {
        value[v] = 1;
        changed = true;
      } else if (seenNegative[v] && !seenPositive[v]) {
        value[v] = -1;
        changed = true;
      }
    }
  }
}

function allSatisfied(cnf: Cnf, value: Assignment): boolean {
  return cnf.clauses.every((clause) => clause.some((l) => literalValue(value, l) === 1));
}

function search(cnf: Cnf, value: Assignment): Assignment | undefined {
  if (!unitPropagate(cnf, value)) return undefined;
  pureLiterals(cnf, value);
  if (!unitPropagate(cnf, value)) return undefined;
  if (allSatisfied(cnf, value)) return value;

  let branch = 0;
  for (let v = 1; v < value.length && branch === 0; ++v) if (value[v] === 0) branch = v;
  if (branch === 0) return undefined; // nothing left to try, yet clauses unsatisfied

  for (const trial of [1, -1]) {
    const next = [...value];
    next[branch] = trial;
    const found = search(cnf, next);
    if (found) return found;
  }
  return undefined;
}

export function solveCnf(cnf: Cnf): boolean[] | undefined {
  const solution = search(cnf, new Array<number>(cnf.numVars + 1).fill(0));
  if (!solution) return undefined;
  const out = new Array<boolean>(cnf.numVars).fill(false);
  for (let v = 1; v <= cnf.numVars; ++v) out[v - 1] = solution[v] === 1;
  return out;
}

export function jobsFromAssignment(
  encoding: RampEncoding,
  assignment: readonly boolean[],
): number[] {
  const jobs: number[] = [];
  for (let k = 1; k <= encoding.K; ++k) {
    for (let o = 0; o < encoding.desc.jobs.length; ++o) {
      const v = jobVar(encoding, o, k);
      if (v >= 1 && v <= assignment.length && assignment[v - 1]) {
        jobs.push(o);
        break; // one job at a time, by construction
      }
    }
  }
  return jobs;
}

export function jobListByFormula(desc: RampDescription, maxK = 8): JobList {
  for (let K = 0; K <= maxK; ++K) {
    const encoding = encodeRamp(desc, K);
    const assignment = solveCnf(encoding.cnf);
    if (assignment)
      return {
        ok: true,
        refusal: '',
        jobs: jobsFromAssignment(encoding, assignment),
        expanded: K + 1,
        generated: encoding.cnf.clauses.length,
      };
  }
  return refuseJobList(
    `no turnaround of ${maxK} step(s) or fewer makes ${desc.name} ready; ` +
      'a longer budget might, and that is the honest limit of this method',
  );
}
