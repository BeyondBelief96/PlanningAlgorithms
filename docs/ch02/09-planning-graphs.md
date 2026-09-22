# 9. Planning graphs — Sections 2.5.1–2.5.2

> Read alongside book pages 63–69, Figures 2.19 and 2.20.
> Exercise: [10, the planning graph](../../exercises/ch02/ex10_planning_graph/README.md)

## First, Section 2.5.1 in one paragraph

Before planning graphs, the book sketches **plan-space planning**: search in the
space of *partial plans* rather than states. You start with an empty plan, find a
flaw in it — an unachieved precondition, or an operator that threatens a causal
link — and fix the flaw, repeating until none remain. It is elegant, it produces
partially ordered plans directly, and it was largely superseded in the mid-1990s
by the two methods that follow. There is no exercise for it here.

## The planning graph

Blum and Furst's idea (1997): build a structure that is *polynomial* in size and
over-approximates which states are reachable, then search that instead of the state
transition graph.

> The trade-off is that the planning graph indicates states that can possibly be
> reached. The true reachable set is overapproximated, by eliminating many
> impossible states from consideration.

Over-approximation is the key word. A literal appearing in layer `i` means "some
`i`-step plan *might* make this true", ignoring the interactions between the
operators that would have to run together. Mutex pairs then claw back some of that
optimism, cheaply.

## Structure

A layered graph, alternating literals and operators:

```
(L_1, O_1, L_2, O_2, L_3, O_3, ..., L_k, O_k, L_{k+1})
```

- An edge from `l in L_i` to `o in O_i` when `l` is a precondition of `o`.
- An edge from `o in O_{i-1}` to `l in L_i` when `l` is an effect of `o`.

**No variables are allowed.** Every operator with variables must be expanded into
one copy per substitution. `flashlightProblem()` already does this.

### Building it

- **`L_1`** — the initial state. Every positive literal of `S`, plus the negation
  of every positive literal not in `S`.
- **`O_i`** — every operator whose preconditions are a subset of `L_i`, **plus** one
  *trivial* operator per literal of `L_i`, whose sole precondition and sole effect
  is that literal.
- **`L_{i+1}`** — the union of the effects of everything in `O_i`.

The trivial operators are the interesting part:

> A trick similar to the termination action, `u_T`, is needed even here so that
> plans of various lengths are properly handled.

They carry a literal forward unchanged, so once something becomes true it stays
available in every later layer. Without them the graph never levels off, and only
plans of exactly the right length are representable. Same idea as `u_T`, same
purpose, a different disguise — this is the second time in one chapter that
"allow doing nothing" turns a fixed-length method into a variable-length one, and
it is worth noticing the pattern.

In this repo a trivial operator is a `GraphOp` with `op < 0` and a nonzero
`maintain` field.

### Levelling off

The book's criterion:

> The iterations continue until the planning graph stabilizes, which means that
> `O_{i+1} = O_i` and `L_{i+1} = L_i`.

Since `O_i` is determined entirely by `L_i`, comparing the literal layers is
enough. For the flashlight this stops at `L_4`, exactly where Figure 2.20 stops.

> **A caveat the book does not spell out.** Real GraphPlan waits longer. The mutex
> sets keep shrinking after the literal sets stop growing — you can see it in
> `logic_demo`, where `L_3` and `L_4` hold the same six literals but `L_3` has five
> mutex pairs and `L_4` has three. A goal pair that is mutex now may stop being
> mutex later, so stopping at literal-stabilisation can in principle declare
> failure too early. It does not bite on the flashlight, where the goal first
> becomes non-mutex at `L_4` — the very last layer built. Exercise 10 follows the
> book; the stricter test is "same literals *and* same mutexes", and implementing
> it is a worthwhile extension.

## Mutex conditions

Computed layer by layer, because each depends on the one before.

**Two operators `o, o' in O_i` are mutex if any of:**

1. **Inconsistent effects** — an effect of `o` is the negation of an effect of `o'`.
2. **Interference** — an effect of `o` is the negation of a *precondition* of `o'`.
   Check both directions.
3. **Competing needs** — a precondition of `o` and a precondition of `o'` are mutex
   in `L_i`.

**Two literals `l, l' in L_i` are mutex if either of:**

1. **Negated literals** — they form a complementary pair.
2. **Inconsistent support** — every pair of operators in `O_{i-1}` achieving `l`
   and `l'` respectively is mutex. And the important escape clause:

   > If there exists an operator that achieves both, then this condition is false,
   > regardless of the other pairs of operators.

That escape clause is easy to miss and it changes the answer. In the light-switch
problem, `On(Light)` and `!Dark(Room)` are both effects of the single operator
`FlipOn`, so they are never mutex — which is exactly why that goal is reachable two
layers in.

## Example 2.8 — the flashlight, Figure 2.20

`logic_demo` prints this, and `test_ex10` checks it:

```
L1: !In(B2,F)  !In(B1,F)  On(C,F)
O1: RemoveCap  + 3 trivial
L2: !In(B2,F)  !In(B1,F)  !On(C,F)  On(C,F)
      mutex: (!On(C,F), On(C,F))
O2: PlaceCap  RemoveCap  Insert(B1)  Insert(B2)  + 4 trivial
L3: all six literals
      mutex: the three complementary pairs,
             plus (On(C,F), In(B1,F)) and (On(C,F), In(B2,F))
O3: all four operators  + 6 trivial
L4: the same six literals
      mutex: only the three complementary pairs
levelled off at layer 4
```

Follow the story: `L_1` is the initial state, and only `RemoveCap` applies. Taking
the cap off makes `!On(Cap, F)` available at `L_2`, which enables both inserts. By
`L_3` every literal is present.

But the goal is *not* reachable at `L_3`, because `On(Cap, F)` is mutex with
`In(Battery1, F)` there. Work through why: at `L_3`, the only achievers of
`On(Cap, F)` are `PlaceCap` and the trivial operator that keeps it on, and both
interfere with `Insert(Battery1)`, which needs the cap off. Every achiever pair is
mutex, so the literals are mutex.

One layer later that resolves, because `keep[In(Battery1, F)]` has joined `O_3` and
it does not conflict with `PlaceCap`. You can put the batteries in first and then
put the cap on — which is, of course, the plan.

## Layered plans

The planning graph does not yield a sequence. It yields a **layered plan**:

```
(A_1, A_2, ..., A_k)
```

where each `A_i` is a set of non-mutex operators that may run in any order without
changing the result. The only constraint is that everything in `A_i` precedes
everything in `A_{i+1}`. For the flashlight, equation (2.32):

```
({RemoveCap}, {Insert(Battery1), Insert(Battery2)}, {PlaceCap})
```

Linearising it gives back (2.24). Note that three layers produce a four-action
plan — layers can hold several operators at once, and for large problems that gap
is enormous. That is the whole point: the planning graph reasons about *far* longer
plans than its layer count suggests.

## Plan extraction, and what Exercise 10 does not ask for

Extraction is a backward AND/OR search from `L_i`. For each goal literal, the "or"
branch picks an operator that produces it; the "and" branch must then achieve all
of that operator's preconditions, recursively, down to `L_1`. Mutexes prune
branches. In the worst case it is exponential — which is expected, since the
problem is NP-hard.

Exercise 10 stops short of extraction. You build the graph, the mutexes, and the
cheap necessary test GraphPlan runs *before* attempting extraction:

```cpp
bool goalPossiblyReachable(const StripsProblem&, const PlanningGraph&, int layer);
```

Every literal of `G` present in that layer, no two of them mutex. Necessary, not
sufficient — the graph over-approximates. Implementing the AND/OR extraction on top
is a good extension if you want one, and the book's completeness argument (the
layers grow monotonically, the mutex sets shrink monotonically) tells you when to
stop looking.

---

Next: [planning as satisfiability](10-sat.md).
