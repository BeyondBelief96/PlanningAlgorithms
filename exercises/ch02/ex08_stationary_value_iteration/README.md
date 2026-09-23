# Exercise 08 — What to do from anywhere

**Guide:** [Taking the budget away](../../../docs/ch02/06-unspecified-length.md)

The high point of the unit, and the piece the capstone reuses most.

## Implement

```cpp
Stationary backwardValueIterationStationary(const Problem&, int maxIterations = 1000);
StationaryForward forwardValueIterationStationary(const Problem&, int maxIterations = 1000);
Plan planFromPolicy(const Problem&, const Stationary&);
```

## Letting the aeroplane stop is one extra term

```
still to go(place) = min( 0 if it may stop here, else infinity,
                          min over moves of [ cost of the move
                                              + still to go(where it leads) ] )
```

The stop option never appears in `successors()`. You synthesise it, and it amounts
to seeding the minimisation with `problem.finalCost(x)`:

```cpp
double best = problem.finalCost(x);    // <- this IS the stop option
for (const Transition& t : problem.successors(x))
  best = std::min(best, t.cost + current[t.x]);
```

Stopping at `x` means staying there forever, which collects zero if `x` is
somewhere the clearance permits stopping and infinity if it is not. Once you see
that, the code is three lines.

Note that on a surface this is not a no-op. It is the holding position — the one
place in a departure taxi where the aeroplane is supposed to stop and wait for
something.

## Fill in all four fields of `Stationary`

- **`history`** — every sweep in order, starting with the boundary row. Stop
  *before* appending a row identical to its predecessor.
- **`iterations`** — how many sweeps you ran, counting the final one that changed
  nothing. For the departure taxi that is 4: three that changed something, one
  that detected settlement.
- **`G`** — the settled numbers.
- **`policy`** — the best move at every place. `kTerminate` where stopping is
  right, `kNoAction` where the number is infinite, and **break ties in favour of
  stopping** so that a holding point stops rather than wandering off and coming
  back for the same cost. A strict `<` in the comparison does it.

That last one is not a numerical nicety. A planner that prefers motion to stopping
when the two cost the same is a planner that taxis an aeroplane in a circle for no
reason, and on a real surface somebody files a report about it.

## What `policy` actually is

Read it carefully, because it is the single biggest idea here. It is not a route.
It is an instruction for **every square of the airport**: if the aeroplane is
here, do this. Which means it answers for places the route never intended to
visit, it answers immediately with no search, and an aeroplane that drifts one
square off does not need a new plan — it needs to look up the number under its
wheels.

The capstone's Exercise 06 computes one of these over a state space of directed
edges, and its Exercise 12 replans out of it. That is what all of this is for.

## The forward direction is not symmetric

Stopping means something different going forward, and the difference is the point:

- Backwards: "finish here and collect the final cost".
- Forwards: "we already arrived here and stopped", so the previous value at `x`
  competes with every one-move extension that lands on `x`.

```cpp
double best = current[x];              // we already got here
for (const Transition& t : problem.predecessors(x))
  best = std::min(best, current[t.x] + t.cost);
```

Compare the two tables below until this makes sense.

## Throw a useful error

If the sweep budget passes without the numbers settling, throw
`std::runtime_error`. The message should name the actual cause: some loop of
taxiways costs less than nothing to go round, so it is preferable to go round
forever and the total never bottoms out.

This is not a hypothetical. It is what you get when somebody adds a reward for
using a preferred route without checking that the preferred route is acyclic, and
the symptom is a planner that hangs. A failure that reads "did not converge"
teaches nothing. One that names the negative cycle teaches the theorem and finds
the bug.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex08 --output-on-failure
```

## What the tests check

`departureTaxi()`, backwards, budget removed:

```
                  STAND 2  APRON  TWY A  HS 27 E  RWY 27
 start               inf    inf    inf        0     inf
 after 1 sweep       inf      4      1        0     inf
 after 2 sweeps        6      2      1        0     inf
 after 3 sweeps        4      2      1        0     inf
 settled               4      2      1        0     inf      iterations == 4
```

The same graph forwards, from an aeroplane already on the apron:

```
                  STAND 2  APRON  TWY A  HS 27 E  RWY 27
 start               inf      0    inf      inf     inf
 after 1 sweep       inf      0      1        4     inf
 after 2 sweeps        2      0      1        2       5
 after 3 sweeps        2      0      1        2       3
 settled               2      0      1        2       3      iterations == 4
```

Hold the first against Exercise 06's table and notice what the stop option bought:
the holding point is 0 in every row, the columns only ever go down, and `RWY 27`
is still infinite — because it genuinely is, and a refusal correctly computed is
the right answer.

Plus: `policy[HS 27 E]` is stop, `policy[RWY 27]` is no-action, the rolled-out
route costs four minutes in three legs, and the settled number at the stand agrees
with Dijkstra on `deadEndPier`.

**The route choice** is in here too, on `bypassTaxi()`:

```
 still to go:   [10, 8, 4, 1, 0]      from stand 1 to the 36 holding point
 already spent: [ 0, 2, 6, 9, 10]
```

with the first number of one equal to the last number of the other. Do this one on
paper first. It takes five minutes and it is the cheapest possible check on
whether you understand the recurrence.

## Then read guide 7

[Two algorithms, one idea](../../../docs/ch02/07-dijkstra-revisited.md) explains
why this and Exercise 02 are the same algorithm, and why you would ever keep the
slow one. It will not make sense until you have written both.

---

**In the book:** LaValle Section 2.3.2, Formulation 2.3. The stop option is the
termination action `u_T`; the settled recurrence is (2.18) and reading the policy
back out is (2.19). The two tables are **Figures 2.14 and 2.15** exactly, with
a → STAND 2, b → APRON, c → TWY A, d → HS 27 E, e → RWY 27 (Figure 2.15 has
`x_I = b`). The route choice is book Exercise 1 on Figure 2.21. On negative
cycles the book says: "the optimization model itself appears flawed."
