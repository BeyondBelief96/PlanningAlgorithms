// Reference solution -- Problem 18: describing the turnaround instead of
// drawing it.
//
// A state of the turnaround is one yes-or-no answer for every fact, which is
// exactly a string of bits -- and read as a number, that is a point in a graph
// every search from Problems 01 to 17 already knows how to walk.
//
// It also shows why this kind of planning is hard.  Three facts is eight
// states.  Ten facts about a real turnaround is a thousand.  Thirty is a
// billion.  The description stays four lines long and the thing it names does
// not, which is the entire argument for describing rather than drawing.
//
// [book] LaValle Section 2.4.2.

import {
  arrivalState,
  type GroundJob,
  holds,
  type JobList,
  numRampStates,
  type RampDescription,
  type RampState,
  refuseJobList,
  withFact,
} from '../chart/index.js';

export function jobIsPossible(desc: RampDescription, state: RampState, job: number): boolean {
  const j: GroundJob | undefined = desc.jobs[job];
  if (!j) return false;
  for (const need of j.needs) if (holds(state, need.fact) !== need.holds) return false;
  return true;
}

export function afterJob(desc: RampDescription, state: RampState, job: number): RampState {
  const j = desc.jobs[job];
  if (!j) return state;
  // Every fact the job does not mention keeps its value.  That single sentence
  // is why the description is short: a job says what it changes, not what the
  // world looks like afterwards.
  let out = state;
  for (const leave of j.leaves) out = withFact(out, leave.fact, leave.holds);
  return out;
}

export function turnaroundIsDone(desc: RampDescription, state: RampState): boolean {
  // "Must end with" names a SET of states: any fact it does not mention may go
  // either way.  That is why this is a test and not an equality.
  for (const end of desc.mustEndWith) if (holds(state, end.fact) !== end.holds) return false;
  return true;
}

export function shortestJobList(desc: RampDescription): JobList {
  const start = arrivalState(desc);
  const total = numRampStates(desc);

  const seen = new Array<boolean>(total).fill(false);
  const cameFrom = new Array<number>(total).fill(-1);
  const byJob = new Array<number>(total).fill(-1);

  const queue: RampState[] = [start];
  seen[start] = true;

  let expanded = 0;
  let generated = 1;

  // Breadth first, exactly as in Problem 01.  Fewest jobs is the right thing to
  // want here: every job occupies the ramp, and the cheapest turnaround is the
  // one with the fewest of them.
  for (let head = 0; head < queue.length; ++head) {
    const state = queue[head]!;
    ++expanded;
    if (turnaroundIsDone(desc, state)) {
      const jobs: number[] = [];
      let at = state;
      for (let guard = 0; at !== start; ++guard) {
        if (guard > total) return refuseJobList('the job trail forms a loop');
        jobs.push(byJob[at]!);
        at = cameFrom[at]!;
      }
      jobs.reverse();
      return { ok: true, refusal: '', jobs, expanded, generated };
    }

    for (let job = 0; job < desc.jobs.length; ++job) {
      if (!jobIsPossible(desc, state, job)) continue;
      const next = afterJob(desc, state, job);
      if (seen[next]) continue;
      seen[next] = true;
      cameFrom[next] = state;
      byJob[next] = job;
      queue.push(next);
      ++generated;
    }
  }

  const failed = refuseJobList(
    `no sequence of these jobs makes ${desc.name} ready; the description is wrong, not the ramp`,
  );
  failed.expanded = expanded;
  failed.generated = generated;
  return failed;
}
