// Reference solution -- Problem 19: how early could it possibly finish?
//
// Searching the turnaround for a plan is expensive.  Often the useful question
// is cheaper: assume every job that COULD run does run, all at once, round
// after round, and keep track only of which pairs of things cannot honestly
// hold together.  What comes out is not a plan -- it is a floor.  "Not before
// the third round, whatever you do", which for a ramp is usually the number
// somebody actually wants.
//
// The structure over-approximates on purpose.  A fact appears in round i if
// SOME i-round plan could make it true, ignoring the interactions between the
// jobs that would have to run together.  The conflict pairs claw back some of
// that optimism cheaply, and what is left is polynomial in size where the state
// space of Problem 18 is exponential.
//
// [book] LaValle Section 2.5.2, the Blum-Furst planning graph.  A conflict pair
// is what the literature calls a mutex.

import {
  arrivalState,
  type Condition,
  conflictKey,
  emptyRoundGraph,
  holds,
  oppositeFact,
  type RampDescription,
  type RoundEntry,
  type RoundFact,
  type RoundGraph,
  sameFact,
} from '../chart/index.js';

function needsOf(desc: RampDescription, entry: RoundEntry): readonly RoundFact[] {
  // A do-nothing has its carried fact as both need and leaving, which is what
  // makes it the round-graph version of "stop".
  if (entry.job < 0) return entry.carries ? [entry.carries] : [];
  return desc.jobs[entry.job]?.needs ?? [];
}

function leavesOf(desc: RampDescription, entry: RoundEntry): readonly RoundFact[] {
  if (entry.job < 0) return entry.carries ? [entry.carries] : [];
  return desc.jobs[entry.job]?.leaves ?? [];
}

function positionOf(layer: readonly RoundFact[], fact: RoundFact): number {
  return layer.findIndex((f) => sameFact(f, fact));
}

function inLayer(layer: readonly RoundFact[], fact: RoundFact): boolean {
  return positionOf(layer, fact) >= 0;
}

function conflicts(set: ReadonlySet<string>, i: number, j: number): boolean {
  if (i < 0 || j < 0 || i === j) return false;
  return set.has(conflictKey(i, j));
}

/** The three ways two jobs in the same round can conflict. */
function jobsConflict(
  desc: RampDescription,
  a: RoundEntry,
  b: RoundEntry,
  previousFacts: readonly RoundFact[],
  previousConflicts: ReadonlySet<string>,
): boolean {
  const needA = needsOf(desc, a);
  const needB = needsOf(desc, b);
  const leaveA = leavesOf(desc, a);
  const leaveB = leavesOf(desc, b);

  // 1. They leave the world in contradictory states.
  for (const ea of leaveA) for (const eb of leaveB) if (oppositeFact(ea, eb)) return true;

  // 2. One undoes something the other needs.
  for (const ea of leaveA) for (const pb of needB) if (oppositeFact(ea, pb)) return true;
  for (const eb of leaveB) for (const pa of needA) if (oppositeFact(eb, pa)) return true;

  // 3. Competing needs: what they each need was already in conflict a round ago.
  for (const pa of needA)
    for (const pb of needB)
      if (conflicts(previousConflicts, positionOf(previousFacts, pa), positionOf(previousFacts, pb)))
        return true;

  return false;
}

export function buildRoundGraph(desc: RampDescription, maxRounds = 16): RoundGraph {
  const graph = emptyRoundGraph();

  // Round 1 is the aeroplane as it arrives: every fact, with the value it has.
  const start = arrivalState(desc);
  const first: RoundFact[] = [];
  for (let f = 0; f < desc.facts.length; ++f) first.push({ fact: f, holds: holds(start, f) });
  graph.factRounds.push(first);
  graph.factConflicts.push(new Set()); // one value per fact, so nothing conflicts yet

  while (graph.factRounds.length < maxRounds) {
    const i = graph.factRounds.length - 1;
    const facts = graph.factRounds[i]!;
    const factConflicts = graph.factConflicts[i]!;

    // What could run this round: every job whose needs are all present, plus
    // one do-nothing per fact.
    const entries: RoundEntry[] = [];
    for (let j = 0; j < desc.jobs.length; ++j) {
      const job = desc.jobs[j]!;
      if (job.needs.every((need: Condition) => inLayer(facts, need)))
        entries.push({ job: j, carries: undefined });
    }
    for (const f of facts) entries.push({ job: -1, carries: f });

    const jobConflicts = new Set<string>();
    for (let p = 0; p < entries.length; ++p)
      for (let q = p + 1; q < entries.length; ++q)
        if (jobsConflict(desc, entries[p]!, entries[q]!, facts, factConflicts))
          jobConflicts.add(conflictKey(p, q));

    // The next round of facts: everything anything leaves behind.
    const nextFacts: RoundFact[] = [];
    for (const entry of entries)
      for (const leave of leavesOf(desc, entry))
        if (!inLayer(nextFacts, leave)) nextFacts.push(leave);
    nextFacts.sort((a, b) => (a.fact !== b.fact ? a.fact - b.fact : Number(a.holds) - Number(b.holds)));

    // Which pairs of those facts cannot honestly hold together.
    const nextConflicts = new Set<string>();
    for (let p = 0; p < nextFacts.length; ++p) {
      for (let q = p + 1; q < nextFacts.length; ++q) {
        // A fact and its own negation, always.
        if (oppositeFact(nextFacts[p]!, nextFacts[q]!)) {
          nextConflicts.add(conflictKey(p, q));
          continue;
        }
        // Otherwise: every way of producing the one conflicts with every way of
        // producing the other.  One job producing both settles it at once, in
        // the negative.
        let allConflict = true;
        let anyPair = false;
        for (let oa = 0; oa < entries.length && allConflict; ++oa) {
          const ea = leavesOf(desc, entries[oa]!);
          if (!ea.some((f) => sameFact(f, nextFacts[p]!))) continue;
          if (ea.some((f) => sameFact(f, nextFacts[q]!))) {
            allConflict = false;
            break;
          }
          for (let ob = 0; ob < entries.length; ++ob) {
            if (oa === ob) continue;
            const eb = leavesOf(desc, entries[ob]!);
            if (!eb.some((f) => sameFact(f, nextFacts[q]!))) continue;
            anyPair = true;
            if (!conflicts(jobConflicts, oa, ob)) {
              allConflict = false;
              break;
            }
          }
        }
        if (allConflict && anyPair) nextConflicts.add(conflictKey(p, q));
      }
    }

    graph.jobRounds.push(entries);
    graph.jobConflicts.push(jobConflicts);
    graph.factRounds.push(nextFacts);
    graph.factConflicts.push(nextConflicts);

    // Levelled off?  What could run in a round is decided entirely by what is
    // true at the start of it, so comparing the fact rounds is enough.
    const previous = facts;
    const now = graph.factRounds[graph.factRounds.length - 1]!;
    if (
      previous.length === now.length &&
      previous.every((f, k) => sameFact(f, now[k]!))
    ) {
      graph.levelledOffAt = graph.factRounds.length - 1;
      break;
    }
  }
  return graph;
}

export function couldBeDoneBy(
  desc: RampDescription,
  graph: RoundGraph,
  round: number,
): boolean {
  const facts = graph.factRounds[round];
  if (!facts) return false;
  const conflictsHere = graph.factConflicts[round] ?? new Set<string>();

  for (const end of desc.mustEndWith) if (!inLayer(facts, end)) return false;
  for (let p = 0; p < desc.mustEndWith.length; ++p)
    for (let q = p + 1; q < desc.mustEndWith.length; ++q)
      if (
        conflicts(
          conflictsHere,
          positionOf(facts, desc.mustEndWith[p]!),
          positionOf(facts, desc.mustEndWith[q]!),
        )
      )
        return false;
  return true;
}

export function earliestRound(desc: RampDescription, graph: RoundGraph): number {
  for (let i = 0; i < graph.factRounds.length; ++i)
    if (couldBeDoneBy(desc, graph, i)) return i;
  return -1;
}
