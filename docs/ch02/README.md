# Part 1 — Planning on a hand-sized airport

Eleven exercises. One aeroplane, one small airport, and every planning method
worth knowing, built up one line of difference at a time.

The airport here is deliberately crude: squares of pavement that are usable or
not, taxiway graphs with five nodes, costs in whole minutes. The aeroplane is a
point that turns on the spot. None of that is true, and the capstone spends
twelve exercises making it untrue in a controlled way. What the crudeness buys is
a problem small enough that **you can check every number by hand** — and you
should, at least once, because a planner you cannot check is a planner you cannot
trust.

The three movements:

| Guides | The question | Exercises |
|---|---|---|
| 1–4 | Is there a route, and how little of the airport do I have to look at to find it? | 01–05 |
| 5–7 | What is the *quickest* route — and better, what should the aeroplane do from anywhere? | 06–08 |
| 8–10 | The taxi is only half a turnaround. What about the jobs on the stand? | 09–11 |

The third movement is a change of register and is not needed for the capstone.
Do it anyway. The planning graph and the SAT encoding are both beautiful, they
are what most of the industry means by "AI planning", and the turnaround is
genuinely half the problem — an aircraft that is not ready does not care how good
your taxi route is.

## The guides

Read in order. Each names the exercise that goes with it.

| | Guide | Exercise |
|---|---|---|
| 0 | [The vocabulary](00-notation.md) — the words, and their names in the code | — |
| 1 | [A route at all](01-feasible-planning.md) | — |
| 2 | [One search, many names](02-search-template.md) | [01](../../exercises/ch02/ex01_forward_search/README.md) |
| 3 | [Which one to look at next](03-search-methods.md) | [02](../../exercises/ch02/ex02_dijkstra/README.md), [03](../../exercises/ch02/ex03_astar/README.md), [04](../../exercises/ch02/ex04_iterative_deepening/README.md) |
| 4 | [Planning from the other end](04-backward-bidirectional.md) | [05](../../exercises/ch02/ex05_backward_bidirectional/README.md) |
| 5 | [The answer for everywhere, on a fixed budget](05-optimal-fixed-length.md) | [06](../../exercises/ch02/ex06_backward_value_iteration/README.md), [07](../../exercises/ch02/ex07_forward_value_iteration/README.md) |
| 6 | [Taking the budget away](06-unspecified-length.md) | [08](../../exercises/ch02/ex08_stationary_value_iteration/README.md) |
| 7 | [Two algorithms, one idea](07-dijkstra-revisited.md) | — |
| 8 | [Describing a job instead of drawing it](08-logic-formulation.md) | [09](../../exercises/ch02/ex09_strips_state_space/README.md) |
| 9 | [How early could it finish?](09-planning-graphs.md) | [10](../../exercises/ch02/ex10_planning_graph/README.md) |
| 10 | [Planning without a planner](10-sat.md) | [11](../../exercises/ch02/ex11_planning_as_sat/README.md) |

## Suggested pace

Four sittings.

**Sitting 1 — the template (guides 0–2, exercise 01).**
The payoff is realising that breadth first and depth first are the *same program*
with a different queue. Get that and the next three exercises are variations on
one theme.

**Sitting 2 — the search family (guides 3–4, exercises 02–05).**
Dijkstra, then A\*, then best first, then iterative deepening, then planning from
the far end. Each is a small delta on the one before. Finish by running
`surface_demo` and looking at the expanded and generated columns — that comparison
is the whole content of book Exercises 18 to 21.

**Sitting 3 — the tables (guides 5–7, exercises 06–08).**
The conceptual centre, and the part most worth slowing down for. The tests check
your tables cell by cell against the numbers in the guides, so you will know
immediately whether the recurrence is right. Finish with guide 7, which explains
why Dijkstra and the sweeping are the same algorithm seen from two angles, and
why you would keep the slow one.

**Sitting 4 — the turnaround (guides 8–10, exercises 09–11).**
The problem stops being a map you search and becomes a description you compile —
into a state space (09), into an earliest-finish bound (10), or into a Boolean
formula (11).

## The two taxi graphs

Both are sketches: minutes on a napkin, not metres on a chart. They are small
enough to solve on paper, which is the point.

**`departureTaxi()`** — stand 2 out to the holding position short of runway 27
at taxiway E. The workhorse for guides 5 and 6.

```
  STAND 2 --(2)-> STAND 2      hold at the stand, engines running
  STAND 2 --(2)-> APRON        push back and start the taxi
  APRON   --(1)-> TWY A
  APRON   --(4)-> HS 27 E      the long way round on the apron lanes
  TWY A   --(1)-> HS 27 E
  TWY A   --(1)-> STAND 2      give up and return to stand
  HS 27 E --(1)-> TWY A        abandon the crossing
  HS 27 E --(1)-> RWY 27       line up, once cleared
```

Start at `STAND 2`, finish at `HS 27 E` — a departure taxi is done when the
aeroplane is holding short, not when it is airborne. `RWY 27` has no outgoing
edges, because there is no such thing as un-entering a runway, and that is why
every table in guides 5 and 6 has an infinite column.

**`bypassTaxi()`** — stand 1 out to the holding position short of 36 at the
west, where the obvious route is not the quick one.

```
  STAND 1 --(2)-> APRON
  APRON   --(1)-> STAND 1      return to stand
  APRON   --(4)-> TWY A
  TWY A   --(3)-> TWY B        cut north on the connector
  TWY A   --(7)-> HS 36 W      stay on A, all the way round the field
  TWY B   --(1)-> TWY A
  TWY B   --(1)-> TWY B        hold on B
  TWY B   --(1)-> HS 36 W
```

Staying on A is three legs and thirteen minutes. Cutting north is four legs and
ten. Breadth first takes the thirteen; Dijkstra takes the ten. This graph exists
to make an algorithm choose.

## The three surfaces

`planning::maps`, all ASCII, all four characters: `.` pavement, `#` not movement
area, `S` the aeroplane, `G` where it is going.

- **`standArea()`** — 7×5. A stand, a pier in the way, a holding point beyond it.
  Straight-line 7, shortest route 9. Small enough to trace by hand.
- **`deadEndPier()`** — 21×10. Stands walled in on three sides, opening away from
  the goal. Punishes anything that only steers towards the goal.
- **`openApron()`** — 20×12. Wide open. Hundreds of equal-cost routes, which is
  where a good estimate earns its keep.

## The two turnaround descriptions

- **`cargoHoldProblem()`** — two containers to load and a door that must end
  shut. Three facts, four jobs, and the first job undoes part of the goal.
- **`groundPowerProblem()`** — somebody has to walk to the panel before they can
  connect the GPU. Two jobs, and a goal that names a negative.

## The demos

```powershell
./build/vs/Debug/surface_demo.exe                 # every method, every surface
./build/vs/Debug/surface_demo.exe stand --render  # ...and draw the route
./build/vs/Debug/surface_demo.exe pier
./build/vs/Debug/surface_demo.exe open

./build/vs/Debug/turnaround_demo.exe              # the hold, four ways
./build/vs/Debug/turnaround_demo.exe power        # ground power
```

Each has a `_reference` twin built against the solutions, so you can watch the
whole thing run before you have written a line.

## What carries into the capstone

The [capstone](../capstone/README.md) is twelve exercises building an autonomous
taxi planner for a real-ish airport surface, and most of it is this unit with the
lies removed.

- Its Exercise 06 is **your Exercise 05**, run backwards over a state space of
  directed edges rather than nodes, producing the cost-to-go of guide 6.
- Its Exercise 09 is **your Exercise 03**, with poses instead of squares and a
  motion model instead of four compass directions.
- Its replanning is **guide 6's policy**, used exactly as guide 6 says it should
  be: an aeroplane that is not where the plan expected does not get a new search,
  it gets a lookup.

What is new there is everything around them — a planner that is *allowed* to be
wrong about the route and never about which piece of concrete the aeroplane is
on, and that has to refuse when the clearance it was given does not reach the
goal.

## The three habits worth keeping

**The graph is never the input.** You are always handed "what can I do here" and
"will this place do", never a map. Later chapters hand you a collision checker
instead, and the same template still runs.

**The thing that comes out of the queue next is the algorithm.** Breadth first,
depth first, Dijkstra, A\* and best first differ in one line. When you meet a new
planner, find that line first.

**Backwards is not merely forwards reversed.** It needs a different computation,
which may be expensive or may not exist, and it computes a different quantity —
cost-to-go rather than cost-to-come. That quantity is a function over the whole
airport rather than a path across it, and it is the single most useful object in
this unit.

---

## In the book

This part is a hands-on companion to Steven M. LaValle, *Planning Algorithms*
(Cambridge, 2006), Chapter 2: search (Section 2.2), dynamic programming (Section
2.3), and logic-based planning (Sections 2.4–2.5). Each guide ends with an
"In the book" section giving the sections, figures and equations it covers, and
the exact renaming used.

The two taxi graphs are Figures 2.8 and 2.21 relabelled, edge for edge and cost
for cost:

| Figure 2.8 | | Figure 2.21 | |
|---|---|---|---|
| a | STAND 2 | a | STAND 1 |
| b | APRON | b | APRON |
| c | TWY A | c | TWY A |
| d | HS 27 E | d | TWY B |
| e | RWY 27 | e | HS 36 W |

Because the relabelling is exact, **every number the book prints is still a
number your code has to produce** — Figures 2.9, 2.12, 2.14, 2.15 and 2.20,
equation (2.24) and book Exercise 1 are all in the tests as literal expected
values. If your table matches the guide column for column, it matches the page.

The three surfaces are Example 2.1; the turnaround descriptions are Example 2.6
(the flashlight) and book Exercise 14 (the light switch), relabelled fact for
fact — see [guide 8](08-logic-formulation.md) for the correspondence.

Book exercises, and where they are covered:

| Book exercise | Where |
|---|---|
| 1 (value iteration on Figure 2.21) | `test_ex08`, `both_directions_agree_on_the_route_choice` |
| 2 (a 2D worst case for best-first) | open, see [guide 3](03-search-methods.md) |
| 3–5 (generalising the cost functional) | open, see [guide 5](05-optimal-fixed-length.md) |
| 6 (backward Dijkstra and A\*) | Exercise 05 |
| 7–8 (search over the STRIPS representation) | Exercise 09 |
| 9–13 (extending Formulation 2.4) | open, see [guide 8](08-logic-formulation.md) |
| 14 (the light-switch model) | `groundPowerProblem()` |
| 15 (its planning graph) | `test_ex10` |
| 16 (its SAT encoding) | `test_ex11` |
| 17 (size of the Boolean expression) | open, see [guide 10](10-sat.md) |
| 18–21 (comparing search methods) | `surface_demo` |
| 22 (backward value iteration) | Exercise 06 |
| 23 (Dijkstra vs forward value iteration) | Exercise 07, [guide 7](07-dijkstra-revisited.md) |
| 24 (multi-resolution search) | open |

Sections 2.4 and 2.5 are not needed for anything later in the book.
