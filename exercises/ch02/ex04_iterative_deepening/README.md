# Exercise 04 — Without holding the frontier

**Guide:** [Which one to look at next](../../../docs/ch02/03-search-methods.md)

## Implement

```cpp
Plan iterativeDeepening(const Problem& problem, int maxDepth = 64);
Plan iterativeDeepeningAStar(const Problem& problem, const Heuristic& h, int maxIterations = 1000);
```

Depth-limited depth-first search, run for limits 0, 1, 2, …, discarding all
previous work each round.

The point is memory. Breadth first holds the entire frontier; on a grid of
pavement that is fine, and on a state space of poses it is not. This method gets
breadth first's answer while holding one branch at a time.

## The traps

**Do not keep a record of everywhere you have been.** This is the one thing that
makes iterative deepening different from everything else here, and the one
everybody gets wrong first. A place too deep down one branch may be shallow enough
down another, so marking it permanently visited will make you miss routes that
exist.

What you *do* need is a "currently on this branch" marker, to stop the search
taxiing in a circle within one branch. Set it on the way down, clear it on the way
back up.

**A recursive helper is far easier than an explicit stack** for the depth-limited
part. Take the recursion.

**For IDA\*, choosing the next ceiling is the whole exercise.** Raise it by a
fixed step and you either re-explore the same ground (too small) or step straight
over the answer (too large). The right answer: have the bounded search report the
smallest value it *rejected*, and use exactly that next.

**This is genuinely slow on pavement.** Discarding work is only cheap when each
place has many options and few places are reachable two ways — which describes a
Rubik's cube and a turnaround description, and does not describe a 4-connected
grid. The tests use small surfaces deliberately, and `surface_demo` refuses to run
it when the route exceeds 12 moves:

```
iterative deepening     skipped: the shortest route is 23 moves, and depth-limited
                        search with no visited set is exponential in that
```

That refusal is a result, not a workaround. Even where it does run, the price is
visible — on `standArea`, for a nine-move route:

```
  breadth first             9.000       9         32         32
  iterative deepening       9.000       9       2031       2021
```

Same answer, sixty times the work, for a memory saving that is worth nothing on a
35-square airport and everything on a state space of poses. Knowing which method
suits which state space is most of what this exercise is for.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex04 --output-on-failure
```

## What the tests check

- On `standArea` it finds a route of exactly the length breadth first finds.
  That guarantee is the entire reason the method exists.
- On `bypassTaxi()` it finds three legs, like breadth first.
- With a depth budget of four on `standArea` it **reports failure**, because the
  shortest way round the pier is nine moves. It must refuse rather than return
  the best thing it found.
- IDA\* on `standArea` matches Dijkstra's cost.
- IDA\* with a zero guess on `bypassTaxi()` finds ten minutes — it degenerates to
  a cost-bounded uniform search, exactly as A\* degenerates to Dijkstra.

---

**In the book:** LaValle Section 2.2.2, including the description of iterative
deepening as "a way of converting depth-first search into a systematic search
method". `bypassTaxi()` is Figure 2.21; `standArea` is the small grid of Example
2.1.
