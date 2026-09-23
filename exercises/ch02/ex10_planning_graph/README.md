# Exercise 10 — How early could it finish?

**Guide:** [How early could it finish?](../../../docs/ch02/09-planning-graphs.md)

Searching the turnaround for a plan is expensive, and the plan is often not what
anybody wants. What the ramp wants is a *number*: can this aircraft be ready in
twenty-five minutes, or should the gate be re-sequenced now?

This exercise builds the structure that answers that without searching anything.

## Implement

```cpp
PlanningGraph buildPlanningGraph(const StripsProblem& problem, int maxLayers = 16);
bool goalPossiblyReachable(const StripsProblem&, const PlanningGraph&, int layer);
int firstGoalLayer(const StripsProblem&, const PlanningGraph&);
```

## Building the rounds

- **First fact layer** — every fact true when the aeroplane parks, plus the
  negation of every positive fact not listed.
- **A job layer** — every job whose preconditions are all present in the fact
  layer below it, **plus** one *do-nothing* job per fact, whose only precondition
  and only effect is that fact.
- **The next fact layer** — everything the jobs below it make true.

The do-nothing jobs are not an implementation detail. They carry a fact forward so
that once something is true it stays available, and without them the structure
never settles and only plans of exactly the right length can be represented. Same
idea as the stop option in Exercise 08, wearing a different hat. (`GraphOp` with
`op < 0` and a nonzero `maintain` field.)

Stop when a round produces the same facts and the same jobs as the round before.
Since the jobs are determined entirely by the facts, comparing the fact layers is
enough.

## What conflicts with what

**Two jobs conflict if any of:**

1. **Opposite effects** — one makes a fact true and the other makes it false.
2. **Interference** — one's effect negates the other's *precondition*. Check both
   directions; the condition is not symmetric on its own. *Shutting the door
   interferes with loading, because loading needs it open.*
3. **Competing needs** — a precondition of each conflict in the layer below.

**Two facts conflict if either of:**

1. **They are opposites** — a fact and its own negation.
2. **No consistent way to get both** — every pair of jobs below achieving one and
   the other respectively is itself a conflicting pair. **But:** *"if there exists
   an operator that achieves both, then this condition is false, regardless of the
   other pairs of operators."* That escape clause is easy to miss and it changes
   answers — in the ground power model it is why "the GPU is connected" and "the
   aeroplane is off its battery", both effects of `ConnectGpu`, never conflict.

Conflicts are computed round by round, because each round's depend on the one
below it.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex10 --output-on-failure
```

## What the tests check

- 4 fact layers, 3 job layers, settled at index 3.
- Layer sizes 3, 4, 6, 6.
- Round 1 has 1 real job and 3 do-nothings; round 2 has 4 and 4; round 3 has 4
  and 6.
- **"The door is shut" conflicts with "ULD1 is aboard" at round 3, and does not at
  round 4.** Work this one out by hand. At round 3 the only ways to have the door
  shut are to shut it or to never have opened it, and both interfere with loading,
  which needs it open. One round later `keep[Loaded(ULD1)]` has joined the job
  layer, and *that* does not conflict with shutting the door. The structure has
  discovered, on its own, that you load first and shut afterwards.
- **The two containers never conflict with each other** — two loaders, two
  containers, one open door. Which is exactly why both loads can go in the same
  round, and why the turnaround is three rounds rather than four jobs' worth of
  time.
- `firstGoalLayer` is 3 for the hold and 2 for ground power.

That first number is the answer the ramp wanted: *not before the third round,
whatever you do*, computed in polynomial time without deciding who does what.

## Debugging aid

```cpp
std::cout << toString(problem, graph);
```

or just run `turnaround_demo`, which prints every round with its conflicting pairs
named.

## Two extensions worth doing

**Pull an actual plan out.** The exercise stops at `goalPossiblyReachable`, the
cheap necessary test that gets run *before* anyone tries. The extraction itself is
a backward search: for each goal fact pick a job that produces it, then
recursively achieve that job's preconditions, down to the first round, with
conflicts pruning branches. Worst case exponential, which is expected — the
problem is NP-hard.

**The stricter settling test.** The rule above compares fact layers only, but the
conflict sets keep shrinking after the facts stop growing — you can see it in
`turnaround_demo`, where rounds 3 and 4 hold the same six facts but round 3 has
five conflicting pairs and round 4 has three. A goal pair that conflicts now may
stop conflicting later, so the simple rule can in principle stop one round too
early. Implement "same facts **and** same conflicts" and see which problems it
changes.

---

**In the book:** LaValle Section 2.5.2, the Blum–Furst planning graph, and this
covers book Exercise 15 (build the planning graph for the light-switch model —
here `groundPowerProblem()`). Conflicting pairs are *mutex* pairs; the three
operator conditions and two literal conditions are exactly as listed, and the
escape clause is quoted verbatim. The levelling-off criterion is `O_{i+1} = O_i`
and `L_{i+1} = L_i`. The worked example is **Figure 2.20** on the flashlight of
Example 2.6 — here the hold, relabelled fact for fact — and the parallel loads
are the layered plan of equation (2.32).
