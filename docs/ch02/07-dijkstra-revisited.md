# 7. Two algorithms, one idea

> No new exercise; this one ties Exercises 02, 07 and 08 together.

You have now written two programs that compute the same numbers by visibly
different means. This guide explains why, and — more usefully — why you would ever
keep the slow one.

## The observation

Look at the forward table from guide 6 again, for an aeroplane on the apron:

```
                  STAND 2  APRON  TWY A  HS 27 E  RWY 27
 start               inf      0    inf      inf     inf
 after 1 sweep       inf      0      1        4     inf
 after 2 sweeps        2      0      1        2       5
 after 3 sweeps        2      0      1        2       3
```

Every sweep recomputes a number for all five places, and almost nothing changes.
`APRON` is 0 from the start and stays there. `TWY A` reaches 1 in the first sweep
and never moves again. The only cells doing any work are the handful on the
frontier.

**Dijkstra's algorithm is value iteration that only touches those cells.**

## The dictionary

The correspondence is exact:

| Sweeping the whole airport | Dijkstra |
|---|---|
| a place whose number is still infinity | **unvisited** — nothing has reached it |
| a place whose number has stopped changing | **dead** — taken out of the queue |
| a place with a finite number that might still improve | **alive** — in the queue |
| one sweep lowering a number | one relaxation along one edge |

> Dijkstra's algorithm is very much like value iteration, except that it
> efficiently maintains the set of places within which the numbers can still
> change.

And at the end, both have computed the same thing.

You can watch it happen:

```powershell
./build/vs/Debug/surface_demo.exe open
```

```
  Dijkstra           23.000 minutes   expanded 226
  value iteration    23.000 minutes   swept every square 28 times
```

240 squares × 28 sweeps ≈ 6,700 updates, against Dijkstra's 226, for an identical
answer.

## So why keep the slow one?

Three reasons, and the third is the one that matters for the capstone.

**1. Dijkstra needs every move to cost at least nothing.** Its correctness rests
entirely on the induction in [guide 3](03-search-methods.md): the cheapest thing
in the queue cannot be reached more cheaply, *because everything else in the queue
already costs more and moves never refund you*. Introduce a negative move and the
argument collapses. Value iteration tolerates negative costs perfectly well, as
long as no cycle is negative.

**2. Dijkstra needs to know where a move leads.** Not "probably leads" — leads.
Once you are planning against an aircraft that may or may not make the turn, or a
pushback whose duration is a distribution, the move no longer has one outcome and
the minimisation becomes a minimisation over an expectation. The sweeping
recurrence absorbs that change essentially unaltered. Dijkstra has nothing to say
about it.

**3. Dijkstra needs to know where the aeroplane is.** This sounds like a
guarantee and is not. Surface surveillance drops out. A transponder goes
unserviceable. The aircraft reports a position that is eight metres from where
its nose actually is. Planning when the state is not directly observable is a
whole field, and the sweeping recurrence carries over into it; the priority-queue
argument does not.

There is a fourth reason, and it is the one that runs straight into the capstone:

> **Value iteration hands you the number for everywhere, not just along one
> route.**

Dijkstra stops the moment it takes the goal out of the queue. It has no opinion
about the far side of the airport, because it never went there. Value iteration
hands you a function over every place, from which

```
best move at x = argmin over moves of [ cost of the move + still to go(where it leads) ]
```

tells you what to do from *any* place, including ones the route never touched.

That is why `Stationary` carries a `policy` field, why the capstone's Exercise 06
is a backward sweep rather than a forward search, and why its Exercise 12 can
replan without searching anything. An aeroplane that stopped twenty metres short
of where the plan expected does not need a new plan. It needs to look up the
number under its wheels.

## A comparison worth doing yourself

> Implement both Dijkstra and forward value iteration on the same problem. Verify
> they find the same routes. Comment on the difference in performance.

You have already written both — Exercise 02 and Exercise 08. To do it properly:

```cpp
const GridProblem problem = GridProblem::fromAscii(maps::deadEndPier());
const Plan viaDijkstra = dijkstra(problem);
const StationaryForward viaSweeping = forwardValueIterationStationary(problem);

// the numbers agree...
assert(viaSweeping.C[goal] == viaDijkstra.cost);
// ...but count the work
const long long dijkstraUpdates = viaDijkstra.generated;
const long long sweepUpdates = 1LL * problem.numStates() * viaSweeping.iterations;
```

Then ask the question this is really driving at: is there a problem where the
sweeping wins outright? Try a small, densely connected state space, so that the
priority queue's overhead dominates while the sweeps stay cheap. A taxiway graph
of forty nodes where everything connects to everything is close to that shape.
The answer is not always what you expect, and it is the reason both algorithms
are still in use.

## A thing worth noticing about A\*

Since A\* is Dijkstra with "cost so far + guess" as the key, and Dijkstra is
sweeping with a frontier, A\* is **sweeping with a frontier and a hint about where
the goal is**.

Heuristic search and dynamic programming are not two schools. They are two ends
of one dial. Guide 6 sits at one end and guide 3 at the other, and the capstone
uses both within one pipeline: a backward sweep for the cost-to-go over the whole
taxiway graph, and an A\*-shaped search over poses that uses that sweep *as its
guess*. Once you see that, Exercise 09 of the capstone stops looking like a new
algorithm and starts looking like Exercise 03 with a better heuristic.

---

## In the book

LaValle Section 2.3.3, pages 56–57. The quoted dictionary line and the
conclusion that both algorithms end with the stationary optimal cost-to-come `C*`
are from that section, which closes by framing value iteration as the general
method and Dijkstra as the special case that falls out "only under some special
conditions".

The three limitations above correspond to the book's: nonnegative costs, a
deterministic transition function (Chapter 10 replaces `f(x, u)` with a
distribution and the `min` with a `min` over an expectation), and an observable
state (Chapter 11 plans in information spaces). The "number for everywhere"
point is the feedback plan of Chapter 8, which is the largest thing Chapter 2
sets up.

The comparison exercise is book Exercise 23.

---

Next: [describing a job instead of drawing it](08-logic-formulation.md). A change
of register — the state space stops being given and starts being *described*.
