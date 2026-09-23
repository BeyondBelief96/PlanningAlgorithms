// The forty minutes before the eight-minute taxi.
//
// Part of the *given* library.
//
// An aeroplane blocks a stand for forty minutes and taxis for eight.  Problems
// 01 to 10 are about the eight.  The last two are about the forty, and they are
// a different shape of problem: nothing here has coordinates.
//
// There is a list of jobs.  Each needs certain other jobs finished first, takes
// a certain number of minutes, and occupies a certain number of ground crew.
// Nobody writes the state space down -- fifteen yes/no facts about a turnaround
// is 32,768 states, for an aircraft type that will be retired before you finish
// drawing it.  You describe the jobs and let the states be implied.

export interface Job {
  /** "OFFLOAD HOLD" */
  readonly name: string;
  /** Jobs that must be finished before this one starts. */
  readonly needs: readonly string[];
  readonly minutes: number;
  /** How many people it occupies while it runs. */
  readonly crew: number;
}

export interface Turnaround {
  readonly flight: string;
  readonly jobs: readonly Job[];
}

export function findJob(t: Turnaround, name: string): number {
  return t.jobs.findIndex((j) => j.name === name);
}

/**
 * A plan, or a reason there is not one.  Same shape as TaxiRoute, for the same
 * reason.
 */
export interface JobPlan {
  ok: boolean;
  refusal: string;
  /** The jobs, in the order they are to be started. */
  order: string[];
  /** When each job in `order` starts, in minutes after on-blocks. */
  startMinutes: number[];
  /** Minutes from on-blocks to the last job finishing. */
  totalMinutes: number;
}

export function emptyJobPlan(): JobPlan {
  return { ok: false, refusal: '', order: [], startMinutes: [], totalMinutes: 0 };
}

export function refuseJobs(why: string): JobPlan {
  const p = emptyJobPlan();
  p.refusal = why.trim() || 'refused, no reason given';
  return p;
}

/**
 * Re-walks a JobPlan and checks it holds together: every job appears exactly
 * once, every dependency finishes before its dependent starts, no more than
 * `crewAvailable` people are busy at once, and totalMinutes really is the end
 * of the last job.  Returns "" when it is sound.
 *
 * Pass crewAvailable = 0 for "as many people as you like".
 */
export function validateJobs(t: Turnaround, plan: JobPlan, crewAvailable = 0): string {
  if (!plan.ok) return plan.refusal ? '' : 'plan is not ok but carries no reason';
  if (plan.refusal) return 'plan is ok but carries a refusal reason';
  if (plan.order.length !== t.jobs.length)
    return `the plan names ${plan.order.length} jobs; the turnaround has ${t.jobs.length}`;
  if (plan.startMinutes.length !== plan.order.length)
    return 'startMinutes must be the same length as order';

  const seen = new Set<string>();
  const start = new Map<string, number>();
  const finish = new Map<string, number>();

  for (let i = 0; i < plan.order.length; ++i) {
    const name = plan.order[i]!;
    const j = findJob(t, name);
    if (j < 0) return `the plan names a job that is not in the turnaround: ${name}`;
    if (seen.has(name)) return `the plan names ${name} twice`;
    seen.add(name);

    const at = plan.startMinutes[i]!;
    if (at < 0) return `the plan starts ${name} before on-blocks`;
    start.set(name, at);
    finish.set(name, at + t.jobs[j]!.minutes);
  }

  for (const job of t.jobs) {
    for (const need of job.needs) {
      if (findJob(t, need) < 0) return `job ${job.name} needs an unknown job: ${need}`;
      const ends = finish.get(need)!;
      const begins = start.get(job.name)!;
      if (ends > begins)
        return `${job.name} starts at ${begins} but needs ${need}, which is not finished until ${ends}`;
    }
  }

  let last = 0;
  for (const v of finish.values()) last = Math.max(last, v);
  if (last !== plan.totalMinutes)
    return `totalMinutes is ${plan.totalMinutes} but the last job finishes at ${last}`;

  if (crewAvailable > 0) {
    for (let minute = 0; minute < last; ++minute) {
      let busy = 0;
      for (const job of t.jobs) {
        const s = start.get(job.name)!;
        const f = finish.get(job.name)!;
        if (s <= minute && minute < f) busy += job.crew;
      }
      if (busy > crewAvailable)
        return `at minute ${minute} the plan has ${busy} crew busy, but only ${crewAvailable} are available`;
    }
  }
  return '';
}

/**
 * A short turnaround on stand 2.  Twelve jobs, some of which can genuinely run
 * at the same time and some of which cannot.
 */
export function shortTurnaround(): Turnaround {
  return {
    flight: 'KLM1234, A320, stand 2',
    jobs: [
      { name: 'CHOCKS ON', needs: [], minutes: 1, crew: 1 },
      { name: 'GPU ON', needs: ['CHOCKS ON'], minutes: 2, crew: 1 },
      { name: 'STEPS ON', needs: ['CHOCKS ON'], minutes: 2, crew: 2 },
      { name: 'DISEMBARK', needs: ['STEPS ON'], minutes: 8, crew: 1 },
      { name: 'OFFLOAD HOLD', needs: ['CHOCKS ON'], minutes: 9, crew: 2 },
      { name: 'CLEAN CABIN', needs: ['DISEMBARK'], minutes: 10, crew: 3 },
      { name: 'CATERING', needs: ['DISEMBARK'], minutes: 7, crew: 2 },
      { name: 'REFUEL', needs: ['OFFLOAD HOLD'], minutes: 12, crew: 1 },
      { name: 'LOAD HOLD', needs: ['OFFLOAD HOLD'], minutes: 9, crew: 2 },
      { name: 'BOARD', needs: ['CLEAN CABIN', 'CATERING'], minutes: 12, crew: 1 },
      { name: 'DOORS SHUT', needs: ['BOARD', 'LOAD HOLD', 'REFUEL'], minutes: 2, crew: 1 },
      { name: 'PUSHBACK', needs: ['DOORS SHUT', 'GPU ON'], minutes: 4, crew: 2 },
    ],
  };
}

/**
 * The same turnaround in freezing fog.  De-icing happens after the doors are
 * shut and before the push, and it is long enough to sit squarely on the
 * critical path.
 */
export function winterTurnaround(): Turnaround {
  const base = shortTurnaround();
  return {
    flight: 'KLM1234, A320, stand 2, freezing fog',
    jobs: [
      ...base.jobs.map((j) =>
        j.name === 'PUSHBACK' ? { ...j, needs: [...j.needs, 'DE-ICE'] } : j,
      ),
      { name: 'DE-ICE', needs: ['DOORS SHUT'], minutes: 11, crew: 3 },
    ],
  };
}

/**
 * A turnaround somebody wrote down wrong: the fuelling waits for the catering
 * and the catering waits for the fuelling.  Problem 11 has to refuse it and say
 * which jobs are in the loop.
 */
export function circularTurnaround(): Turnaround {
  return {
    flight: 'KLM1234, A320, stand 2 (the roster is wrong)',
    jobs: [
      { name: 'CHOCKS ON', needs: [], minutes: 1, crew: 1 },
      { name: 'OFFLOAD HOLD', needs: ['CHOCKS ON'], minutes: 9, crew: 2 },
      { name: 'REFUEL', needs: ['CATERING'], minutes: 12, crew: 1 },
      { name: 'CATERING', needs: ['REFUEL'], minutes: 7, crew: 2 },
      { name: 'DOORS SHUT', needs: ['REFUEL', 'CATERING'], minutes: 2, crew: 1 },
    ],
  };
}
