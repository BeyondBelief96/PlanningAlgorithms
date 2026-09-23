# 9. How early could it finish?

> Exercise: [10, the planning graph](../../exercises/ch02/ex10_planning_graph/README.md)

## A cheaper question

Searching a turnaround description for a plan is expensive, and often the plan is
not what anybody wants. What the ramp wants to know is *when*: can this aircraft
be ready in twenty-five minutes, or should the gate be re-sequenced now rather
than in twenty minutes' time?

That is a cheaper question, and there is a structure that answers it without
searching anything.

The trick: assume every job that *could* run does run, all at once, round after
round. That is wildly optimistic — half of those jobs contradict each other — so
claw some of the optimism back by tracking which pairs of facts cannot honestly
hold together at the same time. What comes out is not a plan. It is a floor: *not
before the third round, whatever you do.*

> The structure indicates the states that can **possibly** be reached. The true
> reachable set is over-approximated, by eliminating many impossible states from
> consideration.

Over-approximation is the key word. A fact appearing in round `i` means "some
`i`-step plan *might* make this true", ignoring the interactions between the jobs
that would have to run together. The conflict pairs claw back some of that, and
cheaply — the structure stays polynomial in size, which the state space never is.

## Structure

Layers, alternating facts and jobs:

```
(facts_1, jobs_1, facts_2, jobs_2, facts_3, ..., facts_k+1)
```

- An edge from a fact to a job when the fact is one of the job's preconditions.
- An edge from a job to a fact when the fact is one of the job's effects.

**No variables allowed.** Every job written with a variable has to be expanded
into one copy per substitution. `cargoHoldProblem()` already does this.

### Building it

- **`facts_1`** — what is true when the aeroplane parks. Every positive fact
  listed, plus the negation of every positive fact not listed.
- **`jobs_i`** — every job whose preconditions are all present in `facts_i`,
  **plus** one *do-nothing* job per fact, whose only precondition and only effect
  is that fact.
- **`facts_i+1`** — the union of everything the jobs in `jobs_i` make true.

The do-nothing jobs are the interesting part. They carry a fact forward
untouched, so once something becomes true it stays available in every later
round. Without them the structure never settles, and only plans of exactly the
right length can be represented.

This is the *third* time in the unit that "allow doing nothing" turns a
fixed-length method into a variable-length one. Guide 6 did it with the stop
option. Guide 10 will do it again. The pattern is worth naming, because you will
reach for it yourself the first time a planner insists on a plan of exactly the
wrong length.

In this repo a do-nothing job is a `GraphOp` with `op < 0` and a nonzero
`maintain` field.

### When to stop

The criterion: stop when a round produces the same facts and the same jobs as the
round before it. Since the jobs are determined entirely by the facts, comparing
the fact layers is enough. For the hold this happens at the fourth layer.

> **A caveat worth knowing.** Real GraphPlan waits longer. The conflict sets keep
> shrinking after the fact sets stop growing — you can see it in
> `turnaround_demo`, where layers 3 and 4 hold the same six facts but layer 3 has
> five conflicting pairs and layer 4 has three. A goal pair that conflicts now may
> stop conflicting later, so stopping at fact-settlement can in principle declare
> failure too early. It does not bite on the hold, where the goal first becomes
> conflict-free at layer 4 — the very last layer built. Exercise 10 follows the
> simpler rule; the stricter test is "same facts *and* same conflicts", and
> implementing it is a worthwhile extension.

## What conflicts with what

Computed round by round, because each round depends on the one before.

**Two jobs conflict if any of:**

1. **Opposite effects** — one makes a fact true and the other makes it false.
2. **Interference** — one's effect is the negation of the other's precondition.
   Check both directions. *Shutting the door interferes with loading, because
   loading needs it open.*
3. **Competing needs** — a precondition of one conflicts with a precondition of
   the other, in the round they are both being read from.

**Two facts conflict if either of:**

1. **They are opposites** — a fact and its own negation.
2. **No consistent way to get both** — every pair of jobs in the previous round
   achieving one and the other respectively is itself a conflicting pair. And the
   escape clause that everyone misses:

   > If there exists a single job that achieves both, then this condition is
   > false, regardless of every other pair.

That escape clause changes the answer. In the ground power model, "the GPU is
connected" and "the aeroplane is off its battery" are both effects of the single
job `ConnectGpu`, so they never conflict — which is exactly why that goal is
reachable two rounds in.

## The hold, round by round

`turnaround_demo` prints this and `test_ex10` checks it:

```
L1: !Loaded(ULD2)  !Loaded(ULD1)  Closed(Door)
O1: OpenDoor  + 3 do-nothing
L2: !Loaded(ULD2)  !Loaded(ULD1)  !Closed(Door)  Closed(Door)
      conflict: (!Closed(Door), Closed(Door))
O2: CloseDoor  OpenDoor  Load(ULD1)  Load(ULD2)  + 4 do-nothing
L3: all six facts
      conflicts: the three opposite pairs,
                 plus (Closed(Door), Loaded(ULD1)) and (Closed(Door), Loaded(ULD2))
O3: all four jobs  + 6 do-nothing
L4: the same six facts
      conflicts: only the three opposite pairs
settled at layer 4
```

Follow the story. Round 1: the aeroplane is shut and empty, and the only job that
can run is opening the door. That makes "the door is open" available at round 2,
which enables both loads. By round 3 every fact is present somewhere.

But the turnaround is **not** finished at round 3, because "the door is shut"
conflicts with "ULD1 is aboard" there. Work through why: at round 3 the only ways
to have the door shut are to shut it, or to have never opened it, and both of
those interfere with loading, which needs it open. Every achiever pair conflicts,
so the facts conflict.

One round later it resolves, because "keep ULD1 aboard" has joined the job layer
and *that* does not conflict with shutting the door. Load first, then shut — which
is, of course, the plan, and also what the ramp would have told you.

## Rounds are not steps

The structure does not yield a sequence. It yields a **layered plan**: a sequence
of *sets* of jobs, where everything in one set may run in any order, or at the
same time, and everything in set `i` precedes everything in set `i + 1`. For the
hold:

```
({OpenDoor}, {Load(ULD1), Load(ULD2)}, {CloseDoor})
```

Three rounds, four jobs. Both containers go in together, because two loaders and
one open door do not conflict.

Flattening that gives back the four-job sequence, but notice that the flattening
*throws information away*. "These two may run in parallel" is exactly what a
turnaround plan is for. For a large problem the gap between rounds and jobs is
enormous, and that is the whole point: the structure reasons about far longer
plans than its round count suggests.

## What Exercise 10 does not ask for

Pulling an actual plan out of the structure is a backward search: for each goal
fact, pick a job that produces it, then recursively achieve all of *that* job's
preconditions, down to round 1, with the conflict pairs pruning branches. In the
worst case it is exponential — which is expected, since the problem is NP-hard.

Exercise 10 stops short of that. You build the layers, the conflicts, and the
cheap necessary test that GraphPlan runs *before* it bothers trying:

```cpp
bool goalPossiblyReachable(const StripsProblem&, const PlanningGraph&, int layer);
```

Every goal fact present in that round, no two of them conflicting. Necessary, not
sufficient — the structure over-approximates, so "possible" means "not ruled out
yet".

That is still the useful answer. "Not before 25 minutes" is a number the ramp can
act on, arrived at in polynomial time, without ever deciding who does what.

---

## In the book

LaValle Sections 2.5.1 and 2.5.2, pages 63–69. Before planning graphs the book
sketches **plan-space planning** — searching the space of partial plans, fixing
flaws such as unachieved preconditions and threatened causal links. It is elegant
and it was largely superseded in the mid-1990s by the two methods in guides 9 and
10; there is no exercise for it here.

The planning graph is Blum and Furst, 1997. The quoted over-approximation remark
and the levelling-off criterion (`O_{i+1} = O_i` and `L_{i+1} = L_i`) are the
book's, as is:

> A trick similar to the termination action, `u_T`, is needed even here so that
> plans of various lengths are properly handled.

The layer naming is `(L_1, O_1, L_2, O_2, …, L_{k+1})`; conflicting pairs are
*mutex* pairs, with the three operator conditions (inconsistent effects,
interference, competing needs) and the two literal conditions (negated literals,
inconsistent support) exactly as listed. The escape clause is quoted verbatim.

The worked example is Example 2.8 and Figure 2.20, on the flashlight of Example
2.6 — here the hold, relabelled as in [guide 8](08-logic-formulation.md). The
layered plan is equation (2.32) and flattening it recovers (2.24). The
ground-power mutex remark corresponds to book Exercise 15, the light switch's
planning graph.

---

Next: [planning without a planner](10-sat.md).
