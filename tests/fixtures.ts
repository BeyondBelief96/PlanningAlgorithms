// Shared setup, so twelve test files do not each spell out the same things.

import { expect } from 'vitest';
import {
  a320,
  b777,
  type Chart,
  dash8,
  kiloField,
  type JobPlan,
  type TaxiRoute,
  type Turnaround,
  taxiwaysUsed,
  validateJobs,
  validateRoute,
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
