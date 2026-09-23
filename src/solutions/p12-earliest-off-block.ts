// Reference solution -- Problem 12: earliest off-block.
//
// Problem 11 did one job at a time, which is not how a ramp works.  Two loaders
// and a fueller work at once, and the question the ramp actually wants answered
// is not "in what order?" but "when can it go?".
//
// With unlimited crew the answer is a single sweep: each job starts the moment
// the last thing it waits for has finished, and the turnaround ends when the
// last job does.  No search at all.  What comes out is a floor on the
// turnaround -- and a floor is usually what you want, because it is the number
// that tells you whether to re-sequence the gate now or in twenty minutes.
//
// With a crew limit it becomes genuinely harder -- scheduling under a resource
// constraint is NP-hard -- and what is below is the ordinary greedy answer: at
// each minute, start whatever is ready and fits.  It is NOT optimal, and the
// brief says so.  Doing better is the follow-up.

import {
  emptyJobPlan,
  findJob,
  type JobPlan,
  refuseJobs,
  type Turnaround,
} from '../chart/index.js';
import { pushbackOrder } from './p11-before-pushback.js';

/**
 * Earliest start for every job with as many people as you like.  Returns
 * undefined when the roster contains a loop.
 */
function earliestStarts(t: Turnaround): number[] | undefined {
  const n = t.jobs.length;
  const start = new Array<number>(n).fill(0);
  const done = new Array<boolean>(n).fill(false);

  for (let placed = 0; placed < n; ++placed) {
    let pick = -1;
    for (let i = 0; i < n && pick < 0; ++i) {
      if (done[i]) continue;
      const ready = t.jobs[i]!.needs.every((need) => {
        const k = findJob(t, need);
        return k >= 0 && done[k];
      });
      if (ready) pick = i;
    }
    if (pick < 0) return undefined;

    let at = 0;
    for (const need of t.jobs[pick]!.needs) {
      const k = findJob(t, need);
      at = Math.max(at, start[k]! + t.jobs[k]!.minutes);
    }
    start[pick] = at;
    done[pick] = true;
  }
  return start;
}

export function earliestOffBlock(t: Turnaround, crewAvailable = 0): JobPlan {
  const n = t.jobs.length;
  if (n === 0) {
    const empty = emptyJobPlan();
    empty.ok = true;
    return empty;
  }

  for (const job of t.jobs)
    for (const need of job.needs)
      if (findJob(t, need) < 0)
        return refuseJobs(`${job.name} waits for ${need}, which is not on the roster`);

  let start = earliestStarts(t);
  if (!start) {
    // Reuse Problem 11's message, which already names the jobs in the loop.
    const order = pushbackOrder(t);
    return refuseJobs(order.refusal || 'the roster contains a loop');
  }

  if (crewAvailable > 0) {
    const begun = new Array<number>(n).fill(-1);
    const finish = new Array<number>(n).fill(-1);
    let placed = 0;

    for (let minute = 0; placed < n; ++minute) {
      if (minute > 100000) return refuseJobs('the turnaround never finishes');

      let busy = 0;
      for (let i = 0; i < n; ++i)
        if (begun[i]! >= 0 && begun[i]! <= minute && minute < finish[i]!) busy += t.jobs[i]!.crew;

      for (let i = 0; i < n; ++i) {
        if (begun[i]! >= 0) continue;
        const job = t.jobs[i]!;
        if (job.crew > crewAvailable)
          return refuseJobs(
            `${job.name} needs ${job.crew} crew and only ${crewAvailable} are available`,
          );

        const ready = job.needs.every((need) => {
          const k = findJob(t, need);
          return finish[k]! >= 0 && finish[k]! <= minute;
        });
        if (!ready) continue;
        if (busy + job.crew > crewAvailable) continue;

        begun[i] = minute;
        finish[i] = minute + job.minutes;
        busy += job.crew;
        ++placed;
      }
    }
    start = begun;
  }

  // Report in start order, which is the order the ramp reads it in.
  const order = t.jobs.map((_, i) => i);
  order.sort((a, b) => start[a]! - start[b]!);

  const plan = emptyJobPlan();
  plan.ok = true;
  for (const i of order) {
    plan.order.push(t.jobs[i]!.name);
    plan.startMinutes.push(start[i]!);
    plan.totalMinutes = Math.max(plan.totalMinutes, start[i]! + t.jobs[i]!.minutes);
  }
  return plan;
}

export function criticalPath(t: Turnaround): string[] {
  const n = t.jobs.length;
  if (n === 0) return [];

  const start = earliestStarts(t);
  if (!start) return [];

  let total = 0;
  for (let i = 0; i < n; ++i) total = Math.max(total, start[i]! + t.jobs[i]!.minutes);

  // The latest a job could start without moving the finish, worked backwards.
  const latest = new Array<number>(n).fill(total);
  for (let pass = 0; pass < n; ++pass) {
    for (let i = 0; i < n; ++i) {
      let limit = total - t.jobs[i]!.minutes;
      for (let j = 0; j < n; ++j) {
        if (!t.jobs[j]!.needs.includes(t.jobs[i]!.name)) continue;
        limit = Math.min(limit, latest[j]! - t.jobs[i]!.minutes);
      }
      latest[i] = limit;
    }
  }

  // Zero slack: delay it a minute and the whole turnaround slips a minute.
  return t.jobs.filter((_, i) => latest[i] === start[i]).map((j) => j.name);
}
