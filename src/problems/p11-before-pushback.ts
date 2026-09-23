// Problem 11 -- Before pushback.        Brief: docs/taxi/p11-before-pushback.md

import { findJob, type JobPlan, refuseJobs, type Turnaround } from '../chart/index.js';

export function pushbackOrder(t: Turnaround): JobPlan {
  // TODO(you): an order the ground crew could work to, one job at a time.
  //
  // Repeatedly do any job whose dependencies are all finished.  Fill in order,
  // startMinutes and totalMinutes; validateJobs() checks all three.
  //
  // The part worth caring about is the refusal.  When nothing is ready and jobs
  // remain, the roster contains a loop -- and the useful answer NAMES THE JOBS,
  // because somebody has to go and fix it.  "No valid order exists" sends them
  // to read fifty rows by hand.
  //
  // Check first that every dependency names a job that exists.
  void t;
  void findJob;
  return refuseJobs('pushbackOrder is not implemented yet');
}
