# Exercise 10 — The planning graph

**Book:** Section 2.5.2, Figure 2.20 · **Guide:** [docs/ch02/09-planning-graphs.md](../../../docs/ch02/09-planning-graphs.md)

Covers book Exercise 15 (build the planning graph for the light-switch model).

## Implement

```cpp
PlanningGraph buildPlanningGraph(const StripsProblem& problem, int maxLayers = 16);
bool goalPossiblyReachable(const StripsProblem&, const PlanningGraph&, int layer);
int firstGoalLayer(const StripsProblem&, const PlanningGraph&);
```

## Building the layers

- **`L_1`** — every positive literal of `S`, plus the negation of every positive
  literal not in `S`.
- **`O_i`** — every operator whose preconditions are a subset of `L_i`, **plus** one
  *trivial* operator per literal of `L_i`, whose only precondition and only effect
  is that literal.
- **`L_{i+1}`** — the union of the effects of everything in `O_i`.

The trivial operators are not an implementation detail. They are the
planning-graph counterpart of the termination action `u_T`: they carry a literal
forward so that once something is true it stays available. Without them the graph
never levels off. (`GraphOp` with `op < 0` and a nonzero `maintain` field.)

Stop when the graph levels off. Section 2.5.2 words the condition as
`O_{i+1} = O_i` and `L_{i+1} = L_i`; since `O_i` depends only on `L_i`, comparing
the literal layers is enough.

## The mutex conditions

**Two operators are mutex if any of:**

1. **Inconsistent effects** — an effect of one negates an effect of the other.
2. **Interference** — an effect of one negates a *precondition* of the other.
   Check both directions; the condition is not symmetric on its own.
3. **Competing needs** — a precondition of each are mutex in `L_i`.

**Two literals in `L_{i+1}` are mutex if either of:**

1. **Negated literals** — they form a complementary pair.
2. **Inconsistent support** — every pair of operators in `O_i` achieving them is
   mutex. **But:** "If there exists an operator that achieves both, then this
   condition is false, regardless of the other pairs of operators." That escape
   clause is easy to miss and it changes answers — in the light-switch problem it
   is why `On(Light)` and `!Dark(Room)`, both effects of `FlipOn`, are never mutex.

Mutexes are computed layer by layer, because each layer's depends on the one below
it.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex10 --output-on-failure
```

## What the tests check — Figure 2.20, exactly

- 4 literal layers, 3 operator layers, levelled off at index 3.
- Layer sizes 3, 4, 6, 6.
- `O_1` has 1 real operator and 3 trivial; `O_2` has 4 and 4; `O_3` has 4 and 6.
- `On(Cap, F)` **is** mutex with `In(Battery1, F)` at `L_3`, and **is not** at
  `L_4`. Work this one out by hand — at `L_3` the only achievers of `On(Cap, F)`
  are `PlaceCap` and `keep[On(Cap, F)]`, and both interfere with
  `Insert(Battery1)`, which needs the cap off. One layer later
  `keep[In(Battery1, F)]` has joined `O_3`, and it does not conflict with
  `PlaceCap`. That is the planning graph discovering that you put the batteries in
  *before* the cap goes back on.
- `In(Battery1, F)` and `In(Battery2, F)` are never mutex — which is exactly why
  the layered plan of (2.32) can put both inserts in one layer.
- `firstGoalLayer` is 3 for the flashlight (three operator layers) and 2 for the
  light switch.

## Debugging aid

```cpp
std::cout << toString(problem, graph);
```

or just run `logic_demo`, which prints the whole graph layer by layer with the
mutex pairs named.

## Two extensions worth doing

**Plan extraction.** The exercise stops at `goalPossiblyReachable`, the cheap
necessary test GraphPlan runs before it tries to extract anything. The extraction
itself is a backward AND/OR search from `L_i`: an "or" over the operators that
achieve each goal literal, an "and" over that operator's preconditions,
recursively down to `L_1`, with mutexes pruning branches.

**The stricter level-off test.** The book's criterion compares literal layers
only, but the mutex sets keep shrinking after the literals stop growing — you can
see it in `logic_demo`, where `L_3` and `L_4` hold the same six literals but `L_3`
has five mutex pairs and `L_4` has three. A goal pair that is mutex now may stop
being mutex later, so the book's criterion can in principle stop one layer too
early. Implement "same literals **and** same mutexes" and see which problems it
changes.
