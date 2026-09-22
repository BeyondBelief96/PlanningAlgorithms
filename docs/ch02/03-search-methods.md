# 3. Particular search methods — Section 2.2.2

> Read alongside book pages 35–39.
> Exercises: [02 Dijkstra](../../exercises/ch02/ex02_dijkstra/README.md),
> [03 A* and best-first](../../exercises/ch02/ex03_astar/README.md),
> [04 iterative deepening](../../exercises/ch02/ex04_iterative_deepening/README.md)

Each method below is Figure 2.4 with a different sort key for `Q`. That is the
only difference, and writing them that way — rather than as four separate
programs — is most of what this section has to teach.

## Dijkstra's algorithm

Give every edge a nonnegative cost `l(x, u)`, and sort `Q` by the **cost-to-come**
`C(x)`: the least total cost of any path from `x_I` to `x` found so far.

- `C(x_I) = 0`.
- Generating `x'` from `x` gives a candidate `C(x') = C(x) + l(x, u)`.
- Line 12 finally has work to do. If `x'` is already in `Q` at a higher cost, lower
  it and re-sort.

### When does `C` become `C*`?

This is the part worth understanding rather than memorising, because the same
argument reappears in Section 2.3.3 and again in every later chapter that uses
dynamic programming.

> Once `x` is removed from `Q` using `Q.GetFirst()`, the state becomes dead, and
> it is known that `x` cannot be reached with a lower cost.

By induction. `C(x_I) = 0` is optimal, giving the base case. Suppose every dead
state has its optimal cost-to-come. Let `x` be the first element of `Q`. Any
cheaper path to `x` would have to pass through some other state still in `Q` — but
every such state already has a *higher* cost, and costs are nonnegative, so that
path cannot be cheaper. All paths through dead states only were already accounted
for when `C(x)` was computed. So `C(x) = C*(x)`, and `x` can join the dead.

Two things this argument depends on, both of which are worth noticing because they
are exactly what breaks in other settings:

- **Nonnegative costs.** With a negative edge, a state still in `Q` at a higher
  cost could yet lead somewhere cheaper. Section 2.3.2 handles negative costs, but
  only via value iteration, and only in the absence of negative cycles.
- **Testing the goal on pop, not on generation.** The proof establishes optimality
  at the moment of popping. Return earlier and you return a `C`, not a `C*`.

### Implementation: there is no decrease-key

`std::priority_queue` cannot lower the key of an element already inside it. The
standard workaround is to push a *second* entry at the new lower cost and discard
stale entries when they surface:

```cpp
const auto [c, x] = q.top();
q.pop();
if (dead[x]) continue;   // a stale duplicate; the real one was popped already
dead[x] = true;
```

This is safe precisely because of the induction above: the first time a state is
popped, its cost is optimal, so every later copy is by definition stale.

Running time is `O(|V| log |V| + |E|)` with a Fibonacci heap; a binary heap with
lazy deletion gives `O(|E| log |V|)`, which is what you get here and is fine.

## A*

A* is Dijkstra with one line changed. Sort `Q` by

```
C(x) + Ĝ(x)
```

where `Ĝ(x)` estimates the remaining cost-to-go from `x` to `X_G`.

> If `Ĝ(x)` is an underestimate of the true optimal cost-to-go for all `x in X`,
> the A* algorithm is guaranteed to find optimal plans.

An estimate that never exceeds the truth is called *admissible*. On a 4-connected
unit-cost grid, `|i - i'| + |j - j'|` is admissible: it is the length of the plan
you would follow if the obstacles were not there, and obstacles can only make
things worse.

Note the two extremes:

- `Ĝ = 0` — A* degenerates exactly to Dijkstra.
- `Ĝ = G*` — A* walks straight down the optimal path, expanding nothing else.

Everything useful lives between them, and the closer `Ĝ` gets to `G*`, the fewer
states get expanded. The catch, which the book flags and which becomes a running
theme in Part II, is that a better heuristic is usually a more expensive one, and
at some point the estimate costs more than the search it saves.

### Book Exercise 18: Manhattan versus Euclidean

Both are admissible on a 4-connected grid, so both give optimal plans. But
Euclidean is a *weaker* estimate: `sqrt(dr² + dc²) ≤ |dr| + |dc|`, with equality
only when the goal is on the same row or column. A weaker underestimate means less
guidance means more expansions. Run the demo and watch:

```
./build/vs/Debug/grid_demo.exe openroom
```

On `openRoom` (240 states) the reference reports:

```
  Dijkstra                 cost 23   expanded 226
  A* (Euclidean)           cost 23   expanded 169
  A* (Manhattan)           cost 23   expanded 129
  best first (Manhattan)   cost 23   expanded  24
```

All three A* variants return the same optimal cost, and Manhattan beats Euclidean
because it is *exact* in an obstacle-free region, while Euclidean systematically
undershoots — a grid robot cannot travel diagonally, so the straight-line distance
is never achievable. That ordering is the exercise's answer.

The exercise also asks why A* degrades when many plans are optimal or nearly so,
and `openRoom` shows it plainly: 129 of 240 states expanded even with an exact
heuristic. With `Ĝ` exact, every cell on every monotone staircase from start to
goal has the same `f = C + Ĝ = 23`, so A* has no basis for preferring any of them
and works through the lot. Best first, which ignores `C` entirely, expands 24 —
and on this map it happens to get the optimal answer anyway.

## Best-first search

Sort `Q` by `Ĝ(x)` alone. Drop the cost-to-come entirely.

Because `C(x)` is gone, there is no optimality claim, and no reason for `Ĝ` to be
an underestimate. What you get instead is speed: best-first often expands far fewer
states than A*.

> Sometimes the price must be paid for being greedy!

Figure 2.5 shows the pathology: a spiral tube whose opening faces away from the
goal. Best-first follows the tube all the way around rather than leaving it and
heading straight for the goal, and you can make the waste arbitrarily large by
lengthening the spiral. Best-first is also **not systematic**, so on an infinite
`X` it can miss a solution entirely.

The `bugTrap` map is the 2D shadow of this: a pocket whose only opening faces away
from the goal, so best-first must exhaust the pocket before it will take a single
step that increases `Ĝ`.

> **Book Exercise 2 is left open on purpose.** `bugTrap` makes best-first *work*
> harder, but it still returns an optimal plan, because once it escapes there is
> only one route left. Building a 2D map where best-first comes back with a plan
> that is genuinely worse is the exercise. Hint: you need two routes to the goal —
> a long one whose first step decreases `Ĝ`, and a short one whose first step
> increases it. Add a map to `planning::maps` in `src/grid.cpp` and check it with
> `grid_demo`.

## Iterative deepening

Run depth-first search with a depth limit of 0, then 1, then 2, and so on, throwing
away all the previous work each time.

This sounds wasteful and mostly is not. If the branching factor is `b`, level
`i + 1` holds roughly `b` times as many states as level `i`, so the cost of all
earlier iterations is a constant fraction of the last one. What you buy is
breadth-first's guarantee (fewest actions, systematic) with depth-first's memory
profile (the stack is the depth, not the frontier).

> Iterative deepening can be viewed as a way of converting depth-first search into
> a systematic search method.

**When it is a good idea:** a large branching factor and few revisited states — the
Rubik's cube, or a STRIPS problem with many operators.

**When it is not:** a grid. States are revisited constantly, and iterative
deepening deliberately keeps no global visited set (a state too deep on one branch
may be shallow enough on another), so the running time is exponential in the plan
length. `grid_demo` refuses to run it when the plan is longer than 12 actions, for
exactly this reason. That refusal is itself worth reading as a result.

**IDA*** replaces the depth cutoff with a cutoff on `C(x) + Ĝ(x)`. The subtlety is
choosing the next bound: increase it by a fixed step and you either re-explore the
same tree or skip past the optimum. The right answer is to have each iteration
report the smallest `f` value it *rejected*, and use exactly that next.

## Summary

| Method | Sort key for `Q` | Optimal? | Systematic? |
|---|---|---|---|
| breadth first | FIFO | fewest actions only | yes |
| depth first | LIFO | no | finite `X` only |
| Dijkstra | `C(x)` | yes | yes |
| A* | `C(x) + Ĝ(x)` | yes, if `Ĝ ≤ G*` | yes |
| best first | `Ĝ(x)` | no | no |
| iterative deepening | depth limit | fewest actions only | yes |
| IDA* | `C(x) + Ĝ(x)` limit | yes, if `Ĝ ≤ G*` | yes |

---

Next: [backward and bidirectional search](04-backward-bidirectional.md).
