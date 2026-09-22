# 5. Optimal fixed-length plans — Section 2.3.1

> Read alongside book pages 43–50, Figures 2.8–2.12.
> Exercises: [06, backward value iteration](../../exercises/ch02/ex06_backward_value_iteration/README.md),
> [07, forward value iteration](../../exercises/ch02/ex07_forward_value_iteration/README.md)

This is the part of Chapter 2 that pays for the whole book. Value iteration is the
engine behind Chapter 8 (feedback plans), Chapter 10 (planning under uncertainty),
Chapter 11 (information spaces) and most of Part IV. It is worth going slowly.

## Formulation 2.2

Three additions to Formulation 2.1:

1. A **stage index** `k`, so states can be written `x_k`.
2. A **stage-additive cost functional**

   ```
   L(π_K) = sum over k = 1..K of l(x_k, u_k)  +  l_F(x_F)
   ```

   where `F = K + 1`, and `l_F(x_F) = 0` if `x_F in X_G` and `∞` otherwise.
3. A fixed number `K` of stages. A plan must use **exactly** `K` actions.

"Stage-additive" is doing real work in that definition. It means the cost of a plan
is the sum of per-step terms, each depending only on the current state and action —
and that is exactly the structure the dynamic programming principle needs.

`l_F` is the ∞ trick again: `L(π_K) = ∞` means infeasible, `L(π_K) < ∞` means
feasible at that cost, and any minimisation discards the infeasible plans for free.

Two special cases worth noting:
- `l(x, u) ≡ 0` recovers feasible planning restricted to `K`-step plans.
- `l(x, u) ≡ 1` minimises the number of stages.

## The principle of optimality

> Portions of optimal plans are themselves optimal.

This is almost a tautology once stated — if you could swap out a portion of an
optimal plan for a cheaper portion with the same endpoints, the original was not
optimal. But it licenses an enormous saving. Enumerating every `K`-step action
sequence costs `O(|U|^K)`. Value iteration costs `O(K |X| |U|)`.

For the grid demo's `openRoom`, with `|X| = 240`, `|U| = 4`, `K = 23`, that is the
difference between 7 × 10^13 and about 22,000.

## Backward value iteration

Define the optimal cost-to-go from stage `k` onward:

```
G*_k(x_k) = min over u_k, ..., u_K of [ sum_{i=k}^{K} l(x_i, u_i) + l_F(x_F) ]
```

At the boundary, there are no actions left to take, so you simply collect the final
cost:

```
G*_F(x_F) = l_F(x_F)                                                    (2.6)
```

And the derivation in the book (equations 2.9–2.11) pulls the first term out of the
sum, notices that the inner minimisation is precisely `G*_{k+1}`, and lands on:

```
G*_k(x_k) = min over u_k of [ l(x_k, u_k) + G*_{k+1}(f(x_k, u_k)) ]     (2.11)
```

One sweep over `X` per stage, `K` sweeps in all:

```
G*_F -> G*_K -> G*_{K-1} -> ... -> G*_2 -> G*_1
```

### Example 2.3, and what the test checks

`figure2_8()` with `K = 4`, `x_I = a`, `X_G = {d}` produces Figure 2.9:

```
         a    b    c    d    e
 G*_5   inf  inf  inf    0  inf
 G*_4   inf    4    1  inf  inf
 G*_3     6    2  inf    2  inf
 G*_2     4    6    3  inf  inf
 G*_1     6    4    5    4  inf
```

`test_ex06` checks this row by row, so you will know at once if you have the
recurrence backwards.

Three things in that table are worth staring at.

**The `e` column is infinite everywhere.** `e` has no outgoing edges, so it can
never reach `d`. This is the table telling you the state space is not strongly
connected, which is information you would otherwise have to go looking for.

**`G*_4(d) = ∞` even though `d` is the goal.** There is no termination action in
Formulation 2.2. From `d` at stage 4 you must take exactly one more action, and
`d`'s successors are `c` and `e`, neither of which is the goal. Being *at* the goal
is not enough if you are not allowed to stop. Section 2.3.2 is precisely about
fixing this.

**The values are not monotone down the column.** `G*_3(a) = 6` but `G*_2(a) = 4`.
Longer is not worse; longer is just *different*, because a plan of exactly 4 actions
and a plan of exactly 3 actions are answering different questions. Again, this is
an artefact of the fixed length, and it disappears in Section 2.3.2.

### Recovering the plan

Storing the argmin at every state and stage costs `O(K|X|)`. The book notes this
can be brought down to `O(|X|)` using the tricks of Section 2.3.2 — which is what
`Stationary::policy` is.

For Exercise 06 you re-derive the argmin from the table instead. The index
arithmetic is the fiddly part: at stage `k` you need `G*_{k+1}`, which is row
`K - k` of the returned table. Write it out for `K = 4` before you code it.

## Forward value iteration

The mirror image. Define the optimal cost-to-come:

```
C*_{k+1}(x_{k+1}) = min over (x_k, u) with f(x_k, u) = x_{k+1}
                        of [ C*_k(x_k) + l(x_k, u) ]                   (2.16)
```

starting from `C*_1(x) = 0` at `x_I` and `∞` elsewhere. For `figure2_8()` with
`x_I = a` this is Figure 2.12:

```
         a    b    c    d    e
 C*_1     0  inf  inf  inf  inf
 C*_2     2    2  inf  inf  inf
 C*_3     4    4    3    6  inf
 C*_4     4    6    5    4    7
 C*_5     6    6    5    6    5
```

### The two asymmetries, and why they matter

**The cost-to-come does not know about the goal.** Nothing in (2.16) mentions
`X_G`. The goal only enters at the very end, when you add `l_F`. `test_ex07` makes
this explicit: it moves the goal to a different state and checks that every row of
the table is unchanged.

Backward value iteration is the opposite — it cannot even start without `X_G`,
since `G*_F = l_F`.

**Forward needs `f^{-1}`.** To fill in a value at `x` you must know who can reach
`x`, not where `x` leads. `problem.predecessors(x)` hands it over here, but in a
real problem the backward transition may be much harder to compute than the forward
one. This is why the book presents the backward version first, even though moving
forward from `x_I` feels more natural:

> Even though it may appear superficially to be easier to progress from `x_I`, it
> turns out that progressing backward from `X_G` is notationally simpler.

Which one you actually want depends on the problem. Chapter 8 will want the
backward one, because `G*` is a function over the whole state space that tells you
what to do from *anywhere* — a feedback plan, not a path.

## Book exercises 3, 4 and 5 — left open

These three generalise the formulation, and they are good pencil exercises because
the recurrence barely changes:

**Exercise 3** replaces `l(x_k, u_k)` with `l(x_k, u_k, x_{k+1})` — the cost may
depend on where you land. Show the dynamic programming principle still applies.
(Hint: the derivation of (2.11) never used the fact that `l` was independent of
`x_{k+1}`; write it out and see.) `Transition` already carries the successor
alongside the cost, so the code change is smaller than you would expect.

**Exercise 4** makes the cost stage-dependent, `l(x_k, u_k, k)`. What breaks if you
try to run this to stationarity in Section 2.3.2, and why?

**Exercise 5** replaces "stay where you are" with a dedicated terminal state `x_T`.
Work out what has to change in `f`, in `l`, and in `l_F`. Then compare against
`kTerminate` in `Stationary::policy` — the two formulations are equivalent, and
seeing why is the exercise.

---

Next: [plans of unspecified length](06-unspecified-length.md), which removes the
fixed `K`.
