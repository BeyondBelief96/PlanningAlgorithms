# Exercise 03 — The quickest route, faster

**Guide:** [Which one to look at next](../../../docs/ch02/03-search-methods.md)

## Implement

```cpp
Plan aStar(const Problem& problem, const Heuristic& h);           // cost so far + guess
Plan bestFirstSearch(const Problem& problem, const Heuristic& h); // guess alone
```

Both are Exercise 02 with a different sort key. If you parameterise the weight on
the cost-so-far term, they are literally the same function called twice.

## The traps

**The guess can be infinite.** `GridProblem::manhattan()` returns infinity for a
square from which the goal cannot be reached at all — the far side of a closed
stand, say. Adding infinity to a finite cost is legal and makes the ordering
useless. Decide what to do — the reference keeps such squares out of the queue
entirely — and write down why in a comment.

**A\* is still Dijkstra underneath.** The `dead` bookkeeping, the stale-entry
discard and the check-on-removal rule all carry over unchanged. Only the key
changes.

**Best first drops the cost-so-far entirely.** Not de-emphasises — drops. That is
what costs it optimality, and it is also what makes it fast.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex03 --output-on-failure
```

## What the tests check

- A\* with the square-corner guess is optimal on `standArea` and on
  `deadEndPier`.
- A\* with `zeroHeuristic()` gives **exactly** Dijkstra's cost — the degenerate
  case worth confirming rather than believing.
- A\* with straight-line distance is also optimal: it never overestimates either,
  it is just a weaker guess.
- **A\* with the square-corner guess examines strictly fewer squares than A\* with
  no guess** on `openApron`. That inequality is the entire measurable content of
  the exercise.
- Best first returns a legal route, and the test asserts only that its cost is *at
  least* optimal. It makes no claim that it is worse, because on this apron it
  sometimes is not.

## Once it is green

```powershell
./build/vs/Debug/surface_demo.exe open
```

The reference produces exactly these:

```
  Dijkstra                 23.000 minutes   expanded 226
  A* (Euclidean)           23.000 minutes   expanded 169
  A* (Manhattan)           23.000 minutes   expanded 129
  best first               23.000 minutes   expanded  24
```

Same route, four times, at wildly different cost to compute it.

Square-corner distance beats straight-line distance because it is *exact* on
clear pavement, while the straight line systematically undershoots — a taxiing
aeroplane cannot cut diagonally across an apron, so the straight-line distance is
never achievable and the guess is doing less work than it could.

Then notice the number that should bother you: A\* still examines **129 of 240
squares with an exact guess**. Think about why. With the guess exact, every square
on every staircase between the stand and the holding point scores the same 23, so
A\* has no reason to prefer any of them and works through the lot. That plateau is
the honest limit of heuristic search on open pavement.

It is also why the capstone's cost function carries a hotspot penalty and a turn
penalty. Not because those dominate taxi time — they do not — but because they
**break ties**, and a search with no ties to break goes very much faster.

## An open extension

`deadEndPier` makes best first *work* harder, but it still returns the best route,
because once it escapes the pier there is only one way round. Build a surface
where best first comes back with a route that is genuinely longer.

You need two routes to the holding point: a long one whose first move decreases
the guess, and a short one whose first move increases it. Add it to
`planning::maps` in `src/grid.cpp` and check it with `surface_demo`. This is the
difference between a greedy planner that is slow and a greedy planner that is
wrong, and it is worth seeing the second one with your own eyes before you ever
trust one.

---

**In the book:** LaValle Section 2.2.2. The square-corner guess is the Manhattan
heuristic and straight-line is Euclidean; comparing them is book Exercise 18, and
the `openApron` numbers are its answer — 18(a) is why Manhattan wins, and the
second half is the plateau, which motivates book Exercise 21. The open extension
is book Exercise 2. `deadEndPier` is the 2D shadow of Figure 2.5.
