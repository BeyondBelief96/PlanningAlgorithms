# Exercise 05 — Backward and bidirectional search

**Book:** Section 2.2.3, Figures 2.6 and 2.7 · **Guide:** [docs/ch02/04-backward-bidirectional.md](../../../docs/ch02/04-backward-bidirectional.md)

## Implement

```cpp
Plan backwardDijkstra(const Problem& problem);
Plan bidirectionalSearch(const Problem& problem);
```

## Backward Dijkstra

Seed `Q` with every state of `goalStates()` at cost 0 and walk `f^{-1}` until you
pop `x_I`.

**Read the direction of `Transition` carefully.** `predecessors(x)` returns
Transitions whose `.x` field is the *predecessor* `x'`, and whose `.cost` is
`l(x', u)` — the cost taken at the originating state, as always. So:

```cpp
for (const Transition& t : problem.predecessors(x))
  candidate = costToGo[x] + t.cost;   // a candidate value for costToGo[t.x]
```

**You are computing `G(x)`, not `C(x)`.** The cost-to-go, not the cost-to-come.
Hold on to that: it is the same quantity value iteration produces in Exercise 06,
and noticing the connection now makes Section 2.3.3 easy.

To turn your `next[]` / `nextAction[]` arrays into a forward-reading plan:

```cpp
Plan plan = reconstructBackward(problem, problem.initialState(), next, nextAction);
```

This is book Exercise 6(a): argue that backward Dijkstra still yields optimal
plans. The argument mirrors the forward induction exactly — write it out.

## Bidirectional search

Grow a tree from `x_I` along `f` and a tree from `X_G` along `f^{-1}`, and stop
when they touch. `concatenate()` glues the two halves.

**One place to improve on the book.** Figure 2.7 pops a single state from each
queue per iteration, which is simple but can return a plan one action longer than
necessary — the trees may meet partway through a level. Expand one whole wavefront
per round instead, always the smaller of the two, and check for a meeting after
each wavefront. The test insists on this:

```cpp
CHECK_EQ(both.length(), breadthFirstSearch(problem).length());
```

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex05 --output-on-failure
```

## What the tests check

- Backward Dijkstra on `figure2_21()` gives the same cost as forward Dijkstra: 10.
- The same on `bugTrap`.
- Failure is reported when the goal is unreachable.
- Bidirectional search matches breadth-first on plan length, on a grid and on a
  directed graph.
- **Bidirectional expands no more than breadth-first** on `openRoom`. That is book
  Exercise 20 in assertion form.

## Book Exercise 20, the open part

> Experiment with bidirectional search for grid-based planning. Try to understand
> and explain the trade-off between exploring the state space and the cost of
> connecting the trees.

Here the connection is free — two wavefronts either share a state or they do not.
In Chapter 5, where the state space is continuous, joining two trees is a
subproblem in its own right, and RRT-Connect is the algorithm built around exactly
that trade-off. Worth writing down your answer now so you can compare it later.
