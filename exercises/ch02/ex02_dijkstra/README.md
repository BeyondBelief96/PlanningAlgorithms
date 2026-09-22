# Exercise 02 — Dijkstra's algorithm

**Book:** Section 2.2.2 · **Guide:** [docs/ch02/03-search-methods.md](../../../docs/ch02/03-search-methods.md)

## Implement

```cpp
Plan dijkstra(const Problem& problem);
```

The same template as Exercise 01, with `Q` sorted by the cost-to-come `C(x)`.

## The traps

**Line 12 of Figure 2.4 finally does something.** In breadth-first and
depth-first, re-encountering a state was a no-op. Here, a state already in `Q`
may have been reached along a cheaper path, and its key must come down.

**There is no decrease-key in `std::priority_queue`.** Push a second entry at the
lower cost and discard stale entries when they surface:

```cpp
if (dead[x]) continue;   // already popped, so this copy is stale
```

Before you write that, convince yourself it is safe. The argument is the induction
in Section 2.2.2: the first time a state is popped its cost is already optimal, so
every later copy can only be worse.

**Mark dead on pop, not on insert.** This is the opposite of Exercise 01, and
getting it wrong gives you a search that silently returns suboptimal plans on some
graphs and correct ones on others — the worst kind of bug.

**Test the goal on pop.** `C(x)` only becomes `C*(x)` at the moment `x` is
removed from `Q`. Return when you *generate* the goal and you return a plan that
merely reaches it, not one that reaches it cheaply.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex02 --output-on-failure
```

## What the tests check

- `figure2_21()`: cost **10** in 4 actions, not the 3-action plan at 13. Compare
  with what breadth-first returned in Exercise 01.
- `figure2_8()`: cost **4**, which is `G*(a)` from Figure 2.14. You are computing
  a number the book prints.
- `maps::tiny()`: cost 9.
- On an 8-connected grid, Dijkstra's cost is no worse than breadth-first's —
  because with `sqrt(2)` diagonals, fewest actions and cheapest are no longer the
  same question.
- Failure is reported when no plan exists.
