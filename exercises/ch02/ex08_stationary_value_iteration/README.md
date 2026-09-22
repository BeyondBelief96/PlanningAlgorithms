# Exercise 08 — Value iteration for plans of unspecified length

**Book:** Section 2.3.2, Figures 2.14 and 2.15 · **Guide:** [docs/ch02/06-unspecified-length.md](../../../docs/ch02/06-unspecified-length.md)

The conceptual high point of the chapter, and the piece that gets reused most.

## Implement

```cpp
Stationary backwardValueIterationStationary(const Problem&, int maxIterations = 1000);
StationaryForward forwardValueIterationStationary(const Problem&, int maxIterations = 1000);
Plan planFromPolicy(const Problem&, const Stationary&);
```

## The termination action is one extra term

```
G*(x) = min( l_F(x), min over u of [ l(x, u) + G*(f(x, u)) ] )
```

`u_T` never appears in `successors()`. You synthesise it, and it amounts to
seeding the minimisation with `problem.finalCost(x)`:

```cpp
double best = problem.finalCost(x);    // <- this IS the termination action
for (const Transition& t : problem.successors(x))
  best = std::min(best, t.cost + current[t.x]);
```

Applying `u_T` at `x` means stopping there forever, which collects `l_F(x)` — 0 at
a goal, `inf` elsewhere. Once you see that, the code is three lines.

## Fill in all four fields of `Stationary`

- **`history`** — row 0 is `G*_0 = l_F`, row `k` is `G*_{-k}`. Stop *before*
  appending a row identical to its predecessor, so `history` matches Figure 2.14
  down to but not including the repeat.
- **`iterations`** — how many sweeps you ran, counting the final one that changed
  nothing. (For Figure 2.14 that is 4: three sweeps that changed something, one
  that detected stationarity.)
- **`G`** — the stationary values.
- **`policy`** — the argmin of (2.19). `kTerminate` where stopping is optimal,
  `kNoAction` where `G` is infinite, and **break ties in favour of `kTerminate`**
  so that a goal state stops instead of wandering off and returning for the same
  cost. A strict `<` in the comparison does it.

## The forward direction is not symmetric

`u_T` means something different going forward, and the difference is the point:

- Backward: "stop here and collect `l_F`".
- Forward: "we already arrived at `x` and stopped", so the previous value
  `C*_k(x)` competes with every one-step extension that lands on `x`.

```cpp
double best = current[x];              // termination: we already got here
for (const Transition& t : problem.predecessors(x))
  best = std::min(best, current[t.x] + t.cost);
```

Compare Figures 2.14 and 2.15 until this makes sense.

## Throw a useful error

If `maxIterations` passes without stabilising, throw `std::runtime_error`. The
message should name the actual cause — the cost functional admits a **negative
cycle**, which means it is preferable to loop forever and drive the total to
`-inf`. As the book puts it, "the optimization model itself appears flawed."

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex08 --output-on-failure
```

## What the tests check

Figure 2.14 for `figure2_8()`:

```
         a    b    c    d    e
 G*_0   inf  inf  inf    0  inf
 G*_-1  inf    4    1    0  inf
 G*_-2    6    2    1    0  inf
 G*_-3    4    2    1    0  inf
 G*        4    2    1    0  inf      iterations == 4
```

Figure 2.15 for the same graph with `x_I = b`:

```
         a    b    c    d    e
 C*_1   inf    0  inf  inf  inf
 C*_2   inf    0    1    4  inf
 C*_3     2    0    1    2    5
 C*_4     2    0    1    2    3
 C*        2    0    1    2    3      iterations == 4
```

Plus: `policy[d] == kTerminate`, `policy[e] == kNoAction` (`d` is unreachable from
`e`), the rolled-out plan costs 4 in 3 actions, and `G*(x_I)` agrees with Dijkstra
on a grid.

**Book Exercise 1** is in here too, on `figure2_21()`: backward gives
`G* = [10, 8, 4, 1, 0]`, forward gives `C* = [0, 2, 6, 9, 10]`, and
`G*(a) == C*(e) == 10`. Do this one on paper first — it takes five minutes and it
is the cheapest possible check on whether you understand the recurrence.

## Then read guide 7

[docs/ch02/07-dijkstra-revisited.md](../../../docs/ch02/07-dijkstra-revisited.md)
explains why this and Exercise 02 are the same algorithm. It will not make sense
until you have written both.
