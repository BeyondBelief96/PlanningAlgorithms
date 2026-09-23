// Reference solution -- Problem 11: before pushback.
//
// A change of shape.  Nothing here has coordinates; there is a list of jobs,
// each needing certain others finished first.  Nobody writes the state space
// down -- fifteen yes/no facts about a turnaround is 32,768 states, for an
// aircraft type that will be retired before you finish drawing it.  You
// describe the jobs and let the states be implied.
//
// One job at a time, so this is the simple version: repeatedly do any job whose
// dependencies are all finished.
//
// The part worth caring about is the refusal.  When nothing is ready and jobs
// remain, the roster contains a loop -- and the useful answer NAMES THE JOBS,
// because somebody has to go and fix the roster.  "No valid order exists" sends
// them to read fifty rows by hand.

import {
  emptyJobPlan,
  findJob,
  type JobPlan,
  refuseJobs,
  type Turnaround,
} from '../chart/index.js';

export function pushbackOrder(t: Turnaround): JobPlan {
  const n = t.jobs.length;
  if (n === 0) {
    const empty = emptyJobPlan();
    empty.ok = true;
    return empty;
  }

  // Check the roster refers only to jobs that exist, before doing anything.
  for (const job of t.jobs)
    for (const need of job.needs)
      if (findJob(t, need) < 0)
        return refuseJobs(`${job.name} waits for ${need}, which is not on the roster`);

  const done = new Array<boolean>(n).fill(false);
  const plan = emptyJobPlan();
  plan.ok = true;
  let clock = 0;

  for (let placed = 0; placed < n; ++placed) {
    let pick = -1;
    for (let i = 0; i < n && pick < 0; ++i) {
      if (done[i]) continue;
      const ready = t.jobs[i]!.needs.every((need) => done[findJob(t, need)]);
      if (ready) pick = i;
    }

    if (pick < 0) {
      // Everything still outstanding is waiting for something else still
      // outstanding.  That set contains the loop; name it.
      const stuck = t.jobs.filter((_, i) => !done[i]).map((j) => j.name);
      return refuseJobs(
        `these jobs wait for each other and none can start: ${stuck.join(', ')}`,
      );
    }

    const job = t.jobs[pick]!;
    plan.order.push(job.name);
    plan.startMinutes.push(clock);
    clock += job.minutes;
    done[pick] = true;
  }

  plan.totalMinutes = clock;
  return plan;
}
