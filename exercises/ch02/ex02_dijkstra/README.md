# Exercise 02 — The quickest route

**Guide:** [Which one to look at next](../../../docs/ch02/03-search-methods.md)

## Implement

```cpp
Plan dijkstra(const Problem& problem);
```

The same template as Exercise 01, with the queue ordered by how cheap it was to
reach each place. This is the first method here whose answer you would actually
give a crew.

## The traps

**Line 12 of the template finally does something.** In breadth first and depth
first, meeting a place a second time was a no-op. Here, a place already in the
queue may have turned out to be reachable more cheaply, and its cost has to come
down.

**There is no lowering a key in `std::priority_queue`.** Push a second entry at
the lower cost and throw away stale ones as they surface:

```cpp
if (dead[x]) continue;   // already taken out, so this copy is stale
```

Before you write that, convince yourself it is safe. The argument is the induction
in the guide: the first time a place comes out its cost is already final, so every
later copy can only be worse.

**Mark dead when you take a place out, not when you put it in.** This is the
opposite of Exercise 01, and getting it wrong gives you a planner that silently
returns slow routes on some airports and correct ones on others — the worst kind
of bug, because it passes the test you happen to have written.

**Check for arrival on removal.** The cost of reaching a place is only known to be
final at the moment it comes out of the queue. Return when you *generate* the
holding point and you return a route that merely reaches it, not one that reaches
it quickly.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex02 --output-on-failure
```

## What the tests check

- **`bypassTaxi()`: ten minutes, four legs.** Not the three-leg route at thirteen
  that breadth first found in Exercise 01. Stand 1, apron, taxiway A, cut north
  through B, holding point: 2 + 4 + 3 + 1. Staying on A all the way round is one
  leg shorter and three minutes slower.

  This is the exercise's whole content. Fewest turns is not quickest, and until
  now nothing you wrote could tell the difference.
- **`departureTaxi()`: four minutes, three legs.** Push back, turn onto A, up to
  the holding point. Going straight out on the apron lanes is one leg shorter and
  twice as slow.
- `maps::standArea()`: nine.
- On an 8-connected surface — where a diagonal move costs sqrt(2) — Dijkstra's
  cost is no worse than breadth first's, because fewest moves and quickest have
  stopped being the same question.
- It refuses when there is no route.

## A thing worth noticing

Run both on `deadEndPier` and compare `expanded`. Dijkstra is not faster than
breadth first here — with every move costing the same it examines the same
pavement in almost the same order. What it bought you is not speed. It is the
ability to be given a cost function at all, and that is what Exercise 03 turns
into speed.

---

**In the book:** LaValle Section 2.2.2. `bypassTaxi()` is Figure 2.21;
`departureTaxi()` is Figure 2.8, and the four minutes is `G*(a)` as printed in
Figure 2.14 — you are computing a number the book prints. The running time here
is `O(|E| log |V|)` with lazy deletion, against the `O(|V| log |V| + |E|)` the
book quotes for a Fibonacci heap.
