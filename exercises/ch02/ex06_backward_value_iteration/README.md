# Exercise 06 — Backward value iteration, fixed length

**Book:** Section 2.3.1.1, Figures 2.8 and 2.9 · **Guide:** [docs/ch02/05-optimal-fixed-length.md](../../../docs/ch02/05-optimal-fixed-length.md)

This is book Exercise 22: *"Implement backward value iteration and verify its
correctness by reconstructing the costs obtained in Example 2.5."*

## Implement

```cpp
CostTable backwardValueIteration(const Problem& problem, int K);
Plan planFromBackwardValues(const Problem& problem, const CostTable& G);
```

Equation (2.11):

```
G*_k(x_k) = min over u_k of [ l(x_k, u_k) + G*_{k+1}(f(x_k, u_k)) ]
```

from the boundary condition `G*_F(x) = l_F(x) = problem.finalCost(x)`.

Return `K + 1` rows: row 0 is `G*_F`, row 1 is `G*_K`, ..., row `K` is `G*_1` —
the order Figure 2.9 prints them, so you can read your output straight against the
page.

## The traps

**Beware `inf`.** If `G*_{k+1}(f(x, u))` is infinite, skip that action rather than
computing `inf + something`. Arithmetic on infinities is defined in IEEE 754 but
your `min` will end up carrying `inf` around where you wanted "no such action".

**There is no termination action here.** A plan must use *exactly* `K` actions.
So a state can be in `X_G` and still have an infinite value: look at the `d`
column of Figure 2.9 and work out why `G*_4(d) = inf` when `G*_5(d) = 0`. (From
`d` at stage 4 you must take one more action, and `d`'s successors are `c` and
`e`, neither of which is the goal.) This is the oddity Exercise 08 removes.

**The index arithmetic in `planFromBackwardValues` is the fiddly part.** At stage
`k` you need `G*_{k+1}`, which is row `K - k`. Write out the mapping for `K = 4`
on paper before you code it.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex06 --output-on-failure
```

## What the tests check

Figure 2.9, cell by cell, for `figure2_8()` with `K = 4`:

```
         a    b    c    d    e
 G*_5   inf  inf  inf    0  inf
 G*_4   inf    4    1  inf  inf
 G*_3     6    2  inf    2  inf
 G*_2     4    6    3  inf  inf
 G*_1     6    4    5    4  inf
```

Plus: the recovered plan uses exactly 4 actions and costs 6 (`G*_1(a)` — the
self-loop `a -> a` burns a stage for 2, then `a -> b -> c -> d`); no 1-step plan
exists; and with enough stages the result agrees with Dijkstra on a grid.

If your table differs from the book's in one cell, print it and compare:

```cpp
std::cout << formatCostTable(problem, {"G*_5", "G*_4", "G*_3", "G*_2", "G*_1"}, G);
```
