import { describe, expect, it } from 'vitest';
import {
  arrivalState,
  cargoHold,
  findJobByName,
  groundPower,
  holds,
  jobNames,
  numRampStates,
  withFact,
} from '../src/chart/index.js';
import { expectValidJobList } from './fixtures.js';
import { impl } from './impl.js';

const { afterJob, jobIsPossible, shortestJobList, turnaroundIsDone } = impl;

describe('p18 describing the turnaround instead of drawing it', () => {
  // --- the examples in the brief ------------------------------------------

  it('knows which jobs can be started', () => {
    const hold = cargoHold();
    const start = arrivalState(hold); // the door is shut, nothing loaded
    expect(jobIsPossible(hold, start, findJobByName(hold, 'open the door'))).toBe(true);
    // Both of these need the door OPEN.
    expect(jobIsPossible(hold, start, findJobByName(hold, 'load ULD1'))).toBe(false);
    expect(jobIsPossible(hold, start, findJobByName(hold, 'shut the door'))).toBe(false);
  });

  it('leaves the facts it does not mention exactly as they were', () => {
    // That single sentence is the whole trick of this representation.  "Load
    // ULD1" says nothing about the door or about ULD2, so neither moves.
    const hold = cargoHold();
    const open = afterJob(hold, arrivalState(hold), findJobByName(hold, 'open the door'));
    const loaded = afterJob(hold, open, findJobByName(hold, 'load ULD1'));
    expect(holds(loaded, 0)).toBe(false); // the door is still open
    expect(holds(loaded, 1)).toBe(true); //  ULD1 is loaded
    expect(holds(loaded, 2)).toBe(false); // ULD2 is not
  });

  it('names a set of finishing states, not one state', () => {
    // "Must end with" says nothing about the crew's whereabouts in the ground
    // power problem, so both answers are acceptable -- which is why this is a
    // test and not an equality.
    const power = groundPower();
    const AT_PANEL = 0;
    const CONNECTED = 1;
    const ON_BATTERY = 2;
    let done = withFact(withFact(0, CONNECTED, true), ON_BATTERY, false);
    expect(turnaroundIsDone(power, done)).toBe(true);
    done = withFact(done, AT_PANEL, true);
    expect(turnaroundIsDone(power, done), 'the crew may stand where they like').toBe(true);
  });

  it('opens the door first, which moves away from the goal', () => {
    // The aeroplane arrives with the hold door SHUT and the door must END
    // shut.  The only working plan begins by opening it.  A planner that takes
    // only steps which look like progress never solves this, and that is the
    // entire reason this example is in the book.
    const hold = cargoHold();
    const list = shortestJobList(hold);
    expectValidJobList(hold, list);
    expect(jobNames(hold, list)).toEqual([
      'open the door',
      'load ULD1',
      'load ULD2',
      'shut the door',
    ]);
  });

  it('walks to the panel before connecting the GPU', () => {
    const power = groundPower();
    const list = shortestJobList(power);
    expectValidJobList(power, list);
    expect(jobNames(power, list)).toEqual(['walk to the panel', 'connect the GPU']);
  });

  // --- and the cases the brief does not spell out --------------------------

  it('names a state space far larger than the description', () => {
    // Three facts is eight states.  Ten facts about a real turnaround is a
    // thousand; thirty is a billion.  The description stays four lines long.
    expect(numRampStates(cargoHold())).toBe(8);
    expect(cargoHold().jobs.length).toBe(4);
  });

  it('searches a fraction of that space', () => {
    const list = shortestJobList(cargoHold());
    expect(list.expanded).toBeGreaterThan(0);
    expect(list.expanded).toBeLessThanOrEqual(numRampStates(cargoHold()));
  });

  it('is already finished when there is nothing to do', () => {
    // A description whose arrival state already satisfies the goal needs no
    // jobs at all, and an empty list is a real answer rather than a refusal.
    const power = groundPower();
    const done: typeof power = {
      ...power,
      mustEndWith: [{ fact: 2, holds: true }], // it arrives on its own battery
    };
    const list = shortestJobList(done);
    expectValidJobList(done, list);
    expect(list.ok).toBe(true);
    expect(list.jobs).toHaveLength(0);
  });

  it('refuses a description nothing can satisfy, and says the description is wrong', () => {
    const hold = cargoHold();
    const impossible: typeof hold = {
      ...hold,
      // Nothing loads ULD2 without the door being open, and nothing shuts it
      // afterwards if the only job is removed.
      jobs: hold.jobs.filter((j) => j.name !== 'open the door'),
    };
    const list = shortestJobList(impossible);
    expect(list.ok).toBe(false);
    expect(list.refusal).not.toBe('');
  });

  it('treats a job that changes nothing as a job that changes nothing', () => {
    const hold = cargoHold();
    const start = arrivalState(hold);
    const shut = findJobByName(hold, 'shut the door');
    // It is not possible here, and applying it anyway must not invent a state.
    expect(jobIsPossible(hold, start, shut)).toBe(false);
    expect(afterJob(hold, start, -1)).toBe(start);
  });
});
