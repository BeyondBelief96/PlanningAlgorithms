# Exercise 03 — A* and best-first search

**Book:** Section 2.2.2 · **Guide:** [docs/ch02/03-search-methods.md](../../../docs/ch02/03-search-methods.md)

## Implement

```cpp
Plan aStar(const Problem& problem, const Heuristic& h);          // sort by C(x) + h(x)
Plan bestFirstSearch(const Problem& problem, const Heuristic& h); // sort by h(x)
```

Both are Exercise 02 with a different sort key. If you parameterise the weight on
the cost-to-come term, they are literally the same function called twice.

## The traps

**`h(x)` can be infinite.** `GridProblem::manhattan()` returns `kInfinity` for a
state from which no goal is reachable. Adding infinity to a finite cost is legal
but makes the ordering useless. Decide what to do — the reference keeps such states
out of `Q` entirely — and write down why in a comment.

**A* is still Dijkstra underneath.** The `dead` bookkeeping, the stale-entry
discard and the test-on-pop rule all carry over unchanged. Only the key changes.

**Best-first drops `C(x)` entirely.** Not "de-emphasises" — drops. That is what
costs it optimality, and it is also what makes it fast.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex03 --output-on-failure
```

## What the tests check

- A* with the Manhattan heuristic is optimal on `tiny` and `bugTrap`.
- A* with `zeroHeuristic()` gives exactly Dijkstra's cost — the degenerate case the
  book points out.
- A* with Euclidean is also optimal: it is admissible too, just weaker.
- **A* with Manhattan expands strictly fewer states than A* with a zero heuristic**
  on `openRoom`. This is the measurable content of book Exercise 18.
- Best-first returns a valid plan, and the test asserts only that its cost is *at
  least* optimal. It makes no claim that it is worse, because on these maps it
  sometimes is not.

## Once it is green

```powershell
./build/vs/Debug/grid_demo.exe openroom
```

Expected shape of the answer (the reference produces exactly these):

```
  Dijkstra                 cost 23   expanded 226
  A* (Euclidean)           cost 23   expanded 169
  A* (Manhattan)           cost 23   expanded 129
  best first               cost 23   expanded  24
```

Book Exercise 18 asks which heuristic is superior and why. Manhattan, because it
is *exact* in obstacle-free regions of a 4-connected grid, while Euclidean
systematically undershoots — a grid robot cannot move diagonally, so the
straight-line distance is never achievable.

Then notice the number that should bother you: A* still expands 129 of 240 states
with an exact heuristic. With `Ĝ` exact, every cell on every monotone staircase
between start and goal has the same `f = 23`, and A* has no reason to prefer any
of them. That is the second half of Exercise 18, and it motivates Exercise 21 —
detect the plateau and do something less systematic.

**Book Exercise 2 is open.** Build a 2D map where best-first returns a plan that is
genuinely *worse*, not just found after more work. You need two routes to the goal:
a long one whose first step decreases `Ĝ`, and a short one whose first step
increases it. Add it to `planning::maps` in `src/grid.cpp`.
