# Exercise 04 — Iterative deepening and IDA*

**Book:** Section 2.2.2 · **Guide:** [docs/ch02/03-search-methods.md](../../../docs/ch02/03-search-methods.md)

## Implement

```cpp
Plan iterativeDeepening(const Problem& problem, int maxDepth = 64);
Plan iterativeDeepeningAStar(const Problem& problem, const Heuristic& h, int maxIterations = 1000);
```

Depth-limited depth-first search, run for limits 0, 1, 2, ..., discarding all
previous work each round.

## The traps

**Do not keep a global visited set.** This is the one thing that makes iterative
deepening different from everything else in this chapter, and the one everyone
gets wrong first. A state that was too deep down one branch may be shallow enough
down another, so marking it permanently visited will make you miss solutions.

What you *do* need is a "currently on the path" marker, to stop the search cycling
within a single branch. Set it on the way down, clear it on the way back up.

**A recursive helper is far easier than an explicit stack** for the
depth-limited search. Take the recursion.

**For IDA*, choosing the next bound is the whole exercise.** Raise it by a fixed
step and you either re-explore the same tree (too small) or overshoot the optimum
(too large). The right answer: have the bounded search return the smallest `f`
value it *rejected*, and use exactly that as the next bound.

**This is genuinely slow on grids.** Discarding work is only cheap when the
branching factor is large and states are rarely revisited — which describes the
Rubik's cube and not a 4-connected grid. The tests use small maps deliberately, and
`grid_demo` refuses to run iterative deepening when the plan exceeds 12 actions.
That refusal is a result, not a workaround.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex04 --output-on-failure
```

## What the tests check

- Iterative deepening on `tiny` finds a plan of exactly the length breadth-first
  finds. That is the guarantee it exists to provide.
- On `figure2_21()` it finds 3 actions, like breadth-first.
- With a depth budget of 4 on `tiny` it reports failure, because the shortest plan
  is 9.
- IDA* on `tiny` matches Dijkstra's cost.
- IDA* with a zero heuristic on `figure2_21()` finds cost 10 — it degenerates to a
  cost-bounded uniform search, just as A* degenerates to Dijkstra.
