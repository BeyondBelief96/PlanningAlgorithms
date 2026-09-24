// Shared setup, so twelve test files do not each spell out the same things.

import { expect } from 'vitest';
import {
  a320,
  b777,
  type Chart,
  dash8,
  type JobList,
  kiloField,
  type JobPlan,
  type RampDescription,
  type TaxiNetwork,
  type TaxiRoute,
  type TaxiSchedule,
  type Turnaround,
  taxiwaysUsed,
  validateJobList,
  validateJobs,
  validateRoute,
  validateSchedule,
} from '../src/chart/index.js';

export const kilo = kiloField();
export const A320 = a320();
export const DHC8 = dash8();
export const B777 = b777();

/** Point ids by name, so tests read like the chart does. */
export function at(name: string): number {
  const id = kilo.find(name);
  if (id < 0) throw new Error(`${name} is not on Kilo Field`);
  return id;
}

/**
 * Every test that gets a route runs this.  A route you cannot check is not a
 * route you can taxi.
 */
export function expectValidRoute(chart: Chart, route: TaxiRoute): void {
  const why = validateRoute(chart, route);
  expect(why, `the route does not hold together: ${why}`).toBe('');
}

export function expectRefused(route: TaxiRoute, mentioning?: RegExp): void {
  expect(route.ok, `expected a refusal, got: ${JSON.stringify(route.links)}`).toBe(false);
  expect(route.refusal).not.toBe('');
  if (mentioning) expect(route.refusal).toMatch(mentioning);
}

/** The taxiways a route uses, which is what a brief's examples are written in. */
export function ways(chart: Chart, route: TaxiRoute): string[] {
  return taxiwaysUsed(chart, route);
}

export function expectValidJobs(t: Turnaround, plan: JobPlan, crew = 0): void {
  const why = validateJobs(t, plan, crew);
  expect(why, `the plan does not hold together: ${why}`).toBe('');
}

// --- Part 1b ---------------------------------------------------------------

/**
 * A row of a minute table, with infinity written as Infinity so a failure
 * prints something you can read.
 */
export function expectRow(actual: readonly number[] | undefined, expected: readonly number[]): void {
  expect(actual, 'the table has no such row').toBeDefined();
  expect(actual!.length, 'wrong number of places in the row').toBe(expected.length);
  for (let i = 0; i < expected.length; ++i) {
    const a = actual![i]!;
    const b = expected[i]!;
    if (b === Infinity) expect(a, `column ${i}`).toBe(Infinity);
    else expect(a, `column ${i}`).toBeCloseTo(b, 9);
  }
}

/** Every schedule a test gets runs this, for the same reason routes do. */
export function expectValidSchedule(net: TaxiNetwork, schedule: TaxiSchedule): void {
  const why = validateSchedule(net, schedule);
  expect(why, `the schedule does not hold together: ${why}`).toBe('');
}

export function expectValidJobList(desc: RampDescription, list: JobList): void {
  const why = validateJobList(desc, list);
  expect(why, `the job list does not hold together: ${why}`).toBe('');
}
