import { describe, expect, it } from 'vitest';
import {
  arrivalState,
  cargoHold,
  factVar,
  groundPower,
  holds,
  jobNames,
  jobVar,
  satisfiedBy,
  toDimacs,
  totalVars,
} from '../src/chart/index.js';
import { expectValidJobList } from './fixtures.js';
import { impl } from './impl.js';

const { encodeRamp, jobListByFormula, jobsFromAssignment, shortestJobList, solveCnf } = impl;

describe('p20 planning without a planner', () => {
  // --- the examples in the brief ------------------------------------------

  it('gives every fact and every job a variable per step', () => {
    const hold = cargoHold(); // 3 facts, 4 jobs
    const encoding = encodeRamp(hold, 4);
    // 5 steps of facts and 4 of jobs: 5 * 3 + 4 * 4 = 31.
    expect(totalVars(encoding)).toBe(31);
    expect(encoding.cnf.numVars).toBe(31);
    // The layout is given, so a test can look inside the formula.
    expect(factVar(encoding, 0, 1)).toBe(1);
    expect(jobVar(encoding, 0, 1)).toBe(16);
  });

  it('pins the starting facts, including the false ones', () => {
    // "Not stated" has to mean "false", and the formula has to say so out loud
    // -- otherwise the solver is free to decide the hold arrived full.
    const hold = cargoHold();
    const encoding = encodeRamp(hold, 2);
    const start = arrivalState(hold);
    for (let f = 0; f < hold.facts.length; ++f) {
      const v = factVar(encoding, f, 1);
      const want = holds(start, f) ? v : -v;
      expect(encoding.cnf.clauses, `fact ${f} at step 1`).toContainEqual([want]);
    }
  });

  it('solves the hold, and the answer is the one Problem 18 found', () => {
    const hold = cargoHold();
    const list = jobListByFormula(hold);
    expectValidJobList(hold, list);
    expect(jobNames(hold, list)).toEqual([
      'open the door',
      'load ULD1',
      'load ULD2',
      'shut the door',
    ]);
  });

  it('solves ground power, where the goal names a fact that must be false', () => {
    const power = groundPower();
    const list = jobListByFormula(power);
    expectValidJobList(power, list);
    expect(jobNames(power, list)).toEqual(['walk to the panel', 'connect the GPU']);
  });

  it('finds the shortest, because it tries K in order', () => {
    for (const desc of [cargoHold(), groundPower()]) {
      const byFormula = jobListByFormula(desc);
      const bySearch = shortestJobList(desc);
      expect(byFormula.jobs.length, desc.name).toBe(bySearch.jobs.length);
    }
  });

  // --- and the cases the brief does not spell out --------------------------

  it('is unsatisfiable when the budget is one step too small', () => {
    const hold = cargoHold();
    expect(solveCnf(encodeRamp(hold, 3).cnf)).toBeUndefined();
    expect(solveCnf(encodeRamp(hold, 4).cnf)).toBeDefined();
  });

  it('produces an assignment that really does satisfy the formula', () => {
    // A solver that returns a plausible-looking assignment nobody checks is the
    // easiest thing in this problem to get subtly wrong.
    const encoding = encodeRamp(cargoHold(), 4);
    const assignment = solveCnf(encoding.cnf);
    expect(assignment).toBeDefined();
    expect(satisfiedBy(encoding.cnf, assignment!)).toBe(true);
  });

  it('runs at most one job per step', () => {
    const encoding = encodeRamp(cargoHold(), 4);
    const assignment = solveCnf(encoding.cnf)!;
    for (let k = 1; k <= encoding.K; ++k) {
      let running = 0;
      for (let o = 0; o < encoding.desc.jobs.length; ++o)
        if (assignment[jobVar(encoding, o, k) - 1]) ++running;
      expect(running, `step ${k}`).toBeLessThanOrEqual(1);
    }
    expect(jobsFromAssignment(encoding, assignment).length).toBe(4);
  });

  it('stops nothing changing by itself', () => {
    // The frame axioms are the clauses people forget.  Without them the solver
    // finds a "plan" in which the hold door quietly shuts itself, so: take the
    // real encoding, drop every clause mentioning a job variable, and check the
    // door can no longer change on its own.
    const hold = cargoHold();
    const encoding = encodeRamp(hold, 1);
    const jobVars = new Set<number>();
    for (let o = 0; o < hold.jobs.length; ++o) jobVars.add(jobVar(encoding, o, 1));

    // With no job running, the door at step 2 must equal the door at step 1.
    const cnf = {
      numVars: encoding.cnf.numVars,
      clauses: [
        ...encoding.cnf.clauses,
        ...[...jobVars].map((v) => [-v]), // nothing runs
        [-factVar(encoding, 0, 2)], // ...and claim the door is open afterwards
      ],
    };
    expect(solveCnf(cnf), 'the door cannot open with nobody touching it').toBeUndefined();
  });

  it('says why it gave up rather than claiming there is no turnaround', () => {
    // This is a complete method for FINDING a turnaround and only a
    // semi-decision procedure for proving there is none: when the answer is
    // "impossible", the outer loop just keeps counting.
    const list = jobListByFormula(cargoHold(), 2);
    expect(list.ok).toBe(false);
    expect(list.refusal).toMatch(/2 step/);
  });

  it('writes a formula anybody else can read', () => {
    const dimacs = toDimacs(encodeRamp(groundPower(), 2).cnf);
    expect(dimacs.startsWith('p cnf ')).toBe(true);
    expect(dimacs.trimEnd().split('\n').length).toBe(encodeRamp(groundPower(), 2).cnf.clauses.length + 1);
  });
});
