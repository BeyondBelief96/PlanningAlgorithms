import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { expectValidJobs } from './fixtures.js';
import {
  circularTurnaround,
  shortTurnaround,
  winterTurnaround,
} from '../src/chart/index.js';

const { criticalPath, earliestOffBlock, pushbackOrder } = impl;

describe('p12 earliest off-block', () => {
  const short = shortTurnaround();

  // --- the examples in the brief ------------------------------------------

  it('gets the turnaround down from 78 minutes to 39', () => {
    const plan = earliestOffBlock(short);
    expectValidJobs(short, plan);
    expect(plan.totalMinutes).toBe(39);
    expect(plan.totalMinutes).toBeLessThan(pushbackOrder(short).totalMinutes);
  });

  it('starts everything the moment the last thing it waits for has finished', () => {
    const plan = earliestOffBlock(short);
    const startOf = new Map(plan.order.map((n, i) => [n, plan.startMinutes[i]!]));
    expect(startOf.get('CHOCKS ON')).toBe(0);
    // Three jobs all wait on the chocks and all start together at minute 1.
    expect(startOf.get('GPU ON')).toBe(1);
    expect(startOf.get('STEPS ON')).toBe(1);
    expect(startOf.get('OFFLOAD HOLD')).toBe(1);
    expect(startOf.get('PUSHBACK')).toBe(35);
  });

  it('names the jobs worth putting another loader on', () => {
    const path = criticalPath(short);
    expect(path).toContain('DISEMBARK');
    expect(path).toContain('CLEAN CABIN');
    expect(path).toContain('BOARD');
    expect(path).toContain('PUSHBACK');
    // Refuelling has slack: it finishes long before the doors shut.
    expect(path).not.toContain('REFUEL');
    expect(path).not.toContain('GPU ON');
  });

  // --- and the cases the brief does not spell out --------------------------

  it('puts de-icing on the critical path in winter, and adds 11 minutes', () => {
    const winter = winterTurnaround();
    const plan = earliestOffBlock(winter);
    expectValidJobs(winter, plan);
    expect(plan.totalMinutes).toBe(50);
    expect(criticalPath(winter)).toContain('DE-ICE');
  });

  it('is slower with fewer people, and never faster', () => {
    const unlimited = earliestOffBlock(short).totalMinutes;
    let previous = 0;
    for (const crew of [3, 4, 6]) {
      const plan = earliestOffBlock(short, crew);
      expectValidJobs(short, plan, crew);
      expect(plan.totalMinutes).toBeGreaterThanOrEqual(unlimited);
      if (previous) expect(plan.totalMinutes).toBeLessThanOrEqual(previous);
      previous = plan.totalMinutes;
    }
  });

  it('refuses a job that needs more crew than exist', () => {
    // CLEAN CABIN wants three.  With two on the ramp it is not a scheduling
    // problem, it is a staffing one, and the answer has to say so.
    const plan = earliestOffBlock(short, 2);
    expect(plan.ok).toBe(false);
    expect(plan.refusal).toMatch(/crew/i);
  });

  it('refuses a circular roster the same way Problem 11 does', () => {
    const plan = earliestOffBlock(circularTurnaround());
    expect(plan.ok).toBe(false);
    expect(plan.refusal).toMatch(/REFUEL|CATERING|loop/i);
    expect(criticalPath(circularTurnaround())).toEqual([]);
  });

  it('an empty turnaround is a plan of no jobs', () => {
    const empty = { flight: 'nothing to do', jobs: [] };
    const plan = earliestOffBlock(empty);
    expectValidJobs(empty, plan);
    expect(plan.ok).toBe(true);
    expect(criticalPath(empty)).toEqual([]);
  });
});
