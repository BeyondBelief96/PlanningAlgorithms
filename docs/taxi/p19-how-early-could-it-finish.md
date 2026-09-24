# Problem 19 — How early could it possibly finish?

## The situation

Searching a turnaround description for a plan, as Problem 18 does, is
exponential in the number of facts. Often the question somebody actually asked
is cheaper:

> *"We are on stand at 0740. Can we be off by 0820, or should I go and tell
> operations now?"*

They do not want the plan. They want a **floor** — "not before the third round,
whatever you do" — and they want it before the kettle boils.

## The idea

Assume every job that *could* run does run, all at once, round after round.
Track only which pairs of things cannot honestly hold together.

The structure over-approximates on purpose: a fact appears in round *i* if
*some* i-round plan could make it true, ignoring how the jobs that would have to
run together interact. The **conflict pairs** claw back some of that optimism
cheaply, and what is left is polynomial in size where Problem 18's state space
is exponential.

## Write

```ts
buildRoundGraph(desc, maxRounds?): RoundGraph
couldBeDoneBy(desc, graph, round): boolean
earliestRound(desc, graph): number
```

## The construction

Round 1 is the aeroplane as it arrives: every fact, with the value it has.

Then, repeatedly:

**What could run** — every job whose needs are all present this round, **plus
one do-nothing per fact**. The do-nothings carry an undisturbed fact into the
next round; they are the round-graph version of "stop", and without them a fact
nobody touched would vanish.

**Job conflicts** — two entries conflict when

1. they leave the world in contradictory states;
2. one undoes something the other needs; or
3. what they each need was already in conflict a round ago.

**The next round of facts** — everything anything leaves behind.

**Fact conflicts** — a fact and its own negation, always. Otherwise: when
*every* way of producing the one conflicts with *every* way of producing the
other. One job producing both settles it at once, in the negative.

Stop when a round comes out the same as the one before. The graph has levelled
off and nothing new will ever appear.

## Examples

**1 — the hold levels off at the fourth round.**

```ts
buildRoundGraph(cargoHold()).levelledOffAt  ->  3
```

**2 — and its floor is three rounds.**

```ts
earliestRound(cargoHold(), graph)  ->  3

couldBeDoneBy(hold, graph, 2)  ->  false
couldBeDoneBy(hold, graph, 3)  ->  true
```

Open the door; load both containers **at once**; shut the door. Three rounds is
genuinely achievable if the two loaders work in parallel, and no amount of
cleverness does it in two. Compare Problem 18's four *sequential* jobs — this is
the parallel answer, and that is exactly the question the ramp asked.

**3 — ground power.**

```ts
earliestRound(groundPower(), graph)  ->  2
```

## The conflict that earns its keep

In round 3 the hold can be shut, and it can have ULD1 in it, but **not both** —
because everything that shuts the door conflicts with everything that loads it.

That one conflict pair is the only thing standing between an optimistic floor of
two rounds and the honest answer of three. Delete the conflict logic and the
structure still builds, still levels off, and quietly lies.

## Constraints

- The floor may be optimistic. It may **never** be higher than a real answer, or
  it would rule out a turnaround that works. The test checks it against
  Problem 18's sequential plan.
- `couldBeDoneBy` is **necessary, not sufficient**. "Not ruled out yet" is
  exactly the cheap test worth doing before you go and search.
- A round that does not exist answers no, not an exception.

## Traps

**Forgetting the do-nothings.** Without one per fact, a fact nobody touched
disappears from the next round and the structure never levels off.

**Levelling off too early.** Real GraphPlan waits longer than this: the conflict
sets keep shrinking for a while after the fact sets stop growing, and a goal
pair that is in conflict now may stop being so later. Comparing the fact rounds
is enough for these two descriptions and is not enough in general — which is
worth knowing before you use this on something real.

## Edge cases the tests also check

- A fact is always in conflict with its own negation.
- The round budget is respected.

## Follow-up

The floor is half of GraphPlan. The other half is the backward search that
extracts an actual parallel plan from the structure, layer by layer, with
memoised failures. Write it; then run it on `winterTurnaround()`'s jobs
expressed as facts and see whether the answer matches Problem 12's critical
path. It should, and the two computations have almost nothing in common.

*In the book:* LaValle Section 2.5.2, the Blum–Furst planning graph. A conflict
pair is what the literature calls a mutex; the hold's structure is Figure 2.20.
