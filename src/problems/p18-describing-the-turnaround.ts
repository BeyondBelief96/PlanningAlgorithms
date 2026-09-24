// Problem 18 -- Describing the turnaround instead of drawing it.
// Brief: docs/taxi/p18-describing-the-turnaround.md

import {
  arrivalState,
  holds,
  type JobList,
  numRampStates,
  type RampDescription,
  type RampState,
  refuseJobList,
  withFact,
} from '../chart/index.js';

export function jobIsPossible(desc: RampDescription, state: RampState, job: number): boolean {
  // TODO(you): every condition in job.needs must hold the way it says.  Note
  // that a need may be NOT-something -- "the hold door is not shut" -- so this
  // is a comparison against need.holds, not a test for truth.
  void desc;
  void state;
  void job;
  void holds;
  return false;
}

export function afterJob(desc: RampDescription, state: RampState, job: number): RampState {
  // TODO(you): set every fact the job leaves behind, and leave every fact it
  // does not mention exactly as it was.
  //
  // That last sentence is the whole trick of this representation, and it is
  // what keeps the description four lines long while the state space it names
  // has eight, or a thousand, or a billion states in it.
  void desc;
  void job;
  void withFact;
  return state;
}

export function turnaroundIsDone(desc: RampDescription, state: RampState): boolean {
  // TODO(you): every condition in desc.mustEndWith holds the way it says.
  //
  // "Must end with" names a SET of states, not one state: any fact it does not
  // mention may go either way.  That is why this is a test rather than an
  // equality against some goal state.
  void desc;
  void state;
  return false;
}

export function shortestJobList(desc: RampDescription): JobList {
  // TODO(you): breadth first, exactly as in Problem 01, over states rather than
  // points.  A state is a number; the moves available at it are the jobs that
  // are possible there; the goal test is turnaroundIsDone().
  //
  // Fewest jobs is the right thing to want: every job occupies the ramp.
  //
  // The cargo hold is the case to think about.  The aeroplane arrives with the
  // door SHUT, and the door must END shut -- so the first job in any working
  // plan is to open it, which moves AWAY from the goal.  A planner that only
  // ever takes steps that look like progress never solves this.
  void desc;
  void arrivalState;
  void numRampStates;
  return refuseJobList('shortestJobList is not implemented yet');
}
