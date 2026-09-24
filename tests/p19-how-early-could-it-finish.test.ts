import { describe, expect, it } from 'vitest';
import { cargoHold, conflictKey, groundPower, sameFact } from '../src/chart/index.js';
import { impl } from './impl.js';

const { buildRoundGraph, couldBeDoneBy, earliestRound, shortestJobList } = impl;

describe('p19 how early could it possibly finish', () => {
  // --- the examples in the brief ------------------------------------------

  it('starts from the aeroplane as it arrives', () => {
    // Round 1 has one value per fact and nothing in conflict: this is the world
    // as it is, not as it might be.
    const hold = cargoHold();
    const graph = buildRoundGraph(hold);
    expect(graph.factRounds[0]!.length).toBe(hold.facts.length);
    expect(graph.factConflicts[0]!.size).toBe(0);
    // The hold arrives shut and empty.
    expect(graph.factRounds[0]).toContainEqual({ fact: 0, holds: true });
    expect(graph.factRounds[0]).toContainEqual({ fact: 1, holds: false });
  });

  it('carries undisturbed facts forward with a do-nothing', () => {
    // A fact nobody touches is still true next round, and the graph needs
    // something to point at when it says so.  There is one do-nothing per fact.
    const graph = buildRoundGraph(cargoHold());
    const doNothings = graph.jobRounds[0]!.filter((e) => e.job < 0);
    expect(doNothings.length).toBe(graph.factRounds[0]!.length);
  });

  it('levels off, and stops', () => {
    // [book] the hold levels off at the fourth round of facts, exactly where
    // Figure 2.20 does.
    const graph = buildRoundGraph(cargoHold());
    expect(graph.levelledOffAt).toBe(3);
    expect(graph.factRounds.length).toBe(4);
  });

  it('puts a floor under the hold at three rounds', () => {
    // Open the door; load both containers at once; shut the door.  Three rounds
    // is genuinely achievable if the two loaders work in parallel, and no
    // amount of cleverness does it in two.
    const hold = cargoHold();
    const graph = buildRoundGraph(hold);
    expect(earliestRound(hold, graph)).toBe(3);
    expect(couldBeDoneBy(hold, graph, 2)).toBe(false);
    expect(couldBeDoneBy(hold, graph, 3)).toBe(true);
  });

  it('puts a floor under ground power at two rounds', () => {
    const power = groundPower();
    const graph = buildRoundGraph(power);
    expect(earliestRound(power, graph)).toBe(2);
  });

  it('is a floor, never a plan', () => {
    // The floor is allowed to be optimistic -- it ignores how the jobs that
    // would have to run together interact.  What it must never be is HIGHER
    // than a real answer, because then it would rule out a turnaround that
    // works.  The sequential plan from Problem 18 is the check.
    for (const desc of [cargoHold(), groundPower()]) {
      const graph = buildRoundGraph(desc);
      const floor = earliestRound(desc, graph);
      const real = shortestJobList(desc);
      expect(real.ok).toBe(true);
      expect(floor, desc.name).toBeGreaterThanOrEqual(0);
      expect(floor, desc.name).toBeLessThanOrEqual(real.jobs.length);
    }
  });

  // --- and the cases the brief does not spell out --------------------------

  it('always puts a fact in conflict with its own negation', () => {
    const graph = buildRoundGraph(cargoHold());
    const round = 1;
    const facts = graph.factRounds[round]!;
    for (let i = 0; i < facts.length; ++i)
      for (let j = i + 1; j < facts.length; ++j)
        if (facts[i]!.fact === facts[j]!.fact)
          expect(
            graph.factConflicts[round]!.has(conflictKey(i, j)),
            'a fact and its negation cannot both hold',
          ).toBe(true);
  });

  it('keeps the door shut and a container loaded apart until the door can be shut again', () => {
    // In round 3 the hold can be shut, and it can have ULD1 in it, but not both
    // -- because everything that shuts the door conflicts with everything that
    // loads it.  That conflict is the only thing standing between an optimistic
    // floor of two rounds and the honest answer of three.
    const hold = cargoHold();
    const graph = buildRoundGraph(hold);
    const facts = graph.factRounds[2]!;
    const shut = facts.findIndex((f) => sameFact(f, { fact: 0, holds: true }));
    const loaded = facts.findIndex((f) => sameFact(f, { fact: 1, holds: true }));
    expect(shut).toBeGreaterThanOrEqual(0);
    expect(loaded).toBeGreaterThanOrEqual(0);
    expect(graph.factConflicts[2]!.has(conflictKey(shut, loaded))).toBe(true);
  });

  it('answers no for a round that does not exist', () => {
    const hold = cargoHold();
    const graph = buildRoundGraph(hold);
    expect(couldBeDoneBy(hold, graph, -1)).toBe(false);
    expect(couldBeDoneBy(hold, graph, 99)).toBe(false);
  });

  it('respects the round budget', () => {
    const graph = buildRoundGraph(cargoHold(), 2);
    expect(graph.factRounds.length).toBeLessThanOrEqual(2);
  });
});
