import { describe, expect, it } from 'vitest';
import { impl } from './impl.js';
import { expectValidJobs } from './fixtures.js';
import {
  circularTurnaround,
  shortTurnaround,
  winterTurnaround,
} from '../src/chart/index.js';

const { pushbackOrder } = impl;

describe('p11 before pushback', () => {
  const short = shortTurnaround();

  // --- the examples in the brief ------------------------------------------

  it('gives an order the ground crew could actually work to', () => {
    const plan = pushbackOrder(short);
    expectValidJobs(short, plan);
    expect(plan.ok).toBe(true);
    expect(plan.order.length).toBe(short.jobs.length);
    expect(plan.order[0]).toBe('CHOCKS ON');
    expect(plan.order[plan.order.length - 1]).toBe('PUSHBACK');
  });

  it('takes 78 minutes, because one job at a time is not how a ramp works', () => {
    const plan = pushbackOrder(short);
    expect(plan.totalMinutes).toBe(78);
  });

  it('refuses a roster whose jobs wait for each other, and NAMES them', () => {
    const plan = pushbackOrder(circularTurnaround());
    expect(plan.ok).toBe(false);
    expect(plan.refusal).toMatch(/REFUEL/);
    expect(plan.refusal).toMatch(/CATERING/);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('never starts a job before something it waits for has finished', () => {
    // validateJobs checks this, but check it explicitly too: it is the whole
    // property the answer is for.
    const plan = pushbackOrder(short);
    const started = new Set<string>();
    for (const name of plan.order) {
      const job = short.jobs.find((j) => j.name === name)!;
      for (const need of job.needs) expect(started.has(need)).toBe(true);
      started.add(name);
    }
  });

  it('handles the winter roster, which has an extra job late on', () => {
    const winter = winterTurnaround();
    const plan = pushbackOrder(winter);
    expectValidJobs(winter, plan);
    expect(plan.order.indexOf('DE-ICE')).toBeLessThan(plan.order.indexOf('PUSHBACK'));
  });

  it('refuses a roster that names a job which does not exist', () => {
    const bad = {
      flight: 'test',
      jobs: [{ name: 'PUSHBACK', needs: ['TOWBAR ON'], minutes: 4, crew: 2 }],
    };
    const plan = pushbackOrder(bad);
    expect(plan.ok).toBe(false);
    expect(plan.refusal).toMatch(/TOWBAR ON/);
  });

  it('an empty turnaround is a plan of no jobs, not a refusal', () => {
    const empty = { flight: 'nothing to do', jobs: [] };
    const plan = pushbackOrder(empty);
    expectValidJobs(empty, plan);
    expect(plan.ok).toBe(true);
    expect(plan.totalMinutes).toBe(0);
  });
});
