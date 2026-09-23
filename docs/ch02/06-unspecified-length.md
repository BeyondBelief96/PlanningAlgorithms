# 6. Taking the budget away

> Exercise: [08, no budget](../../exercises/ch02/ex08_stationary_value_iteration/README.md)

Guide 5 demanded exactly K moves, which produced two absurdities: a holding point
with an infinite value, and numbers that go up and down as the budget changes.
One small addition fixes both, and what is left is the object the capstone is
built on.

## Let the aeroplane stop

> Every place has one extra option available: stop. Applying it leaves the
> aeroplane where it is, forever, at no further cost.

That is the whole mechanism, and it is worth appreciating how neatly it works. A
two-move route to the holding point now costs *exactly the same* as the five-move
route "taxi, taxi, stop, stop, stop". Padding is free. Which means:

> optimising over routes of exactly K moves = optimising over routes of at most K
> moves

and the fixed-budget machinery of guide 5 suddenly answers the question anybody
actually wanted to ask.

In the code this option is `planning::kTerminate`, and it deliberately does
**not** appear in `successors()`. Algorithms that need it synthesise it, which is
exactly one extra term in the minimisation:

```cpp
double best = problem.finalCost(x);           // this IS the stop option
for (const Transition& t : problem.successors(x))
  best = std::min(best, t.cost + current[t.x]);
```

Stopping at `x` collects `finalCost(x)` — zero if `x` is somewhere the clearance
permits stopping, infinity if it is not. Once you see that, the code writes
itself.

And note what the stop option *means* on a surface. It is not a no-op. It is the
holding position: the one place in a departure taxi where the aeroplane is
supposed to stop and wait for something. The capstone gives it a whole exercise,
because stopping in the right place is the entire safety case.

## Sweeping until nothing changes

Drop K entirely and just keep sweeping. Eventually the numbers stop moving: one
whole pass over every place changes nothing. At that point the step count has
stopped mattering and you can throw it away:

```
still to go(place) = min( 0 if you may stop here, else infinity,
                          min over moves of [ cost of the move
                                              + still to go(where it leads) ] )
```

### Why it always stops

For every place there either exists a route to somewhere acceptable at finite
cost, or there is none. Take the largest number of moves over all the best routes
from all the places that have one; that is an upper bound on the number of sweeps
needed. Any further sweep is only considering worse routes.

This depends on no move costing less than nothing. Some negative costs are
survivable, but a **negative cycle** — a loop you profit from going round — makes
it preferable to go round forever, drives the total to minus infinity, and the
numbers never settle.

On a taxiway graph that is not a hypothetical to shrug at. It is what you get
when somebody adds a "reward" for using a preferred route without checking that
the preferred route is acyclic, and the symptom is a planner that hangs. In
Exercise 08 you throw `std::runtime_error` when the sweep budget is exceeded, and
the message should say what it actually means. A failure that reads "did not
converge" teaches nothing; one that reads "some loop of taxiways costs less than
nothing to go round" teaches the theorem and names the bug.

## The same taxi, with the budget removed

```
                  STAND 2  APRON  TWY A  HS 27 E  RWY 27
 start               inf    inf    inf        0     inf
 after 1 sweep       inf      4      1        0     inf
 after 2 sweeps        6      2      1        0     inf
 after 3 sweeps        4      2      1        0     inf
 settled               4      2      1        0     inf
```

Hold that against the budgeted table in guide 5 and notice what the stop option
bought:

- **`HS 27 E` is 0 in every row.** Being at the holding point is enough, because
  the aeroplane is allowed to stop there. That is the correct answer and the
  budgeted table could not give it.
- **The columns only ever go down.** More sweeps can only help, since padding is
  free. The oscillation is gone.
- **`RWY 27` is still infinite.** The holding point is genuinely unreachable from
  the runway. No amount of machinery fixes a graph with no edge in it, and the
  infinity is the right answer — a refusal, correctly computed.

`test_ex08` checks the history against those rows and asserts four sweeps. The
fourth is the one that changed nothing: it is the sweep that *detects* settlement,
so it counts but is not recorded.

## What to do, from everywhere

Once the numbers have settled you do not need to have stored anything else:

```
best move at x = argmin over moves of [ cost of the move + still to go(where it leads) ]
```

That is `Stationary::policy`, and it costs one number per place rather than one
per place per stage.

Read what it is carefully, because it is the single biggest idea in this unit.
It is not a route. It is an instruction for **every square of the airport**: if
the aeroplane is here, do this. Which means:

- it answers for places the plan never intended to visit;
- it answers *immediately*, with no search, from wherever the aircraft actually
  is;
- it degrades gracefully — an aeroplane that drifts one square off the route does
  not need a new plan, it needs to read the number under its wheels.

The capstone's Exercise 06 computes one of these over a state space of directed
edges, and its Exercise 12 replans out of it when the aircraft turns up somewhere
unexpected. That is what all this is for.

Walking the example by hand is worth five minutes. From `STAND 2`: pushing back
costs `2 + still-to-go(APRON) = 2 + 2 = 4`, which beats holding at the stand at
`2 + still-to-go(STAND 2) = 2 + 4 = 6`. Waiting is never free. From `APRON`:
turning onto A costs `1 + 1 = 2`. From `TWY A`: up to the holding point, where
the route terminates. Total 4 minutes, which is the number in the `STAND 2`
column, as it must be.

**Break ties towards stopping.** At the holding point, stopping costs 0 — and
wandering off and coming back might also cost 0 if some loop is free. Preferring
to stop on a tie is what keeps the route finite. The reference does this with a
strict inequality:

```cpp
if (candidate < best - 1e-12) { best = candidate; bestAction = t.u; }
```

This is not a numerical nicety. A planner that prefers motion to stopping when
the two cost the same is a planner that taxis an aeroplane in a circle for no
reason, and on a real surface somebody files a report about it.

## Forwards, and the shape of the asymmetry

The forward sweep settles too, giving the cost already spent to reach every
place. But "stop" means something different in that direction, and the difference
is instructive.

Backwards, stopping means "finish here and collect the final cost". Forwards, it
means "we already arrived here and stopped", so the *previous* value at `x`
competes with every one-move extension that lands on `x`:

```cpp
double best = current[x];                      // we already got here
for (const Transition& t : problem.predecessors(x))
  best = std::min(best, current[t.x] + t.cost);
```

For an aeroplane that is already out on the apron:

```
                  STAND 2  APRON  TWY A  HS 27 E  RWY 27
 start               inf      0    inf      inf     inf
 after 1 sweep       inf      0      1        4     inf
 after 2 sweeps        2      0      1        2       5
 after 3 sweeps        2      0      1        2       3
 settled               2      0      1        2       3
```

The last sweep is doing nothing useful here — after three, every reachable place
already has its final number. That is a general property, and it is the
observation that turns into Dijkstra's algorithm in the next guide.

## The route choice, done properly

`bypassTaxi()`: stand 1 out to the holding point short of 36 at the west side,
where staying on taxiway A is three legs and thirteen minutes and cutting north
through B is four legs and ten.

`test_ex08` computes it from both ends:

```
 still to go:      STAND 1  APRON  TWY A  TWY B  HS 36 W
                        10      8      4      1        0

 already spent:    STAND 1  APRON  TWY A  TWY B  HS 36 W
                         0      2      6      9       10
```

and cross-checks that the first number of one equals the last number of the
other. They must be equal: both are the taxi time from the stand to the holding
point, measured from opposite ends.

Do this one by hand before you run it. It takes five minutes and it is the
cheapest way to find out whether you actually understand the recurrence.

---

## In the book

LaValle Section 2.3.2, pages 50–56, Formulation 2.3. The stop option is the
termination action `u_T`, and the quoted description is the book's. The settled
recurrence is (2.18):

```
G*(x) = min over u in U(x) ∪ {u_T} of [ l(x, u) + G*(f(x, u)) ]
```

and reading the best action back out is (2.19).

The book's framing of running to settlement is to continue backward value
iteration past `G*_1` into `G*_0`, `G*_{-1}`, `G*_{-2}`, … The negative indices
are harmless — nothing in the recurrence depends on the particular number, you
could add nine to every index and change nothing — and they make the real point
that the stage index has stopped mattering.

The termination argument and the negative-cycle caveat are the book's, including:

> Therefore, we will assume that the cost functional is defined in a sensible way
> so that negative cycles do not exist. Otherwise, the optimization model itself
> appears flawed.

The settled table above is Figure 2.14 (Example 2.5, the same Figure 2.8 graph
with `u_T`), and the forward one is Figure 2.15 with `x_I = b`. The route-choice
tables are book Exercise 1 on Figure 2.21. The book's own remark that the last
forward iteration is useless is what Section 2.3.3 picks up.

---

Next: [two algorithms, one idea](07-dijkstra-revisited.md).
