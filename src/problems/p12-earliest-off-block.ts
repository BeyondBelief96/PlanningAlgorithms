// Problem 12 -- Earliest off-block.
// Brief: docs/taxi/p12-earliest-off-block.md

import { findJob, type JobPlan, refuseJobs, type Turnaround } from '../chart/index.js';

export function earliestOffBlock(t: Turnaround, crewAvailable = 0): JobPlan {
  // TODO(you): the earliest the aeroplane can push, letting independent jobs
  // run at the same time.
  //
  // With crewAvailable === 0 (as many people as you like) there is no search at
  // all: each job starts the moment the last thing it waits for has finished.
  // One sweep.  What comes out is a floor on the turnaround -- and a floor is
  // usually what the ramp wants, because it is the number that says whether to
  // re-sequence the gate now or in twenty minutes.
  //
  // With a crew limit it is genuinely harder (scheduling under a resource
  // constraint is NP-hard).  The greedy answer -- at each minute, start
  // whatever is ready and fits -- is fine, and the tests only ask that it be
  // legal and no better than the unlimited case.  Say in a comment that it is
  // not optimal.
  //
  // Report the jobs in start order; that is how the ramp reads it.
  void t;
  void crewAvailable;
  void findJob;
  return refuseJobs('earliestOffBlock is not implemented yet');
}

export function criticalPath(t: Turnaround): string[] {
  // TODO(you): the jobs with no slack -- delay any one of them by a minute and
  // the whole turnaround slips by a minute.
  //
  // Earliest start for each job, then latest start for each job working
  // backwards from the finish.  The ones where those two are equal are the
  // answer, and they are the only jobs worth putting another loader on.
  void t;
  return [];
}
