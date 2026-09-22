# 6. Plans of unspecified length — Section 2.3.2

> Read alongside book pages 50–56, Figures 2.13–2.15.
> Exercise: [08, stationary value iteration](../../exercises/ch02/ex08_stationary_value_iteration/README.md)

Formulation 2.2 demanded exactly `K` actions, which produced the two oddities in
Figure 2.9: a goal state with infinite value, and values that go up and down as `K`
changes. Formulation 2.3 fixes both with one small addition.

## The termination action

> Each `U(x)` contains the special termination action, `u_T`. If `u_T` is applied
> at `x_k`, then the action is repeatedly applied forever, the state remains
> unchanged, and no more cost accumulates.

So for all `i ≥ k`: `u_i = u_T`, `x_i = x_k`, and `l(x_i, u_T) = 0`.

That is the whole mechanism, and it is worth appreciating how neatly it works. A
two-step plan `(u_1, u_2)` that reaches the goal is now *identical in cost* to the
five-step plan `(u_1, u_2, u_T, u_T, u_T)`. Padding is free. Which means:

> optimising over plans of length exactly `K` = optimising over plans of length at
> most `K`

and the fixed-length machinery of Section 2.3.1 suddenly answers the question we
actually wanted to ask.

`u_T` is `planning::kTerminate` here, and it deliberately does **not** appear in
`successors()`. Algorithms that need it synthesise it, which is exactly one extra
term in the minimisation:

```cpp
double best = problem.finalCost(x);           // this IS the termination action
for (const Transition& t : problem.successors(x))
  best = std::min(best, t.cost + current[t.x]);
```

Applying `u_T` at `x` means stopping there forever, which collects `l_F(x)` —
zero if `x` is a goal, infinity if it is not. Once you see that, the code writes
itself.

## Running to stationarity

Remove `K` entirely and just keep iterating. The book's framing is nice: run
backward value iteration past `G*_1` to `G*_0`, `G*_{-1}`, and so on. The negative
indices are harmless, because nothing in the recurrence depends on the particular
number — you could add 9 to every index and change nothing. What matters is only
that the sweeps proceed backward, consecutively.

Eventually the values stop moving: for all `i ≤ k`, `G*_{i-1}(x) = G*_i(x)` for
every `x`. At that point the stage index has stopped mattering and you can drop it:

```
G*(x) = min over u of [ l(x, u) + G*(f(x, u)) ]                        (2.18)
```

with the understanding that `u` ranges over `U(x) ∪ {u_T}`, so the `l_F(x)` term is
in there too.

### Why it always terminates

For every `x` there either exists a plan reaching `X_G` with finite cost, or there
is none. Take the largest number of stages over all optimal plans from all states
that can reach `X_G`; that is an upper bound on the number of iterations needed.
Any further sweep only considers worse plans.

This depends on `l(x, u) ≥ 0`. The book is careful here: some negative costs are
fine, but a **negative cycle** makes it preferable to go round forever, driving the
total to `-∞`, and then the values never stabilise.

> Therefore, we will assume that the cost functional is defined in a sensible way
> so that negative cycles do not exist. Otherwise, the optimization model itself
> appears flawed.

In Exercise 08 you throw `std::runtime_error` when `maxIterations` is exceeded, and
the message should say what that actually means. A test that fails with "value
iteration did not converge" teaches nothing; one that says "the cost functional
probably admits a negative cycle" teaches the theorem.

## Example 2.5, and what the test checks

Same graph, now with `u_T`. Figure 2.14:

```
         a    b    c    d    e
 G*_0   inf  inf  inf    0  inf
 G*_-1  inf    4    1    0  inf
 G*_-2    6    2    1    0  inf
 G*_-3    4    2    1    0  inf
 G*_-4    4    2    1    0  inf
 G*       4    2    1    0  inf
```

Compare against Figure 2.9 and notice what the termination action bought:

- **`d` is now 0 in every row.** Being at the goal is enough, because you are
  allowed to stop.
- **The columns are monotone non-increasing.** More stages can only help, since
  padding is free.
- **`e` is still infinite.** `d` is genuinely unreachable from `e`. No amount of
  machinery will fix a disconnected graph, and the `∞` is the right answer.

`test_ex08` checks `history` against rows `G*_0` through `G*_-3` and asserts
`iterations == 4`. `G*_-4` is the sweep that changed nothing — it is the one that
*detects* stationarity, so it counts as an iteration but is not recorded.

## Recovering the actions

Once `G*` is known, you do not need to have stored anything else:

```
u* = argmin over u of [ l(x, u) + G*(f(x, u)) ]                        (2.19)
```

This is `Stationary::policy`, and it is `O(|X|)` rather than `O(K|X|)` — the saving
the book promised back in Section 2.3.1.

Section 2.3.2 walks the example by hand, and it is worth following along in the
code. From `a`: the action to `b` gives `2 + G*(b) = 2 + 2 = 4`, which beats the
self-loop's `2 + G*(a) = 2 + 4 = 6`. From `b`: to `c` gives `1 + G*(c) = 1 + 1 = 2`.
From `c`: to `d`, which is in `X_G`, and the plan terminates. Total cost 4, which
is `G*(a)`, as it must be.

**Break ties toward `u_T`.** At a goal state, stopping costs `l_F(x) = 0`, and
wandering off and coming back might also cost 0 if there is a zero-cost cycle.
Preferring `u_T` on a tie keeps the plan finite. The reference does this with a
strict inequality:

```cpp
if (candidate < best - 1e-12) { best = candidate; bestAction = t.u; }
```

## Forward, and the shape of the asymmetry

Forward value iteration also runs to stationarity, giving `C*`. But `u_T` means
something different in that direction, and the difference is instructive.

Backward, `u_T` means "stop here and collect `l_F`". Forward, it means "we already
arrived at `x` and stopped", so the *previous* value `C*_k(x)` competes with every
one-step extension that lands on `x`:

```cpp
double best = current[x];                      // termination: we already got here
for (const Transition& t : problem.predecessors(x))
  best = std::min(best, current[t.x] + t.cost);
```

Figure 2.15, for `x_I = b`:

```
         a    b    c    d    e
 C*_1   inf    0  inf  inf  inf
 C*_2   inf    0    1    4  inf
 C*_3     2    0    1    2    5
 C*_4     2    0    1    2    3
 C*       2    0    1    2    3
```

The book remarks that the last iteration is useless here — `C*_3` already had the
optimal cost-to-come to every reachable state. That is a general property, and it
is the observation that turns into Dijkstra's algorithm in the next section.

## Book Exercise 1, done properly

Figure 2.21, `x_I = a`, `X_G = {e}`. `test_ex08` checks both halves:

```
 (a) backward:  G* = [10, 8, 4, 1, 0]
 (b) forward:   C* = [ 0, 2, 6, 9, 10]
```

and cross-checks `G*(a) == C*(e) == 10`, which they must be — both are the cost of
the optimal plan from `x_I` to `X_G`, computed from opposite ends.

Do this one by hand before you run it. It takes five minutes and it is the
cheapest way to find out whether you actually understand the recurrence.

---

Next: [Dijkstra revisited](07-dijkstra-revisited.md) — why these are the same
algorithm.
