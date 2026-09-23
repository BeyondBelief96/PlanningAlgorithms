# Exercise 05 — From the other end

**Guide:** [Planning from the other end](../../../docs/ch02/04-backward-bidirectional.md)

## Implement

```cpp
Plan backwardDijkstra(const Problem& problem);
Plan bidirectionalSearch(const Problem& problem);
```

## Backward Dijkstra

Seed the queue with every acceptable finishing place at cost 0 and work backwards
along the taxiways until you take out the place the aeroplane is.

**Read the direction of `Transition` carefully.** `predecessors(x)` hands back
transitions whose `.x` field is the place you came *from*, and whose `.cost` is
the cost of the move at its originating end, as always:

```cpp
for (const Transition& t : problem.predecessors(x))
  candidate = costToGo[x] + t.cost;   // a candidate value for costToGo[t.x]
```

**You are computing a different quantity.** Not "what did it cost to get here" but
"what will it cost to finish from here". Hold onto that — it is the same thing
Exercise 06 computes by sweeping, and noticing the connection now makes guide 7
easy.

It is also the more useful of the two. A route answers "what should the aeroplane
do, given that it is on stand 2". A cost-to-finish from everywhere answers "what
should the aeroplane do", including from places nobody planned for: it held short
when it was not asked to, it rolled past the exit, it was told to give way and is
now sitting thirty metres from where the plan said. The capstone's Exercise 06 is
this, over a state space of directed edges, and its Exercise 12 replans out of it
without searching anything.

To turn your `next[]` / `nextAction[]` arrays into a forward-reading route:

```cpp
Plan plan = reconstructBackward(problem, problem.initialState(), next, nextAction);
```

Then argue that backward Dijkstra is still optimal. The argument mirrors the
forward induction exactly — write it out, it is four sentences.

## Bidirectional search

Grow one search from the aeroplane and one from the holding point, and stop when
they touch. `concatenate()` glues the two halves.

**One place to improve on the textbook version.** The standard pseudocode takes a
single place out of each queue per round, which is simple and can return a route
one move longer than necessary — the two searches may meet partway through a
level rather than at its boundary. Expand one whole wavefront per round instead,
always the smaller of the two, and check for a meeting after each wavefront. The
test insists:

```cpp
CHECK_EQ(both.length(), breadthFirstSearch(problem).length());
```

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex05 --output-on-failure
```

## What the tests check

- Backward Dijkstra on `bypassTaxi()` gives the same ten minutes as forward
  Dijkstra did.
- The same on `deadEndPier`.
- It **refuses** when the aircraft cannot get there — searching backwards does not
  conjure an edge that is not on the chart.
- Bidirectional matches breadth first on leg count, on pavement and on a one-way
  taxi graph.
- **Bidirectional examines no more pavement than breadth first** on `openApron`.

## The open part

> Experiment with searching from both ends. Understand and explain the trade-off
> between exploring the state space and the cost of connecting the two halves.

Here the connection is free: two wavefronts either share a square or they do not.

It stops being free the moment a state carries a heading. Two searches meeting "at
the same place" may disagree about heading by forty degrees, and closing that gap
is a planning problem of its own — which is exactly the capstone's merge ladder,
and also what RRT-Connect spends its time on. Write your answer down now so you
can compare it against the capstone's.

---

**In the book:** LaValle Sections 2.2.3 and 2.2.4, Figures 2.6 and 2.7. The
backward-optimality argument is book Exercise 6(a) and backward A\* is 6(c); the
trade-off question is book Exercise 20. `bypassTaxi()` is Figure 2.21;
`deadEndPier` and `openApron` are grids of Example 2.1.
